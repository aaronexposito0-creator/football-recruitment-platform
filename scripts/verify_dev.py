"""Check the prepared one-command local launcher and its owned-process cleanup.

Run without another Next development server in this checkout: they share .next-dev.
This is an HTTP/process lifecycle check, not a browser or fresh-install test.
"""

from __future__ import annotations

import json
import argparse
import os
import signal
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import requests

from core.pipeline.config import ROOT


def free_ports() -> tuple[int, int]:
    with socket.socket() as api, socket.socket() as web:
        api.bind(("127.0.0.1", 0))
        web.bind(("127.0.0.1", 0))
        return api.getsockname()[1], web.getsockname()[1]


def port_open(port: int) -> bool:
    with socket.socket() as client:
        client.settimeout(0.2)
        return client.connect_ex(("127.0.0.1", port)) == 0


def wait_closed(*ports: int):
    deadline = time.monotonic() + 8
    while any(port_open(p) for p in ports) and time.monotonic() < deadline:
        time.sleep(0.1)
    assert not any(port_open(p) for p in ports), "Launcher left an owned service listening"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--production",
        action="store_true",
        help="Check the single-service production supervisor after verify_stack --standalone",
    )
    args = parser.parse_args()
    ready_message = "production services ready" if args.production else "Football Recruitment Platform: http"
    if os.name == "nt":
        raise RuntimeError("This verifier uses POSIX termination; Windows lifecycle requires a separate run")
    checks = []
    session = requests.Session()
    session.trust_env = False
    with tempfile.TemporaryDirectory(prefix="frp-launcher-") as temp:
        for blocked_service in (None, "api", "web"):
            api_port, web_port = free_ports()
            log_path = Path(temp) / f"launcher-{blocked_service or 'normal'}.log"
            with socket.socket() as blocker, log_path.open("w") as log:
                if blocked_service:
                    blocker.bind(("127.0.0.1", api_port if blocked_service == "api" else web_port))
                    blocker.listen()
                launcher = subprocess.Popen(
                    [
                        sys.executable,
                        "-m" if args.production else "scripts/dev.py",
                        *(["scripts.serve"] if args.production else []),
                        "--api-port",
                        str(api_port),
                        "--port" if args.production else "--web-port",
                        str(web_port),
                    ],
                    cwd=ROOT,
                    env={**os.environ, "FRP_DATA_DIR": temp, "NEXT_TELEMETRY_DISABLED": "1"},
                    stdout=log,
                    stderr=subprocess.STDOUT,
                )
                try:
                    if blocked_service:
                        assert launcher.wait(timeout=50) != 0, "Startup failure returned success"
                        assert ready_message not in log_path.read_text(), "Premature ready message"
                    else:
                        deadline = time.monotonic() + 50
                        ready = False
                        while time.monotonic() < deadline and launcher.poll() is None:
                            if ready_message in log_path.read_text():
                                ready = True
                                break
                            time.sleep(0.1)
                        assert ready, "Launcher did not become ready"
                        response = session.get(
                            f"http://127.0.0.1:{web_port}/api/football/data/catalog", timeout=10
                        )
                        response.raise_for_status()
                        catalog = response.json()
                        assert catalog["mode"] == "bundled_analysis" and len(catalog["players"]) == 493
                        launcher.send_signal(signal.SIGTERM)
                        assert launcher.wait(timeout=15) == 0
                    wait_closed(
                        *(
                            [web_port]
                            if blocked_service == "api"
                            else [api_port]
                            if blocked_service
                            else [api_port, web_port]
                        )
                    )
                    checks.append(
                        f"Occupied {blocked_service} port: nonzero exit, no false readiness, peer service stopped"
                        if blocked_service
                        else "Prepared launcher serves real Next/FastAPI catalog and SIGTERM closes both service trees"
                    )
                except Exception:
                    print(log_path.read_text()[-3500:], file=sys.stderr)
                    raise
                finally:
                    if launcher.poll() is None:
                        launcher.send_signal(signal.SIGTERM)
                        launcher.wait(timeout=15)
    report = {"status": "passed", "platform": sys.platform, "checks": checks, "fresh_install_tested": False}
    report["launcher"] = "production" if args.production else "development"
    output = (
        Path(ROOT)
        / "docs/validation"
        / ("PRODUCTION_LAUNCHER_CHECKS.json" if args.production else "DEV_LAUNCHER_CHECKS.json")
    )
    output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()

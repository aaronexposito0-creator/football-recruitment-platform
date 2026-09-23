"""Run production Next.js and loopback-only FastAPI in one free demo service.

No installation, build or provider download is performed during startup.
The supervisor stops both owned processes if either exits or receives SIGTERM.
"""

from __future__ import annotations

import argparse
import os
import shutil
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path

from scripts.dev import stop_service, wait_ready

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=int(os.getenv("PORT", "3000")))
    parser.add_argument("--api-port", type=int, default=8000)
    parser.add_argument("--host", default="0.0.0.0")
    args = parser.parse_args()
    if args.port == args.api_port or not all(1 <= p <= 65535 for p in (args.port, args.api_port)):
        parser.error("Choose two distinct ports between 1 and 65535")
    node = shutil.which("node")
    web = ROOT / "apps/web"
    server = web / "server.js"
    if not server.exists():
        server = web / ".next/standalone/apps/web/server.js"
    if not node or not server.is_file():
        raise SystemExit("Production bundle missing. Build and stage the standalone assets first.")
    # An unrelated service must not satisfy our readiness checks.
    for host, port in (("127.0.0.1", args.api_port), (args.host, args.port)):
        with socket.socket() as probe:
            probe.bind((host, port))
    env = {
        **os.environ,
        "FRP_API_URL": f"http://127.0.0.1:{args.api_port}",
        "NODE_ENV": "production",
        "NEXT_TELEMETRY_DISABLED": "1",
        "HOSTNAME": args.host,
        "PORT": str(args.port),
    }
    processes = []

    def interrupted(_signum, _frame):
        raise KeyboardInterrupt

    previous = signal.signal(signal.SIGTERM, interrupted)
    try:
        api = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "apps.api.app.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                str(args.api_port),
                "--no-access-log",
                "--limit-concurrency",
                "8",
                "--timeout-keep-alive",
                "5",
            ],
            cwd=ROOT,
            env=env,
            start_new_session=os.name != "nt",
        )
        processes.append(api)
        wait_ready(f"http://127.0.0.1:{args.api_port}/ready", api)
        frontend = subprocess.Popen(
            [node, str(server)], cwd=server.parent, env=env, start_new_session=os.name != "nt"
        )
        processes.append(frontend)
        wait_ready(f"http://127.0.0.1:{args.port}", frontend)
        print("Football Recruitment Platform: production services ready", flush=True)
        while all(p.poll() is None for p in processes):
            time.sleep(0.2)
        raise RuntimeError("A production service exited unexpectedly")
    except KeyboardInterrupt:
        pass
    finally:
        for process in reversed(processes):
            stop_service(process)
        signal.signal(signal.SIGTERM, previous)


if __name__ == "__main__":
    main()

"""Launch the complete free local platform; --install prepares an isolated venv."""

from __future__ import annotations

import argparse
import os
import shutil
import signal
import subprocess
import sys
import time
import venv
from pathlib import Path
from urllib.error import URLError
from urllib.request import ProxyHandler, build_opener

ROOT = Path(__file__).resolve().parents[1]


def wait_ready(url: str, process: subprocess.Popen, timeout: int = 40):
    """Do not report a working local platform until the owned service responds."""
    opener = build_opener(ProxyHandler({}))
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError(f"Service exited during startup (exit {process.returncode})")
        try:
            with opener.open(url, timeout=0.5) as response:
                if response.status == 200:
                    return
        except (URLError, TimeoutError, OSError):
            pass
        time.sleep(0.1)
    raise RuntimeError("Local service did not become ready within 40 seconds")


def stop_service(process: subprocess.Popen):
    """Stop only the process tree created for this launcher service."""
    if os.name == "nt":
        if process.poll() is None:
            subprocess.run(
                ["taskkill", "/PID", str(process.pid), "/T", "/F"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
            )
    else:
        # Each service has its own process group, including Next's child server.
        # The leader may have exited while a descendant is still running.
        try:
            os.killpg(process.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
    try:
        process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        if os.name != "nt":
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
        else:
            process.kill()
        process.wait()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--install",
        action="store_true",
        help="Create a local venv and install locked free dependencies; no football data is downloaded",
    )
    parser.add_argument("--api-port", type=int, default=8000)
    parser.add_argument("--web-port", type=int, default=3000)
    args = parser.parse_args()
    if not all(1 <= p <= 65535 for p in (args.api_port, args.web_port)) or args.api_port == args.web_port:
        parser.error("Choose two distinct ports between 1 and 65535")
    node = shutil.which("node")
    npm = shutil.which("npm.cmd" if os.name == "nt" else "npm")
    if not node or not npm:
        raise SystemExit("Install Node.js 22.13+ (24 LTS recommended for this tested release).")
    python = Path(sys.executable)
    isolated = ROOT / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    if args.install:
        if not isolated.exists():
            venv.EnvBuilder(with_pip=True).create(ROOT / ".venv")
        python = isolated
        subprocess.run(
            [str(python), "-m", "pip", "install", "-c", "requirements.lock", "-e", ".[dev]"],
            cwd=ROOT,
            check=True,
        )
        subprocess.run([npm, "ci", "--no-fund", "--no-audit"], cwd=ROOT / "apps/web", check=True)
    elif isolated.exists():
        python = isolated
    if not (ROOT / "apps/web/node_modules/next").exists():
        raise SystemExit("Dependencies are missing. Run python scripts/dev.py --install")
    environment = {
        **os.environ,
        "FRP_API_URL": f"http://127.0.0.1:{args.api_port}",
        "NEXT_TELEMETRY_DISABLED": "1",
    }
    processes = []
    previous_sigterm = signal.getsignal(signal.SIGTERM)

    def interrupted(_signum, _frame):
        raise KeyboardInterrupt

    signal.signal(signal.SIGTERM, interrupted)
    try:
        processes.append(
            subprocess.Popen(
                [
                    str(python),
                    "-m",
                    "uvicorn",
                    "apps.api.app.main:app",
                    "--host",
                    "127.0.0.1",
                    "--port",
                    str(args.api_port),
                ],
                cwd=ROOT,
                env=environment,
                start_new_session=os.name != "nt",
            )
        )
        wait_ready(f"http://127.0.0.1:{args.api_port}/health", processes[-1])
        processes.append(
            subprocess.Popen(
                [node, "scripts/dev.mjs", "--hostname", "127.0.0.1", "--port", str(args.web_port)],
                cwd=ROOT / "apps/web",
                env=environment,
                start_new_session=os.name != "nt",
            )
        )
        wait_ready(f"http://127.0.0.1:{args.web_port}", processes[-1])
        print(f"Football Recruitment Platform: http://127.0.0.1:{args.web_port} — Ctrl+C to stop", flush=True)
        while all(p.poll() is None for p in processes):
            time.sleep(0.5)
        raise RuntimeError("A local service stopped unexpectedly; both services have been stopped")
    except KeyboardInterrupt:
        return 0
    except (RuntimeError, OSError) as exc:
        print(f"Platform could not stay running: {exc}", file=sys.stderr, flush=True)
        return 1
    finally:
        for p in reversed(processes):
            stop_service(p)
        signal.signal(signal.SIGTERM, previous_sigterm)


if __name__ == "__main__":
    raise SystemExit(main())

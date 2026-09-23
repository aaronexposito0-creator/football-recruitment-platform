"""Rehearse a local Git clone with fresh dependencies and no provider cache.

Runs the README launcher with --install, then the validation commands. The
temporary origin/clone are removed; no project history or remote is modified.
Internet access to the normal Python/Node package registries is required.
"""

from __future__ import annotations

import json
import os
import platform
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from urllib.error import URLError
from urllib.request import ProxyHandler, build_opener

from scripts.check_publication import ROOT, audit, public_files
from scripts.dev import stop_service


def main():
    inventory = audit()
    if inventory["issues"]:
        raise RuntimeError("Publication audit failed; run python -m scripts.check_publication")
    checks = []
    environment = {key: value for key, value in os.environ.items() if not key.startswith("FRP_")}
    environment["NEXT_TELEMETRY_DISABLED"] = "1"
    with tempfile.TemporaryDirectory(prefix="frp-clean-clone-") as temporary:
        origin = Path(temporary) / "origin"
        clone = Path(temporary) / "clone"
        origin.mkdir()
        for path in public_files():
            if (ROOT / path).is_file():
                (origin / path).parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(ROOT / path, origin / path)
        subprocess.run(["git", "init", "--quiet", "-b", "main", str(origin)], check=True)
        subprocess.run(["git", "-C", str(origin), "add", "."], check=True)
        subprocess.run(
            [
                "git",
                "-C",
                str(origin),
                "-c",
                "user.name=Local verification",
                "-c",
                "user.email=verification@example.invalid",
                "commit",
                "--quiet",
                "-m",
                "Temporary clean-install verification",
            ],
            check=True,
        )
        subprocess.run(["git", "clone", "--quiet", "--no-local", str(origin), str(clone)], check=True)
        assert not (clone / ".venv").exists() and not (clone / "apps/web/node_modules").exists()
        assert not list((clone / "data/cache").glob("*.json"))
        log_path = Path(temporary) / "verification.log"
        with log_path.open("w+") as log:
            launcher = subprocess.Popen(
                [sys.executable, "scripts/dev.py", "--install", "--api-port", "8870", "--web-port", "8871"],
                cwd=clone,
                env=environment,
                stdout=log,
                stderr=subprocess.STDOUT,
                start_new_session=os.name != "nt",
            )
            opener = build_opener(ProxyHandler({}))
            try:
                deadline = time.monotonic() + 600
                while time.monotonic() < deadline:
                    if launcher.poll() is not None:
                        raise RuntimeError("Clean README installation/launch failed")
                    try:
                        with opener.open(
                            "http://127.0.0.1:8871/api/football/data/catalog", timeout=2
                        ) as response:
                            data = json.load(response)
                            if data["mode"] == "bundled_analysis" and len(data["players"]) == 493:
                                break
                    except (URLError, TimeoutError, OSError):
                        time.sleep(0.5)
                else:
                    raise TimeoutError("Clean installation did not become ready")
                checks.append(
                    "Fresh local Git clone: README --install starts both services and serves 493 real players without provider cache"
                )
            finally:
                stop_service(launcher)
                log.flush()
                if not checks:
                    log.seek(0)
                    print(log.read()[-6000:])
            python = str(clone / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python"))
            npm = "npm.cmd" if os.name == "nt" else "npm"
            commands = [
                [python, "-m", "pytest", "-q"],
                [python, "-m", "ruff", "check", "."],
                [python, "-m", "ruff", "format", "--check", "core", "apps/api", "scripts", "tests"],
                [python, "-m", "scripts.validate_analysis"],
                [npm, "test"],
                [npm, "run", "typecheck"],
                [npm, "run", "lint"],
                [npm, "run", "format:check"],
                [npm, "run", "build"],
                [python, "-m", "scripts.verify_stack", "--standalone"],
                [python, "-m", "scripts.verify_dev", "--production"],
            ]
            for command in commands:
                label = " ".join(["python" if command[0] == python else command[0], *command[1:]])
                print(label, flush=True)
                subprocess.run(command, cwd=clone, env=environment, check=True, timeout=600)
                checks.append(label)
    report = {
        "platform": platform.system(),
        "clone": "temporary local Git origin; no external GitHub execution",
        "checks": checks,
    }
    (ROOT / "docs/validation/CLEAN_CHECKOUT_CHECKS.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()

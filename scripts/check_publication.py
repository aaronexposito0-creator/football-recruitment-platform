"""Check the files Git would publish; never print secret values or scan private caches.

This is a focused release gate, not a guarantee against every credential format.
Tracked files are checked even if a later ignore rule would exclude them.
"""

from __future__ import annotations

import json
import re
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PRIVATE_PARTS = {".venv", "node_modules", ".next", ".next-dev", "__pycache__", ".git"}
PATTERNS = {
    "private key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----"),
    "provider token": re.compile(
        r"\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|AKIA[A-Z0-9]{16}|sk_live_[A-Za-z0-9]{20,})\b"
    ),
    "credential URL": re.compile(r"[a-z]+://[^\s/:]+:[^\s/@]{4,}@", re.I),
    "local workspace path": re.compile(r"/(?:workspace|root|Users|opt/codex)/"),
    "assigned credential": re.compile(
        r"(?im)^\s*(?:[A-Z_]*(?:API_KEY|SECRET_KEY|ACCESS_TOKEN|PASSWORD))\s*[:=]\s*[\"']?[A-Za-z0-9_+./=-]{12,}"
    ),
}


def public_files(root: Path = ROOT) -> list[Path]:
    """Respect repository ignore rules without changing its index or creating history."""
    with tempfile.TemporaryDirectory(prefix="frp-inventory-") as temporary:
        git_dir = root / ".git"
        if not git_dir.exists():
            git_dir = Path(temporary) / "git"
            subprocess.run(["git", "init", "--quiet", "--bare", str(git_dir)], check=True)
        command = [
            "git",
            "-c",
            "core.excludesFile=/dev/null",
            f"--git-dir={git_dir}",
            f"--work-tree={root}",
            "ls-files",
            "--cached",
            "--others",
            "--exclude-standard",
            "-z",
        ]
        result = subprocess.check_output(command, cwd=root).decode()
        return sorted({Path(p) for p in result.split("\0") if p})


def audit(root: Path = ROOT) -> dict:
    files = public_files(root)
    issues = []
    size = 0
    for relative in files:
        path = root / relative
        name = relative.as_posix()
        if not path.exists():
            continue  # A tracked deletion is not public content.
        forbidden = (
            PRIVATE_PARTS.intersection(relative.parts)
            or name.startswith(("data/cache/", "data/uploads/"))
            and path.name != ".gitkeep"
            or path.suffix in {".parquet", ".pem", ".key", ".p12", ".pfx", ".duckdb", ".sqlite", ".sqlite3"}
            or path.name.startswith(".env")
            and path.name != ".env.example"
        )
        if path.is_symlink() or forbidden:
            issues.append({"path": name, "reason": "private file or symlink in publication"})
            continue
        content = path.read_bytes()
        size += len(content)
        if b"\0" in content:
            continue
        text = content.decode("utf-8", errors="replace")
        for reason, pattern in PATTERNS.items():
            match = pattern.search(text)
            if match:
                issues.append(
                    {"path": name, "line": text.count("\n", 0, match.start()) + 1, "reason": reason}
                )
    return {"files": len(files), "bytes": size, "issues": issues}


def main():
    report = audit()
    print(json.dumps(report, indent=2))
    raise SystemExit(bool(report["issues"]))


if __name__ == "__main__":
    main()

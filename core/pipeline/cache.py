"""Pinned provider bytes with integrity checks; never downloads during API requests."""

from __future__ import annotations

import hashlib
import json
import os
import re
import tempfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


class SourceError(RuntimeError):
    pass


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def atomic_write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(prefix=".pending-", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp, path)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)


def write_json(path: Path, value: Any) -> None:
    atomic_write(
        path,
        (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2, allow_nan=False) + "\n").encode(),
    )


class RepositoryCache:
    def __init__(
        self, root: Path, revision: str, *, offline: bool = False, session: requests.Session | None = None
    ):
        if not re.fullmatch(r"[0-9a-f]{40}", revision):
            raise ValueError("Use an immutable 40-character Git commit, not a branch or tag.")
        self.revision = revision
        self.root = root / "raw/statsbomb" / revision
        self.offline = offline
        self.session = session or requests.Session()
        if session is None:
            retry = Retry(
                total=3,
                backoff_factor=0.4,
                status_forcelist=[429, 500, 502, 503, 504],
                allowed_methods=["GET"],
                respect_retry_after_header=True,
            )
            self.session.mount("https://", HTTPAdapter(max_retries=retry))
            self.session.headers["User-Agent"] = "FootballRecruitmentResearch/0.2 (+local-cache)"
        self.assets: dict[str, dict] = {}

    def get_json(self, relative: str) -> list[dict]:
        path = PurePosixPath(relative)
        if path.is_absolute() or ".." in path.parts or "\\" in relative or not relative.endswith(".json"):
            raise ValueError("Expected a relative repository JSON path.")
        target = self.root / path
        meta_path = target.with_suffix(".meta.json")
        url = f"https://raw.githubusercontent.com/statsbomb/open-data/{self.revision}/{path}"
        if target.exists() and meta_path.exists():
            raw = target.read_bytes()
            meta = json.loads(meta_path.read_text())
            if meta.get("sha256") != sha256(raw) or meta.get("url") != url:
                raise SourceError(
                    f"Cache integrity failed for {relative}; remove this asset and download again."
                )
        else:
            if self.offline:
                raise SourceError(f"Offline cache miss: {relative}. Run ingestion online once.")
            try:
                response = self.session.get(url, timeout=(15, 90))
                response.raise_for_status()
                raw = response.content
                value = json.loads(raw)
                if not isinstance(value, list) or any(not isinstance(x, dict) for x in value):
                    raise ValueError("Expected an array of objects")
            except (requests.RequestException, ValueError) as exc:
                raise SourceError(f"Could not ingest {relative}: {exc}") from exc
            meta = {
                "url": url,
                "revision": self.revision,
                "sha256": sha256(raw),
                "bytes": len(raw),
                "retrieved_at": datetime.now(timezone.utc).isoformat(),
            }
            atomic_write(target, raw)
            write_json(meta_path, meta)
        value = json.loads(raw)
        if not isinstance(value, list) or any(not isinstance(x, dict) for x in value):
            raise SourceError(f"Invalid source schema: {relative}")
        self.assets[relative] = meta
        return value

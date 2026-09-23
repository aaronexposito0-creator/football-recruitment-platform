"""Small derived analysis catalog for serving; raw events stay in private local cache."""

from __future__ import annotations

import json
import hashlib
from contextlib import contextmanager
from contextvars import ContextVar
from functools import lru_cache
from pathlib import Path

from fastapi import HTTPException

from core.pipeline.config import data_root, snapshot_path
from core.schemas.models import PlayerRecord
from core.schemas.analysis import RealPlayer

_pinned: ContextVar[tuple[dict, str] | None] = ContextVar("pinned_analysis_catalog", default=None)


@contextmanager
def using_catalog(data: dict, mode: str):
    """Pin a verified catalog during a multi-view export; never mix concurrent runs."""
    token = _pinned.set((data, mode))
    try:
        yield
    finally:
        _pinned.reset(token)


@lru_cache(maxsize=4)
def _read(path: str, modified: int, size: int) -> dict:
    data = json.loads(Path(path).read_text())
    if (
        not data.get("players")
        or not data.get("metric_catalog")
        or not data.get("manifest", {}).get("dataset_id")
    ):
        raise ValueError("Invalid analysis catalog")
    manifest = data["manifest"]
    semantic_hash = hashlib.sha256(
        json.dumps(
            {k: v for k, v in data.items() if k != "manifest"}, sort_keys=True, allow_nan=False
        ).encode()
    ).hexdigest()
    if manifest.get("analysis_sha256") != semantic_hash:
        raise ValueError("Analysis content does not match its manifest hash")
    if len(data["players"]) != manifest["players"]:
        raise ValueError("Catalog player count does not match its manifest")
    identities = set()
    contexts = set()
    for player in data["players"]:
        RealPlayer.model_validate(player)
        if player["player_id"] in identities or player["dataset_id"] != manifest["dataset_id"]:
            raise ValueError("Duplicate player or mismatched dataset lineage")
        identities.add(player["player_id"])
        contexts.add((player["competition_id"], player["season_id"], player["gender"]))
    if len(contexts) != 1:
        raise ValueError("The current serving contract requires one competition-season-gender")
    return data


def get_catalog() -> tuple[dict, str]:
    if (pinned := _pinned.get()) is not None:
        return pinned
    root = data_root()
    current = root / "CURRENT.json"
    source_mode = "bundled_analysis"
    path = snapshot_path()
    try:
        if current.exists():
            pointer = json.loads(current.read_text())
            candidate = (root / pointer["relative_path"]).resolve()
            if not candidate.is_relative_to(root):
                raise ValueError("Invalid dataset pointer")
            path = candidate / "analysis.json"
            source_mode = "local_warehouse"
        stat = path.stat()
        return _read(str(path), stat.st_mtime_ns, stat.st_size), source_mode
    except (OSError, ValueError, KeyError) as exc:
        raise HTTPException(
            503,
            "Analysis unavailable. Run python -m core.pipeline.cli or restore the bundled analysis snapshot.",
        ) from exc


def find_player(player_id: str, data: dict) -> dict:
    player = next((p for p in data["players"] if p["player_id"] == player_id), None)
    if player is None:
        raise HTTPException(404, "Player not found in the loaded competition-season")
    return player


def as_record(player: dict) -> PlayerRecord:
    return PlayerRecord(
        player_id=player["player_id"],
        player_name=player["display_name"],
        team_name=player["team_name"],
        competition=player["competition"],
        season=player["season"],
        position_group=player["position_group"],
        minutes=player["minutes"],
        age=player.get("age"),
        preferred_foot=player.get("preferred_foot"),
        metrics=player["metrics"],
        metadata={"source": "statsbomb", "synthetic": False},
    )

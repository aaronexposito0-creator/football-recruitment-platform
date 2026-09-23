"""Publish derived research summaries only; never copy provider JSON or event tables."""

from __future__ import annotations

import copy
import json
import hashlib
import os
import shutil
import tempfile
from filelock import FileLock
from pathlib import Path

from apps.api.app.routers.data import catalog
from apps.api.app.routers.players import profile, similar, visuals
from apps.api.app.routers.recruitment import real_fit
from apps.api.app.services.catalog import get_catalog, using_catalog
from core.pipeline.cache import atomic_write, write_json
from core.pipeline.config import ROOT
from core.schemas.models import RecruitmentBrief
from core.analytics.archetypes import archetypes


def small_json(path: Path, value) -> None:
    def fallback(v):
        return v.model_dump() if hasattr(v, "model_dump") else str(v)

    atomic_write(
        path,
        json.dumps(
            value, default=fallback, ensure_ascii=False, allow_nan=False, separators=(",", ":")
        ).encode(),
    )


def export_dataset(data: dict, web: Path) -> None:
    analysis = copy.deepcopy(data)
    analysis["manifest"].pop("assets", None)
    analysis["manifest"].pop("parquet_sha256", None)
    analysis["manifest"]["snapshot_notice"] = (
        "Derived non-commercial analysis; raw provider data excluded. Rebuild from source for local event queries."
    )
    exported = catalog()
    exported["mode"] = "bundled_analysis"
    exported["coverage"]["mode"] = "bundled_analysis"
    small_json(web / "catalog.json", exported)
    for player in data["players"]:
        pid = player["player_id"]
        slug = pid.replace(":", "-")
        detail = profile(pid, min_minutes=180)
        detail["mode"] = "bundled_analysis"
        small_json(web / "profiles" / f"{slug}.json", detail)
        if data.get("visual_profiles"):
            spatial = visuals(pid)
            spatial["mode"] = "bundled_analysis"
            small_json(web / "visuals" / f"{slug}.json", spatial)
        related = similar(pid, limit=200, min_minutes=180)
        related["mode"] = "bundled_analysis"
        small_json(web / "similar" / f"{slug}.json", related)
    templates = {}
    for role in archetypes():
        brief = RecruitmentBrief.model_validate(role["brief"])
        templates[role["id"]] = role["brief"]
        result = real_fit(brief)
        result["mode"] = "bundled_analysis"
        small_json(web / "fit" / f"{role['id']}.json", result)
        pos = role["position_group"]
        if pos not in templates:
            templates[pos] = role["brief"]
            small_json(web / "fit" / f"{pos}.json", result)
    small_json(web / "templates.json", templates)
    files = {
        str(path.relative_to(web)): hashlib.sha256(path.read_bytes()).hexdigest()
        for path in sorted(web.rglob("*.json"))
    }
    small_json(
        web / "publication_manifest.json",
        {
            "dataset_id": data["manifest"]["dataset_id"],
            "analysis_engine_version": "research-v2.3",
            "files_sha256": files,
        },
    )
    destination = ROOT / "apps/web/public/analysis"
    backup = web.parent / (web.name + "-previous")
    if destination.exists():
        os.replace(destination, backup)
    try:
        os.replace(web, destination)
    except BaseException:
        if backup.exists():
            os.replace(backup, destination)
        raise
    finally:
        if backup.exists() and destination.exists():
            shutil.rmtree(backup)
    small_json(ROOT / "data/sample/analysis.json", analysis)
    write_json(
        ROOT / "data/sample/snapshot_manifest.json",
        {
            "dataset_id": data["manifest"]["dataset_id"],
            "profile_count": len(data["players"]),
            "feature_version": data["manifest"]["feature_version"],
            "source_revision": data["manifest"]["source_revision"],
            "purpose": "Published analysis fallback from the same Python API functions; no raw provider files.",
            "analysis_engine_version": "research-v2.3",
            "published_file_count": len(files),
            "publication_manifest_sha256": hashlib.sha256(
                (destination / "publication_manifest.json").read_bytes()
            ).hexdigest(),
        },
    )


def main() -> None:
    data, mode = get_catalog()
    # Build every saved view from one verified in-memory catalog, then swap the
    # generated tree. Stale players/roles from an older universe cannot survive.
    with (
        FileLock(str(ROOT / "apps/web/.analysis-export.lock"), timeout=0),
        using_catalog(data, mode),
        tempfile.TemporaryDirectory(prefix=".analysis-build-", dir=ROOT / "apps/web") as staging,
    ):
        export_dataset(data, Path(staging))
    print(
        f"Exported {len(data['players'])} research profiles, similarity responses and curated archetype briefs."
    )


if __name__ == "__main__":
    main()

"""Atomic dataset publication after all matches and quality gates pass."""

from __future__ import annotations

import json
import os
import shutil
import tempfile
from concurrent.futures import FIRST_COMPLETED, ThreadPoolExecutor, wait
from datetime import datetime, timezone
from pathlib import Path

import polars as pl
from filelock import FileLock, Timeout

from core.pipeline.cache import RepositoryCache, sha256, write_json
from core.pipeline.canonical import key, normalize_events, normalize_roster
from core.pipeline.config import FEATURE_VERSION, MINUTES_VERSION, SCHEMA_VERSION
from core.pipeline.metrics import match_features, metric_catalog, season_features
from core.pipeline.minutes import MinutesError, compute_minutes
from core.pipeline.spatial import match_spatial, combine_maps, publish_maps, VERSION as SPATIAL_VERSION


def _bounded_results(pool, fetch, matches, workers):
    """Keep only a bounded window of raw match payloads in memory."""
    remaining = iter(matches)
    pending = set()
    for _ in range(workers):
        match = next(remaining, None)
        if match is not None:
            pending.add(pool.submit(fetch, match))
    while pending:
        finished, pending = wait(pending, return_when=FIRST_COMPLETED)
        for future in finished:
            yield future.result()
            match = next(remaining, None)
            if match is not None:
                pending.add(pool.submit(fetch, match))


def _parquet(rows: list[dict], destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    pl.DataFrame(rows, infer_schema_length=None).write_parquet(destination, compression="zstd")


def ingest(
    root: Path,
    revision: str,
    competition_id: int,
    season_id: int,
    *,
    offline: bool = False,
    limit: int | None = None,
    workers: int = 4,
) -> dict:
    if competition_id < 1 or season_id < 1 or limit is not None and limit < 1:
        raise ValueError("Competition, season and optional limit must be positive")
    root.mkdir(parents=True, exist_ok=True)
    guard = FileLock(root / ".ingest.lock")
    try:
        guard.acquire(timeout=0)
    except Timeout as exc:
        raise RuntimeError("An ingestion writer is already running for this data directory.") from exc
    stage = Path(tempfile.mkdtemp(prefix=".building-", dir=root))
    try:
        cache = RepositoryCache(root, revision, offline=offline)
        competitions = cache.get_json("data/competitions.json")
        competition = next(
            (
                c
                for c in competitions
                if c["competition_id"] == competition_id and c["season_id"] == season_id
            ),
            None,
        )
        if competition is None:
            raise ValueError("Competition-season not present at the pinned provider revision")
        matches = cache.get_json(f"data/matches/{competition_id}/{season_id}.json")
        if len({m["match_id"] for m in matches}) != len(matches):
            raise ValueError("Duplicate source match IDs")
        available = sorted(
            [m for m in matches if m.get("match_status") == "available"],
            key=lambda m: (m["match_date"], m["match_id"]),
        )
        selected = available[:limit] if limit else available
        if not selected:
            raise ValueError("No available matches")
        print(
            f"StatsBomb {competition['competition_name']} {competition['season_name']}: {len(selected)}/{len(available)} matches",
            flush=True,
        )

        def fetch(match: dict) -> tuple[dict, list[dict], list[dict], dict]:
            source = RepositoryCache(root, revision, offline=offline)
            mid = match["match_id"]
            lineup = source.get_json(f"data/lineups/{mid}.json")
            events = source.get_json(f"data/events/{mid}.json")
            return match, lineup, events, source.assets

        all_players, all_teams, normalized_matches = {}, {}, []
        all_features, all_minutes, all_intervals, quality = [], [], [], []
        all_spatial = []
        event_count = 0
        concurrency = max(1, min(workers, 8))
        with ThreadPoolExecutor(max_workers=concurrency) as pool:
            for match, lineups, events, assets in _bounded_results(pool, fetch, selected, concurrency):
                mid = match["match_id"]
                cache.assets.update(assets)
                for event in events:
                    end = event.get("half_end", {})
                    start = event.get("half_start", {})
                    if (
                        end.get("early_video_end")
                        or end.get("match_suspended")
                        or start.get("late_video_start")
                    ):
                        raise MinutesError(f"Incomplete broadcast in match {mid}")
                exposure = compute_minutes(events, lineups)
                source_hash = assets[f"data/events/{mid}.json"]["sha256"]
                canonical = normalize_events(events, match, source_hash)
                players, teams = normalize_roster(lineups)
                roster_keys = {p["player_key"] for p in players}
                if set(canonical["player_key"].drop_nulls().to_list()) - roster_keys:
                    raise ValueError(f"Unknown player reference in match {mid}")
                for p in players:
                    all_players[p["player_key"]] = p
                for t in teams:
                    all_teams[t["team_key"]] = t
                # A final score includes own goals, but penalty shootouts are separate.
                observed_goals = {}
                for team_side in ("home", "away"):
                    tid = match[f"{team_side}_team"][f"{team_side}_team_id"]
                    opponent = match["away_team" if team_side == "home" else "home_team"]
                    opp_id = opponent.get("away_team_id", opponent.get("home_team_id"))
                    scored = sum(
                        e["period"] <= 4
                        and e.get("team", {}).get("id") == tid
                        and (e.get("shot", {}).get("outcome", {}).get("name") == "Goal")
                        for e in events
                    )
                    own_goals = sum(
                        e["period"] <= 4
                        and e["type"]["name"] == "Own Goal Against"
                        and e.get("team", {}).get("id") == opp_id
                        for e in events
                    )
                    observed_goals[team_side] = scored + own_goals
                    if scored + own_goals != match[f"{team_side}_score"]:
                        raise ValueError(f"Scoreline reconciliation failed in match {mid} ({team_side})")
                for spatial in match_spatial(canonical, exposure):
                    player_team = next(
                        r["team_id"]
                        for r in exposure.rows
                        if key("player", r["player_id"]) == spatial["player_id"]
                    )
                    home = player_team == match["home_team"]["home_team_id"]
                    opponent_id = (
                        match["away_team"]["away_team_id"] if home else match["home_team"]["home_team_id"]
                    )
                    spatial.update(
                        {
                            "match_id": key("match", mid),
                            "date": match["match_date"],
                            "opponent": all_teams[key("team", opponent_id)]["team_name"],
                            "goals_for": observed_goals["home" if home else "away"],
                            "goals_against": observed_goals["away" if home else "home"],
                        }
                    )
                    all_spatial.append(spatial)
                part = (
                    stage
                    / f"events/competition={competition_id}/season={season_id}/match={mid}/events.parquet"
                )
                part.parent.mkdir(parents=True, exist_ok=True)
                canonical.write_parquet(part, compression="zstd")
                event_count += canonical.height
                match_key = key("match", mid)
                computed = match_features(canonical, events, exposure)
                all_features.extend({**f, "match_key": match_key} for f in computed)
                all_minutes.extend(
                    {
                        "match_key": match_key,
                        "player_key": key("player", r["player_id"]),
                        "team_key": key("team", r["team_id"]),
                        "minutes": r["minutes"],
                        "started": r["started"],
                        "position_group": r["position_group"],
                        "method": MINUTES_VERSION,
                    }
                    for r in exposure.rows
                )
                all_intervals.extend(
                    {
                        **{k: v for k, v in r.items() if k not in {"player_id", "team_id"}},
                        "match_key": match_key,
                        "player_key": key("player", r["player_id"]),
                        "team_key": key("team", r["team_id"]),
                    }
                    for r in exposure.intervals
                )
                normalized_matches.append(
                    {
                        "match_key": match_key,
                        "source_key": "statsbomb",
                        "source_match_id": mid,
                        "competition_key": key("competition", competition_id),
                        "season_key": key("season", f"{competition_id}:{season_id}"),
                        "match_date": match["match_date"],
                        "home_team_key": key("team", match["home_team"]["home_team_id"]),
                        "away_team_key": key("team", match["away_team"]["away_team_id"]),
                        "home_score": observed_goals["home"],
                        "away_score": observed_goals["away"],
                        "duration_minutes": sum(exposure.period_ends.values()) / 60,
                        "source_data_version": match.get("metadata", {}).get("data_version"),
                        "source_last_updated": match.get("last_updated"),
                    }
                )
                boundary = canonical.filter(
                    (pl.col("x") > 120) | (pl.col("y") > 80) | (pl.col("x") < 0) | (pl.col("y") < 0)
                ).height
                quality.append(
                    {
                        "match_id": mid,
                        "events": canonical.height,
                        "players_with_minutes": len(exposure.rows),
                        "scoreline_reconciled": True,
                        "minutes_valid": True,
                        "warnings": exposure.warnings
                        + ([f"{boundary} boundary-rounding coordinate(s), preserved"] if boundary else []),
                    }
                )
                print(
                    f"Validated {len(quality):02d}/{len(selected)} · {mid} · {canonical.height} events",
                    flush=True,
                )
        all_features.sort(key=lambda r: (r["match_key"], r["player_key"]))
        profiles = season_features(all_features, all_players)
        if len({p["player_id"] for p in profiles}) != len(profiles):
            raise ValueError(
                "Multiple teams per player in this season require a transfer-aware profile grain; refusing publication"
            )
        inputs = {k: v["sha256"] for k, v in sorted(cache.assets.items())}
        fingerprint = {
            "source_revision": revision,
            "competition": competition_id,
            "season": season_id,
            "schema_version": SCHEMA_VERSION,
            "feature_version": FEATURE_VERSION,
            "minutes_version": MINUTES_VERSION,
            "spatial_version": SPATIAL_VERSION,
            "inputs": inputs,
        }
        run_id = sha256(json.dumps(fingerprint, sort_keys=True).encode())[:20]
        comp_key, season_key = (
            key("competition", competition_id),
            key("season", f"{competition_id}:{season_id}"),
        )
        for player in profiles:
            player.update(
                {
                    "competition_id": comp_key,
                    "season_id": season_key,
                    "competition": competition["competition_name"],
                    "season": competition["season_name"],
                    "gender": competition["competition_gender"],
                    "dataset_id": run_id,
                    "match_ids": sorted(
                        r["match_key"] for r in all_features if r["player_key"] == player["player_id"]
                    ),
                }
            )
        manifest = {
            **fingerprint,
            "dataset_id": run_id,
            "built_at": datetime.now(timezone.utc).isoformat(),
            "source": "StatsBomb Open Data",
            "source_url": "https://github.com/hudl/open-data",
            "license_url": "https://github.com/hudl/open-data/blob/" + revision + "/LICENSE.pdf",
            "usage": "Non-commercial research analysis; source data is not redistributed.",
            "competition_name": competition["competition_name"],
            "season_name": competition["season_name"],
            "gender": competition["competition_gender"],
            "matches_available": len(available),
            "matches_ingested": len(selected),
            "coverage_pct": 100 * len(selected) / len(available),
            "coverage_scope": "Provider-listed available matches at pinned revision, not a claim about all world football",
            "is_partial": len(selected) != len(available),
            "events": event_count,
            "players": len(profiles),
            "teams": len(all_teams),
            "date_from": min(m["match_date"] for m in selected),
            "date_to": max(m["match_date"] for m in selected),
            "assets": dict(sorted(cache.assets.items())),
            "quality": sorted(quality, key=lambda q: q["match_id"]),
        }
        entities = stage / "entities"
        _parquet(sorted(all_players.values(), key=lambda p: p["player_key"]), entities / "players.parquet")
        _parquet(sorted(all_teams.values(), key=lambda t: t["team_key"]), entities / "teams.parquet")
        _parquet(sorted(normalized_matches, key=lambda m: m["match_key"]), entities / "matches.parquet")
        _parquet(
            [
                {
                    "competition_key": comp_key,
                    "source_key": "statsbomb",
                    "source_competition_id": str(competition_id),
                    "name": competition["competition_name"],
                    "gender": competition["competition_gender"],
                }
            ],
            entities / "competitions.parquet",
        )
        _parquet(
            [
                {
                    "season_key": season_key,
                    "competition_key": comp_key,
                    "source_season_id": str(season_id),
                    "name": competition["season_name"],
                }
            ],
            entities / "seasons.parquet",
        )
        mappings = [
            {
                "entity_type": "player",
                "source_key": "statsbomb",
                "source_id": p["source_player_id"],
                "canonical_key": p["player_key"],
            }
            for p in all_players.values()
        ]
        mappings += [
            {
                "entity_type": "team",
                "source_key": "statsbomb",
                "source_id": t["source_team_id"],
                "canonical_key": t["team_key"],
            }
            for t in all_teams.values()
        ]
        mappings += [
            {
                "entity_type": "match",
                "source_key": "statsbomb",
                "source_id": str(m["match_id"]),
                "canonical_key": key("match", m["match_id"]),
            }
            for m in selected
        ]
        mappings += [
            {
                "entity_type": "competition",
                "source_key": "statsbomb",
                "source_id": str(competition_id),
                "canonical_key": comp_key,
            },
            {
                "entity_type": "season",
                "source_key": "statsbomb",
                "source_id": f"{competition_id}:{season_id}",
                "canonical_key": season_key,
            },
        ]
        _parquet(sorted(mappings, key=lambda m: m["canonical_key"]), entities / "source_mappings.parquet")
        _parquet(
            sorted(all_minutes, key=lambda r: (r["match_key"], r["player_key"])),
            stage / "minutes/player_match.parquet",
        )
        _parquet(
            sorted(
                all_intervals,
                key=lambda r: (r["match_key"], r["player_key"], r["period"], r["start_seconds"]),
            ),
            stage / "minutes/intervals.parquet",
        )
        _parquet(
            [{k: v for k, v in r.items() if k != "position_seconds"} for r in all_features],
            stage / "features/player_match.parquet",
        )
        _parquet(
            [
                {**{k: p[k] for k in ("player_id", "team_id", "minutes", "position_group")}, **p["metrics"]}
                for p in profiles
            ],
            stage / "features/player_season.parquet",
        )
        visual_profiles = {}
        for player in profiles:
            records = sorted(
                [r for r in all_spatial if r["player_id"] == player["player_id"]], key=lambda r: r["match_id"]
            )
            visual_profiles[player["player_id"]] = {
                "player_id": player["player_id"],
                "dataset_id": run_id,
                "version": SPATIAL_VERSION,
                "grid": {"columns": 6, "rows": 4, "length": 120, "width": 80},
                "maps": publish_maps(combine_maps(records)),
                "matches": [{**r, "maps": publish_maps(r["maps"])} for r in records],
                "incomplete_metrics": [k for k, v in player["metrics"].items() if v is None],
                "note": "Coarse aggregated research analysis. Locations are grid zones, not exact events. Flow arrows join zone centres; they are not observed pass trajectories.",
            }
        dataset = {
            "manifest": manifest,
            "metric_catalog": metric_catalog(),
            "players": profiles,
            "visual_profiles": visual_profiles,
        }
        manifest["analysis_sha256"] = sha256(
            json.dumps(
                {k: v for k, v in dataset.items() if k != "manifest"}, sort_keys=True, allow_nan=False
            ).encode()
        )
        write_json(stage / "analysis.json", dataset)
        write_json(stage / "manifest.json", manifest)
        manifest["parquet_sha256"] = {
            str(p.relative_to(stage)): sha256(p.read_bytes()) for p in sorted(stage.rglob("*.parquet"))
        }
        write_json(stage / "manifest.json", manifest)
        write_json(stage / "analysis.json", dataset)
        destination = root / "datasets" / run_id
        destination.parent.mkdir(exist_ok=True)
        if destination.exists():
            previous = json.loads((destination / "manifest.json").read_text())
            if previous.get("analysis_sha256") != manifest["analysis_sha256"]:
                raise ValueError(
                    "Rebuild analysis differs at the same fingerprint; investigate and version the feature change"
                )
            if previous["parquet_sha256"] != manifest["parquet_sha256"]:
                raise ValueError("Rebuild differs from existing dataset at the same fingerprint")
            shutil.rmtree(stage)
        else:
            os.replace(stage, destination)
        write_json(root / "CURRENT.json", {"dataset_id": run_id, "relative_path": f"datasets/{run_id}"})
        return json.loads((destination / "analysis.json").read_text())
    finally:
        if stage.exists():
            shutil.rmtree(stage)
        guard.release()

"""Versioned, explicit event metrics. All per-90 rates include added-time exposure."""

from __future__ import annotations

from collections import defaultdict

import polars as pl

from core.pipeline.canonical import key
from core.pipeline.minutes import Exposure


# key: EN, ES, FR, family, formula, direction (not a universal quality judgement)
DEFINITIONS = {
    "goals": (
        "Goals",
        "Goles",
        "Buts",
        "finishing",
        "Shot outcome Goal, periods 1–4; excludes own goals and shootouts.",
        "higher",
    ),
    "non_penalty_goals": (
        "Non-penalty goals",
        "Goles sin penalti",
        "Buts hors penalty",
        "finishing",
        "Goals excluding Shot type Penalty.",
        "higher",
    ),
    "shots": (
        "Shots",
        "Tiros",
        "Tirs",
        "finishing",
        "Shot events in periods 1–4, including penalties.",
        "higher",
    ),
    "xg": (
        "Expected goals",
        "Goles esperados",
        "Buts attendus",
        "finishing",
        "Sum of provider statsbomb_xg over shots; null if any shot lacks xG.",
        "higher",
    ),
    "npxg": (
        "Non-penalty xG",
        "xG sin penalti",
        "xG hors penalty",
        "finishing",
        "Sum of provider xG excluding penalties; null if any applicable shot lacks xG.",
        "higher",
    ),
    "assists": (
        "Goal assists",
        "Asistencias de gol",
        "Passes décisives",
        "creation",
        "Pass events with provider goal_assist flag; no inferred assists.",
        "higher",
    ),
    "key_passes": (
        "Shot-creating passes",
        "Pases que generan tiro",
        "Passes menant à un tir",
        "creation",
        "Pass with shot_assist or goal_assist. Includes goal-creating passes.",
        "higher",
    ),
    "xa": (
        "Assisted-shot xG",
        "xG de tiros asistidos",
        "xG des tirs assistés",
        "creation",
        "Sum of linked assisted shot xG; requires same match/team and valid shot link. Not a pass-based xA model.",
        "higher",
    ),
    "passes": (
        "Passes attempted",
        "Pases intentados",
        "Passes tentées",
        "possession",
        "All Pass events, including restarts.",
        "higher",
    ),
    "completed_passes": (
        "Completed passes",
        "Pases completados",
        "Passes réussies",
        "possession",
        "Pass events with absent pass.outcome (provider success encoding).",
        "higher",
    ),
    "progressive_passes": (
        "Progressive passes",
        "Pases progresivos",
        "Passes progressives",
        "progression",
        "Completed open-play pass: forward and reduces distance to goal centre by >=10m AND >=25%. Coordinates scaled to 105x68m. Restarts excluded.",
        "higher",
    ),
    "carries": (
        "Carries",
        "Conducciones",
        "Conduites",
        "progression",
        "Provider Carry events. Not every touch or dribble attempt.",
        "higher",
    ),
    "progressive_carries": (
        "Progressive carries",
        "Conducciones progresivas",
        "Conduites progressives",
        "progression",
        "Carry with same distance-to-goal rule as progressive passes.",
        "higher",
    ),
    "passes_into_final_third": (
        "Final-third entries",
        "Entradas al último tercio",
        "Entrées dernier tiers",
        "progression",
        "Completed open-play pass starts x<80 and ends x>=80 on provider 120x80 pitch.",
        "higher",
    ),
    "entries_into_box": (
        "Box entries",
        "Entradas al área",
        "Entrées dans la surface",
        "progression",
        "Completed open-play pass or carry from outside to inside x>=102, 18<=y<=62.",
        "higher",
    ),
    "pressures": (
        "Pressures",
        "Presiones",
        "Pressions",
        "defending",
        "Provider Pressure events; not successful presses. Null if a whole match has no pressure coverage.",
        "higher",
    ),
    "tackles": (
        "Tackle attempts",
        "Entradas intentadas",
        "Tacles tentés",
        "defending",
        "Duel events with subtype Tackle; attempted, not necessarily won.",
        "higher",
    ),
    "interceptions": (
        "Interceptions",
        "Intercepciones",
        "Interceptions",
        "defending",
        "Interception events; outcomes retained in canonical events, not assumed successful.",
        "higher",
    ),
    "ball_recoveries": (
        "Ball recoveries",
        "Recuperaciones",
        "Récupérations",
        "defending",
        "Ball Recovery events without recovery_failure.",
        "higher",
    ),
    "turnovers": (
        "Control losses",
        "Pérdidas de control",
        "Pertes de contrôle",
        "possession",
        "Dispossessed + Miscontrol events only. Excludes failed passes; not all possession losses.",
        "lower",
    ),
}


def metric_catalog() -> dict:
    out = {}
    for name, (en, es, fr, family, formula, direction) in DEFINITIONS.items():
        metric = name + "_per90"
        out[metric] = {
            "key": metric,
            "names": {"en": en, "es": es, "fr": fr},
            "family": family,
            "definition": formula,
            "denominator": "On-pitch minutes including stoppage and extra time / 90",
            "unit": "per90",
            "direction": direction,
            "version": "2.0.0",
        }
    out["pass_completion"] = {
        "key": "pass_completion",
        "names": {"en": "Pass completion", "es": "Pases completados", "fr": "Réussite des passes"},
        "family": "possession",
        "definition": "100 * completed passes / attempted passes. Null for zero attempts.",
        "denominator": "All attempted passes",
        "unit": "%",
        "direction": "higher",
        "version": "2.0.0",
    }
    return out


def match_features(events: pl.DataFrame, raw_events: list[dict], exposure: Exposure) -> list[dict]:
    # Entire provider match is the coverage unit. Shootout events never enter features.
    played = events.filter(pl.col("period") <= 4)
    by_player = {
        k[0]: frame.to_dicts()
        for k, frame in played.filter(pl.col("player_key").is_not_null())
        .partition_by("player_key", as_dict=True)
        .items()
    }
    lookup = {row["event_key"]: row for row in played.iter_rows(named=True)}
    raw_lookup = {key("event", e["id"]): e for e in raw_events}
    pressure_covered = played.filter(pl.col("event_type") == "Pressure").height > 0
    # Legacy files can link the shot to the pass instead of the pass to the shot.
    shot_for_pass = {
        key("event", e["shot"]["key_pass_id"]): key("event", e["id"])
        for e in raw_events
        if e["period"] <= 4 and e.get("shot", {}).get("key_pass_id")
    }
    result = []
    for minutes in exposure.rows:
        pid = key("player", minutes["player_id"])
        own = by_player.get(pid, [])
        grouped = defaultdict(list)
        for e in own:
            grouped[e["event_type"]].append(e)
        passes, shots, carries = grouped["Pass"], grouped["Shot"], grouped["Carry"]
        np_shots = [s for s in shots if s["subtype"] != "Penalty"]
        creators = [p for p in passes if p["shot_assist"] or p["goal_assist"]]
        xa = 0.0
        missing_links = 0
        used_shots: set[str] = set()
        for p in creators:
            shot_key = p["assisted_shot_key"] or shot_for_pass.get(p["event_key"])
            s = lookup.get(shot_key)
            if (
                s is None
                or s["event_type"] != "Shot"
                or s["team_key"] != p["team_key"]
                or s["index"] <= p["index"]
                or s["xg"] is None
                or shot_key in used_shots
            ):
                missing_links += 1
            else:
                used_shots.add(shot_key)
                xa += s["xg"]
        passing_coords = all(
            p["progressive"] is not None for p in passes if p["completed"] and p["open_play"]
        )
        carrying_coords = all(p["progressive"] is not None for p in carries)
        totals = {
            "goals": sum(s["outcome"] == "Goal" for s in shots),
            "non_penalty_goals": sum(s["outcome"] == "Goal" for s in np_shots),
            "shots": len(shots),
            "xg": sum(s["xg"] for s in shots) if all(s["xg"] is not None for s in shots) else None,
            "npxg": sum(s["xg"] for s in np_shots) if all(s["xg"] is not None for s in np_shots) else None,
            "assists": sum(p["goal_assist"] for p in passes),
            "key_passes": len(creators),
            "xa": xa if not missing_links else None,
            "passes": len(passes),
            "completed_passes": sum(p["completed"] for p in passes),
            "progressive_passes": sum(bool(p["progressive"]) for p in passes) if passing_coords else None,
            "carries": len(carries),
            "progressive_carries": sum(bool(c["progressive"]) for c in carries) if carrying_coords else None,
            "passes_into_final_third": sum(bool(p["final_third_entry"]) for p in passes)
            if passing_coords
            else None,
            "entries_into_box": sum(bool(e["box_entry"]) for e in passes + carries)
            if passing_coords and carrying_coords
            else None,
            "pressures": len(grouped["Pressure"]) if pressure_covered else None,
            "tackles": sum(e["subtype"] == "Tackle" for e in grouped["Duel"]),
            "interceptions": len(grouped["Interception"]),
            "ball_recoveries": sum(
                not raw_lookup[e["event_key"]].get("ball_recovery", {}).get("recovery_failure", False)
                for e in grouped["Ball Recovery"]
            ),
            "turnovers": len(grouped["Dispossessed"]) + len(grouped["Miscontrol"]),
        }
        result.append(
            {
                "player_key": pid,
                "team_key": key("team", minutes["team_id"]),
                "minutes": minutes["minutes"],
                "starts": int(minutes["started"]),
                "position_group": minutes["position_group"],
                "position_seconds": minutes["position_seconds"],
                "event_count": len(own),
                "missing_shot_links": missing_links,
                **totals,
            }
        )
    return result


def season_features(rows: list[dict], players: dict[str, dict]) -> list[dict]:
    if not rows:
        return []
    scalar_rows = [{k: v for k, v in r.items() if k != "position_seconds"} for r in rows]
    frame = pl.DataFrame(scalar_rows, infer_schema_length=None)
    totals = list(DEFINITIONS)
    # Sum only complete exposure: a missing match never becomes an observed zero.
    agg = frame.group_by(["player_key", "team_key"]).agg(
        pl.col("minutes").sum(),
        pl.col("starts").sum(),
        pl.len().alias("appearances"),
        pl.col("event_count").sum(),
        pl.col("missing_shot_links").sum(),
        *[
            pl.when(pl.col(c).null_count() == 0).then(pl.col(c).sum()).otherwise(None).alias(c)
            for c in totals
        ],
    )
    pos_seconds = defaultdict(lambda: defaultdict(float))
    for row in rows:
        for group, seconds in row["position_seconds"].items():
            pos_seconds[(row["player_key"], row["team_key"])][group] += seconds
    result = []
    for row in agg.sort(["player_key", "team_key"]).iter_rows(named=True):
        identity = players[row["player_key"]]
        rates = {
            m + "_per90": row[m] * 90 / row["minutes"] if row[m] is not None and row["minutes"] > 0 else None
            for m in totals
        }
        rates["pass_completion"] = row["completed_passes"] * 100 / row["passes"] if row["passes"] else None
        positions = dict(pos_seconds[(row["player_key"], row["team_key"])])
        dominant = max(positions, key=lambda p: (positions[p], p)) if positions else "UNK"
        result.append(
            {
                "player_id": row["player_key"],
                "source_player_id": identity["source_player_id"],
                "player_name": identity["player_name"],
                "display_name": identity["display_name"],
                "nationality": identity["nationality"],
                "team_id": row["team_key"],
                "team_name": identity["team_name"],
                "position_group": dominant,
                "position_minutes": {k: v / 60 for k, v in sorted(positions.items())},
                "minutes": row["minutes"],
                "appearances": row["appearances"],
                "starts": row["starts"],
                "event_count": row["event_count"],
                "age": None,
                "preferred_foot": None,
                "totals": {m: row[m] for m in totals},
                "metrics": rates,
                "quality_flags": (["unresolved_assisted_shot"] if row["missing_shot_links"] else []),
            }
        )
    return result

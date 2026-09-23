"""Source-aware normalization. Provider coordinates stay 120 x 80, attacking +x."""

from __future__ import annotations

from math import hypot, isfinite

import polars as pl

from core.pipeline.config import SOURCE
from core.pipeline.minutes import clock_seconds


def key(entity: str, provider_id: str | int) -> str:
    if provider_id is None or str(provider_id) == "":
        raise ValueError(f"Missing {entity} provider ID")
    return f"{SOURCE}:{entity}:{provider_id}"


def location(value: list | None) -> tuple[float | None, float | None]:
    if value is None:
        return None, None
    if len(value) < 2 or not all(isfinite(float(v)) for v in value[:2]):
        raise ValueError("Invalid event location")
    x, y = float(value[0]), float(value[1])
    # One decimal precision can place an observation 0.1 beyond the boundary.
    # Preserve it exactly and report it in quality metadata; never silently clamp.
    if not -0.1 <= x <= 120.1 or not -0.1 <= y <= 80.1:
        raise ValueError(f"Location outside StatsBomb pitch: {x}, {y}")
    return x, y


def progressive(x: float, y: float, end_x: float, end_y: float) -> bool:
    start_distance = hypot((120 - x) * 105 / 120, (40 - y) * 68 / 80)
    end_distance = hypot((120 - end_x) * 105 / 120, (40 - end_y) * 68 / 80)
    gain = start_distance - end_distance
    return end_x > x and gain >= 10 and gain >= 0.25 * start_distance


EVENT_SCHEMA = {
    "event_key": pl.String,
    "source_key": pl.String,
    "source_event_id": pl.String,
    "match_key": pl.String,
    "source_match_id": pl.Int64,
    "competition_key": pl.String,
    "season_key": pl.String,
    "team_key": pl.String,
    "player_key": pl.String,
    "position_id": pl.Int64,
    "period": pl.Int64,
    "index": pl.Int64,
    "period_seconds": pl.Float64,
    "event_type": pl.String,
    "x": pl.Float64,
    "y": pl.Float64,
    "end_x": pl.Float64,
    "end_y": pl.Float64,
    "outcome": pl.String,
    "subtype": pl.String,
    "xg": pl.Float64,
    "assisted_shot_key": pl.String,
    "shot_assist": pl.Boolean,
    "goal_assist": pl.Boolean,
    "completed": pl.Boolean,
    "open_play": pl.Boolean,
    "progressive": pl.Boolean,
    "final_third_entry": pl.Boolean,
    "box_entry": pl.Boolean,
    "under_pressure": pl.Boolean,
    "raw_sha256": pl.String,
}


def normalize_events(events: list[dict], match: dict, raw_sha256: str) -> pl.DataFrame:
    ids, indexes = set(), set()
    rows = []
    for e in events:
        eid, index = e["id"], e["index"]
        if eid in ids or index in indexes:
            raise ValueError("Duplicate event ID/index in match")
        ids.add(eid)
        indexes.add(index)
        kind = e["type"]["name"]
        body = e.get(kind.lower().replace(" ", "_"), {})
        x, y = location(e.get("location"))
        ex, ey = location(body.get("end_location"))
        coords = all(v is not None for v in (x, y, ex, ey))
        outcome = body.get("outcome", {}).get("name")
        subtype = body.get("type", {}).get("name")
        completed = (outcome is None) if kind == "Pass" else None
        open_play = kind == "Carry" or (
            kind == "Pass" and subtype not in {"Corner", "Free Kick", "Throw-in", "Goal Kick", "Kick Off"}
        )
        shot_xg = body.get("statsbomb_xg") if kind == "Shot" else None
        if shot_xg is not None and (not isfinite(shot_xg) or not 0 <= shot_xg <= 1):
            raise ValueError("Invalid shot xG")
        can_enter = kind == "Carry" or (kind == "Pass" and completed and open_play)

        def in_box(xx: float, yy: float) -> bool:
            return xx >= 102 and 18 <= yy <= 62

        rows.append(
            {
                "event_key": key("event", eid),
                "source_key": SOURCE,
                "source_event_id": eid,
                "match_key": key("match", match["match_id"]),
                "source_match_id": match["match_id"],
                "competition_key": key("competition", match["competition"]["competition_id"]),
                "season_key": key(
                    "season", f"{match['competition']['competition_id']}:{match['season']['season_id']}"
                ),
                "team_key": key("team", e["team"]["id"]) if e.get("team") else None,
                "player_key": key("player", e["player"]["id"]) if e.get("player") else None,
                "position_id": e.get("position", {}).get("id"),
                "period": e["period"],
                "index": index,
                "period_seconds": clock_seconds(e["timestamp"]),
                "event_type": kind,
                "x": x,
                "y": y,
                "end_x": ex,
                "end_y": ey,
                "outcome": outcome,
                "subtype": subtype,
                "xg": shot_xg,
                "assisted_shot_key": key("event", body["assisted_shot_id"])
                if body.get("assisted_shot_id")
                else None,
                "shot_assist": bool(body.get("shot_assist", False)) if kind == "Pass" else False,
                "goal_assist": bool(body.get("goal_assist", False)) if kind == "Pass" else False,
                "completed": completed,
                "open_play": open_play,
                "progressive": progressive(x, y, ex, ey)
                if coords and can_enter
                else (False if coords else None),
                "final_third_entry": bool(x < 80 <= ex)
                if coords and can_enter
                else (False if coords else None),
                "box_entry": bool(not in_box(x, y) and in_box(ex, ey))
                if coords and can_enter
                else (False if coords else None),
                "under_pressure": bool(e.get("under_pressure", False)),
                "raw_sha256": raw_sha256,
            }
        )
    return pl.DataFrame(rows, schema=EVENT_SCHEMA).sort("index")


def normalize_roster(lineups: list[dict]) -> tuple[list[dict], list[dict]]:
    players, teams = [], []
    for team in lineups:
        tid = key("team", team["team_id"])
        teams.append(
            {
                "team_key": tid,
                "source_key": SOURCE,
                "source_team_id": str(team["team_id"]),
                "team_name": team["team_name"],
            }
        )
        for p in team["lineup"]:
            players.append(
                {
                    "player_key": key("player", p["player_id"]),
                    "source_key": SOURCE,
                    "source_player_id": str(p["player_id"]),
                    "player_name": p["player_name"],
                    "display_name": p.get("player_nickname") or p["player_name"],
                    "nationality": p.get("country", {}).get("name"),
                    "team_key": tid,
                    "team_name": team["team_name"],
                }
            )
    return players, teams

"""On-pitch exposure on period-relative clocks, including stoppage and extra time.

No minute=90 shortcut, no half-time interval, no shootout exposure. Invalid lifecycle
or missing period ends stops publication; a partially decoded match is never accepted.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass


class MinutesError(ValueError):
    pass


def clock_seconds(timestamp: str) -> float:
    try:
        h, m, s = timestamp.split(":")
        value = int(h) * 3600 + int(m) * 60 + float(s)
        if value < 0 or not 0 <= int(m) < 60 or not 0 <= float(s) < 60:
            raise ValueError(timestamp)
        return value
    except (ValueError, AttributeError) as exc:
        raise MinutesError(f"Invalid period timestamp: {timestamp!r}") from exc


def position_group(position_id: int | None) -> str:
    if position_id == 1:
        return "GK"
    if position_id in {3, 4, 5}:
        return "CB"
    if position_id in {2, 6, 7, 8}:
        return "FB"
    if position_id in {9, 10, 11}:
        return "DM"
    if position_id in {13, 14, 15}:
        return "CM"
    if position_id in {18, 19, 20}:
        return "AM"
    if position_id in {12, 16, 17, 21}:
        return "W"
    if position_id in {22, 23, 24, 25}:
        return "ST"
    return "UNK"


@dataclass
class Exposure:
    rows: list[dict]
    intervals: list[dict]
    period_ends: dict[int, float]
    warnings: list[str]


def compute_minutes(events: list[dict], lineups: list[dict]) -> Exposure:
    roster = {p["player_id"]: t["team_id"] for t in lineups for p in t["lineup"]}
    ends: dict[int, float] = {}
    relevant = [e for e in events if 1 <= e["period"] <= 4]
    for e in relevant:
        end, start = e.get("half_end", {}), e.get("half_start", {})
        if end.get("early_video_end") or end.get("match_suspended") or start.get("late_video_start"):
            raise MinutesError("Incomplete broadcast cannot establish full match exposure")
    if not relevant:
        raise MinutesError("No regulation events")
    periods = {e["period"] for e in relevant}
    if periods not in ({1, 2}, {1, 2, 3, 4}):
        raise MinutesError(f"Incomplete match periods: {sorted(periods)}")
    for e in relevant:
        if e["type"]["name"] == "Half End":
            ends[e["period"]] = max(ends.get(e["period"], 0), clock_seconds(e["timestamp"]))
    if set(ends) != periods or any(v <= 0 for v in ends.values()):
        raise MinutesError("Missing or invalid Half End; cannot establish exposure")

    active: dict[int, tuple[int, int | None]] = {}
    starts: set[int] = set()
    permanent: set[int] = set()
    temporary: dict[int, tuple[int, int | None]] = {}
    positions: dict[int, int | None] = {}
    seconds: dict[int, float] = defaultdict(float)
    by_position: dict[int, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    intervals: list[dict] = []
    warnings: list[str] = []
    for e in relevant:
        if e["type"]["name"] != "Starting XI":
            continue
        if e["period"] != 1:
            raise MinutesError("Unexpected Starting XI outside period one")
        team = e["team"]["id"]
        xi = e["tactics"]["lineup"]
        if len(xi) != 11:
            raise MinutesError(f"Starting XI has {len(xi)} players")
        for entry in xi:
            pid = entry["player"]["id"]
            if pid in active or roster.get(pid) != team:
                raise MinutesError(f"Invalid starting identity {pid}")
            pos = entry["position"]["id"]
            active[pid] = (team, pos)
            positions[pid] = pos
            starts.add(pid)
    if len(active) != 22:
        raise MinutesError("Expected two complete starting lineups")

    for period in sorted(periods):
        opened = {pid: 0.0 for pid in active}

        def close(pid: int, at: float) -> None:
            if pid not in active:
                return
            team, pos = active[pid]
            begin = opened[pid]
            if at < begin - 1e-6:
                raise MinutesError("Clock moved backwards")
            duration = max(0, at - begin)
            seconds[pid] += duration
            by_position[pid][position_group(pos)] += duration
            if duration > 0:
                intervals.append(
                    {
                        "player_id": pid,
                        "team_id": team,
                        "period": period,
                        "start_seconds": begin,
                        "end_seconds": at,
                        "position_group": position_group(pos),
                    }
                )
            opened[pid] = at

        def change_position(pid: int, pos: int | None, at: float) -> None:
            if pid in active and pos is not None and active[pid][1] != pos:
                close(pid, at)
                active[pid] = (active[pid][0], pos)
                positions[pid] = pos

        ordered = sorted(
            [e for e in relevant if e["period"] == period],
            key=lambda e: (clock_seconds(e["timestamp"]), e["index"]),
        )
        for e in ordered:
            at = clock_seconds(e["timestamp"])
            if at > ends[period] + 0.01:
                raise MinutesError("Event timestamp after final whistle")
            kind = e["type"]["name"]
            pid = e.get("player", {}).get("id")
            if kind == "Starting XI":
                continue
            if kind == "Tactical Shift":
                for entry in e["tactics"]["lineup"]:
                    change_position(entry["player"]["id"], entry["position"]["id"], at)
            if pid is not None:
                change_position(pid, e.get("position", {}).get("id"), at)
            if kind == "Substitution":
                incoming = e["substitution"]["replacement"]["id"]
                if pid in active:
                    team, pos = active[pid]
                    close(pid, at)
                    del active[pid]
                elif pid in temporary:
                    team, pos = temporary.pop(pid)
                else:
                    raise MinutesError(f"Substitution of inactive player {pid}")
                if incoming in active or incoming in permanent or roster.get(incoming) != team:
                    raise MinutesError(f"Invalid replacement {incoming}")
                permanent.add(pid)
                active[incoming] = (team, pos)
                positions[incoming] = pos
                opened[incoming] = at
                seconds[incoming] += 0.0
            elif kind == "Player Off" and pid in active:
                temporary[pid] = active[pid]
                close(pid, at)
                del active[pid]
                if e.get("player_off", {}).get("permanent", False):
                    permanent.add(pid)
            elif kind == "Player On":
                if pid not in temporary or pid in permanent:
                    raise MinutesError(f"Player On without temporary exit: {pid}")
                active[pid] = temporary.pop(pid)
                opened[pid] = at

            card = e.get("bad_behaviour", {}).get("card", {}).get("name") or e.get("foul_committed", {}).get(
                "card", {}
            ).get("name")
            if card in {"Red Card", "Second Yellow"} and pid is not None:
                close(pid, at)
                active.pop(pid, None)
                temporary.pop(pid, None)
                permanent.add(pid)
            # A positive on-ball event from an inactive player exposes a lifecycle error.
            if kind in {"Pass", "Shot", "Carry", "Pressure", "Duel", "Interception"}:
                if pid not in active:
                    raise MinutesError(f"{kind} by inactive player {pid}")
        for pid in list(active):
            close(pid, ends[period])
    rows = []
    for pid, duration in sorted(seconds.items()):
        pos_seconds = dict(by_position[pid])
        dominant = (
            max(pos_seconds, key=lambda k: (pos_seconds[k], k))
            if pos_seconds
            else position_group(positions[pid])
        )
        rows.append(
            {
                "player_id": pid,
                "team_id": roster[pid],
                "minutes": duration / 60,
                "started": pid in starts,
                "position_group": dominant,
                "position_seconds": pos_seconds,
            }
        )
    return Exposure(rows, intervals, ends, warnings)

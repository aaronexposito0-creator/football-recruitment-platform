"""Coarse spatial research summaries; no event coordinates or event IDs exported.

A 6x4 grid deliberately loses provider-level spatial precision. Counts and flows
are aggregated; shot xG is rounded to two decimals only at presentation export.
These summaries remain subject to the source's non-commercial analysis terms.
"""

from collections import defaultdict

import polars as pl

from core.pipeline.canonical import key
from core.pipeline.minutes import Exposure

KINDS = ("shots", "passes", "progressive_passes", "progressive_carries", "pressures", "tackles_interceptions")
VERSION = "zones-6x4-v1"


def zone(x, y):
    if x is None or y is None:
        return None
    return min(3, max(0, int(y / 20))) * 6 + min(5, max(0, int(x / 20)))


def match_spatial(events: pl.DataFrame, exposure: Exposure) -> list[dict]:
    frames = {
        k[0]: frame.to_dicts()
        for k, frame in events.filter((pl.col("period") <= 4) & pl.col("player_key").is_not_null())
        .partition_by("player_key", as_dict=True)
        .items()
    }
    records = []
    for minutes in exposure.rows:
        pid = key("player", minutes["player_id"])
        cells = {
            kind: defaultdict(lambda: {"count": 0, "completed": 0, "xg": 0.0, "xg_missing": 0})
            for kind in KINDS
        }
        flows = {kind: defaultdict(int) for kind in ("passes", "progressive_passes", "progressive_carries")}
        totals, located = dict.fromkeys(KINDS, 0), dict.fromkeys(KINDS, 0)
        for row in frames.get(pid, []):
            kind = row["event_type"]
            selected = []
            if kind == "Shot":
                selected.append("shots")
            if kind == "Pass":
                selected.append("passes")
            if kind == "Pressure":
                selected.append("pressures")
            if kind == "Interception" or kind == "Duel" and row["subtype"] == "Tackle":
                selected.append("tackles_interceptions")
            if row["progressive"] and kind == "Pass":
                selected.append("progressive_passes")
            if row["progressive"] and kind == "Carry":
                selected.append("progressive_carries")
            start, end = zone(row["x"], row["y"]), zone(row["end_x"], row["end_y"])
            for selected_kind in selected:
                totals[selected_kind] += 1
                if start is None:
                    continue
                located[selected_kind] += 1
                bucket = cells[selected_kind][start]
                bucket["count"] += 1
                bucket["completed"] += int(bool(row["completed"]))
                if selected_kind == "shots":
                    if row["xg"] is None:
                        bucket["xg_missing"] += 1
                    else:
                        bucket["xg"] += row["xg"]
                if selected_kind in flows and end is not None and start != end:
                    if selected_kind != "passes" or row["completed"] and row["open_play"]:
                        flows[selected_kind][(start, end)] += 1
        records.append(
            {
                "player_id": pid,
                "minutes": minutes["minutes"],
                "maps": {
                    kind: {
                        "events": totals[kind],
                        "located": located[kind],
                        "cells": [{"zone": z, **v} for z, v in sorted(cells[kind].items())],
                        "flows": [
                            {"from": pair[0], "to": pair[1], "count": count}
                            for pair, count in sorted(flows.get(kind, {}).items())
                        ],
                    }
                    for kind in KINDS
                },
            }
        )
    return records


def combine_maps(records: list[dict]) -> dict:
    result = {}
    for kind in KINDS:
        cells, flows = (
            defaultdict(lambda: {"count": 0, "completed": 0, "xg": 0.0, "xg_missing": 0}),
            defaultdict(int),
        )
        total, located = 0, 0
        for record in records:
            data = record["maps"][kind]
            total += data["events"]
            located += data["located"]
            for cell in data["cells"]:
                for field in ("count", "completed", "xg", "xg_missing"):
                    cells[cell["zone"]][field] += cell[field]
            for flow in data["flows"]:
                flows[(flow["from"], flow["to"])] += flow["count"]
        result[kind] = {
            "events": total,
            "located": located,
            "cells": [{"zone": z, **v} for z, v in sorted(cells.items())],
            "flows": [
                {"from": pair[0], "to": pair[1], "count": count} for pair, count in sorted(flows.items())
            ],
        }
    return result


def publish_maps(maps: dict) -> dict:
    return {
        kind: {
            **data,
            "cells": [
                {k: v for k, v in cell.items() if k not in ("xg", "xg_missing")}
                | ({"xg": None if cell["xg_missing"] else round(cell["xg"], 2)} if kind == "shots" else {})
                for cell in data["cells"]
            ],
        }
        for kind, data in maps.items()
    }

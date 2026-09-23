"""Optional local-only independent counts against provider bytes (never exported).

The shipped ZIP excludes raw files. Run after ingestion to audit selected player
shot/assist totals and the entire corpus with an independent DuckDB query.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

from core.pipeline.cache import SourceError, sha256
from core.pipeline.config import ROOT, data_root
from core.pipeline.warehouse import open_warehouse


def verify_bytes(root: Path, expected: dict[str, str]) -> int:
    """Fail before parsing if any pinned local input is missing or damaged."""
    for relative, digest in expected.items():
        path = root / relative
        if not path.is_file() or sha256(path.read_bytes()) != digest:
            raise SourceError(
                f"Local integrity check failed: {relative}. "
                "Restore the exact pinned bytes before rerunning this audit."
            )
    return len(expected)


def main():
    root = data_root()
    pointer = json.loads((root / "CURRENT.json").read_text())
    dataset_path = root / pointer["relative_path"]
    dataset = json.loads((dataset_path / "analysis.json").read_text())
    manifest = dataset["manifest"]
    source_root = root / "raw/statsbomb" / manifest["source_revision"]
    input_hashes = verify_bytes(source_root, manifest["inputs"])
    parquet_hashes = verify_bytes(dataset_path, manifest["parquet_sha256"])
    chosen = {
        p["source_player_id"]: p
        for p in dataset["players"]
        if any(
            term in p["player_name"]
            for term in ("Lamine Yamal", "Fabián Ruiz", "Rodrigo Hernández", "Jasmin Kurtič")
        )
    }
    observed = {pid: dict(shots=0, goals=0, assists=0, xg=0.0) for pid in chosen}
    corpus_events = 0
    for path in sorted((root / "raw/statsbomb" / manifest["source_revision"] / "data/events").glob("*.json")):
        if path.name.endswith(".meta.json") or "data/events/" + path.name not in manifest["inputs"]:
            continue
        events = json.loads(path.read_text())
        corpus_events += len(events)
        for event in events:
            pid = str(event.get("player", {}).get("id"))
            if pid not in chosen or event["period"] > 4:
                continue
            row = observed[pid]
            if event["type"]["name"] == "Shot":
                row["shots"] += 1
                row["xg"] += event["shot"]["statsbomb_xg"]
                row["goals"] += event["shot"].get("outcome", {}).get("name") == "Goal"
            if event["type"]["name"] == "Pass":
                row["assists"] += event["pass"].get("goal_assist", False)
    for pid, row in observed.items():
        for metric, actual in row.items():
            assert math.isclose(actual, chosen[pid]["totals"][metric], abs_tol=1e-9), (pid, metric)
    assert corpus_events == manifest["events"]
    with open_warehouse(dataset_path) as db:
        assert db.execute("select count(*) from events").fetchone()[0] == corpus_events
        invalid = db.execute("""select count(*) from player_features f join
          (select player_key, team_key, sum(minutes) as minutes from player_minutes group by all) m
          on f.player_id=m.player_key and f.team_id=m.team_key
          where abs(f.minutes-m.minutes)>0.0000001""").fetchone()[0]
        assert invalid == 0
        total_minutes = db.execute("select sum(minutes) from player_minutes").fetchone()[0]
        assert math.isclose(total_minutes, sum(p["minutes"] for p in dataset["players"]), abs_tol=1e-7)
    report = {
        "status": "passed",
        "dataset_id": manifest["dataset_id"],
        "source_hashes_verified": input_hashes,
        "parquet_hashes_verified": parquet_hashes,
        "raw_events_counted": corpus_events,
        "duckdb_player_minutes_mismatches": invalid,
        "total_player_minutes": total_minutes,
        "independent_raw_counts": [
            {"player": chosen[pid]["player_name"], **row} for pid, row in observed.items()
        ],
        "scope": "Independent raw counts for four players; all-corpus row counts and player minute aggregation in DuckDB. Lifecycle edge cases tested separately.",
    }
    output = ROOT / "docs/validation/LOCAL_EVENT_CHECKS.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n")
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()

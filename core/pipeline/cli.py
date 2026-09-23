from __future__ import annotations

import argparse
import json
from pathlib import Path

from core.pipeline.build import ingest
from core.pipeline.config import DEFAULT_COMPETITION, DEFAULT_SEASON, REVISION, data_root


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Rebuild StatsBomb non-commercial research analysis from pinned open data"
    )
    parser.add_argument("--competition", type=int, default=DEFAULT_COMPETITION)
    parser.add_argument("--season", type=int, default=DEFAULT_SEASON)
    parser.add_argument("--revision", default=REVISION)
    parser.add_argument("--data-dir", type=Path, default=data_root())
    parser.add_argument(
        "--offline", action="store_true", help="Validate and reuse cached provider files only"
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Explicitly partial dataset for development; never masquerades as full coverage",
    )
    parser.add_argument("--workers", type=int, default=4)
    args = parser.parse_args()
    try:
        result = ingest(
            args.data_dir,
            args.revision,
            args.competition,
            args.season,
            offline=args.offline,
            limit=args.limit,
            workers=args.workers,
        )
    except (ValueError, RuntimeError, OSError) as exc:
        parser.exit(1, f"Ingestion stopped; previous dataset preserved. {exc}\n")
    print(
        json.dumps(
            {
                k: result["manifest"][k]
                for k in ["dataset_id", "matches_ingested", "events", "players", "coverage_pct"]
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()

"""Read-only DuckDB access to one immutable Parquet dataset."""

from pathlib import Path

import duckdb


def open_warehouse(dataset: Path) -> duckdb.DuckDBPyConnection:
    connection = duckdb.connect(":memory:", config={"threads": 2})
    tables = {
        "events": "events/**/*.parquet",
        "player_minutes": "minutes/player_match.parquet",
        "player_features": "features/player_season.parquet",
        "matches": "entities/matches.parquet",
        "players": "entities/players.parquet",
        "teams": "entities/teams.parquet",
    }
    for name, relative in tables.items():
        # Paths are operator-owned, never supplied by public HTTP query parameters.
        connection.read_parquet(str(dataset / relative), hive_partitioning=False).create_view(name)
    return connection

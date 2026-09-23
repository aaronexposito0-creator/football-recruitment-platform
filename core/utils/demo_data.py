from __future__ import annotations

import numpy as np

from core.schemas.models import PlayerRecord


METRICS = [
    "progressive_passes_per90",
    "progressive_carries_per90",
    "pressures_per90",
    "pass_completion",
    "xa_per90",
    "turnovers_per90",
    "interceptions_per90",
]


def demo_players(n: int = 24, seed: int = 42) -> list[PlayerRecord]:
    rng = np.random.default_rng(seed)
    players = []
    for i in range(n):
        metrics = {
            "progressive_passes_per90": max(0, rng.normal(5.5, 1.8)),
            "progressive_carries_per90": max(0, rng.normal(2.4, 1.0)),
            "pressures_per90": max(0, rng.normal(16, 4.5)),
            "pass_completion": min(98, max(55, rng.normal(83, 5))),
            "xa_per90": max(0, rng.normal(0.16, 0.08)),
            "turnovers_per90": max(0.2, rng.normal(8.5, 2.0)),
            "interceptions_per90": max(0, rng.normal(1.5, 0.6)),
        }
        players.append(
            PlayerRecord(
                player_id=f"demo-{i + 1:03d}",
                player_name=f"Demo Midfielder {i + 1}",
                team_name=f"Demo Club {(i % 6) + 1}",
                competition="Synthetic League",
                season="2026/27",
                age=int(rng.integers(18, 29)),
                position_group="CM",
                preferred_foot="right" if i % 3 else "left",
                minutes=float(rng.integers(600, 3000)),
                metrics={k: round(float(v), 3) for k, v in metrics.items()},
                metadata={"synthetic": True},
            )
        )
    return players

from __future__ import annotations

from typing import Iterable, Sequence
from math import isfinite

import numpy as np

from core.analytics.fit_engine import PopulationStats
from core.schemas.models import PlayerRecord


def compute_population_stats(
    players: Iterable[PlayerRecord], metrics: Sequence[str], *, min_observations: int = 2
) -> dict[str, PopulationStats]:
    players = list(players)
    out: dict[str, PopulationStats] = {}
    for metric in metrics:
        values = [p.metrics.get(metric) for p in players]
        arr = np.asarray([float(v) for v in values if v is not None and isfinite(v)], dtype=float)
        if len(arr) < max(2, min_observations):
            continue
        out[metric] = PopulationStats(
            mean=float(arr.mean()),
            std=float(arr.std(ddof=0) or 1.0),
            p10=float(np.percentile(arr, 10)),
            p90=float(np.percentile(arr, 90)),
        )
    return out

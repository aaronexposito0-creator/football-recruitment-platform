from __future__ import annotations

from typing import Iterable, Sequence

import numpy as np

from core.schemas.models import PlayerRecord, SimilarityComponent, SimilarityResult


def player_similarity(
    target: PlayerRecord,
    candidates: Iterable[PlayerRecord],
    metrics: Sequence[str],
    *,
    min_comparable_metrics: int = 3,
    min_reference_observations: int = 2,
) -> list[SimilarityResult]:
    """Observed-only standardized distance with a reconstructable explanation.

    Callers must select a defensible cohort before calling. Every candidate uses
    the same per-feature reference standard deviations. Constant columns carry
    no discriminating information and are excluded, without imputing data.
    Research APIs require ten reference observations for each dimension; the
    lower generic default remains useful for explicitly synthetic demonstrations.
    """
    candidates = sorted([p for p in candidates if p.player_id != target.player_id], key=lambda p: p.player_id)
    if len(set(metrics)) != len(metrics) or not metrics:
        raise ValueError("Similarity requires distinct metric names")
    if min_comparable_metrics < 1:
        raise ValueError("Minimum comparable dimensions must be positive")
    if min_reference_observations < 2:
        raise ValueError("Standardization requires at least two reference observations")
    all_players = [target, *candidates]
    arr = np.asarray(
        [[np.nan if p.metrics.get(m) is None else p.metrics[m] for m in metrics] for p in all_players],
        dtype=float,
    )
    masks = np.isfinite(arr)
    reference_counts = masks.sum(axis=0)
    scales = np.asarray(
        [float(np.std(col[np.isfinite(col)])) if np.isfinite(col).sum() >= 2 else 0.0 for col in arr.T]
    )
    supported = reference_counts >= min_reference_observations
    informative = supported & (scales > 1e-9)
    out: list[SimilarityResult] = []
    for idx, player in enumerate(candidates, start=1):
        observed = masks[0] & masks[idx]
        comparable = observed & informative
        count = int(comparable.sum())
        deltas = np.full(len(metrics), np.nan)
        deltas[comparable] = (arr[idx, comparable] - arr[0, comparable]) / scales[comparable]
        squared_total = float(np.nansum(deltas**2))
        if count >= min_comparable_metrics:
            similarity = 100 / (1 + float(np.sqrt(squared_total / count)))
            warning = None
        else:
            similarity = None
            warning = "Insufficient mutually observed dimensions with adequate nonconstant reference evidence"
        components = []
        for j, metric in enumerate(metrics):
            status = (
                "missing"
                if not observed[j]
                else "insufficient_reference"
                if not supported[j]
                else "compared"
                if comparable[j]
                else "constant_reference"
            )
            share = (
                (100 * float(deltas[j] ** 2) / squared_total if squared_total else 0.0)
                if comparable[j]
                else None
            )
            components.append(
                SimilarityComponent(
                    metric=metric,
                    target_value=float(arr[0, j]) if masks[0, j] else None,
                    candidate_value=float(arr[idx, j]) if masks[idx, j] else None,
                    cohort_std=float(scales[j]) if informative[j] else None,
                    cohort_observations=int(reference_counts[j]),
                    standardized_difference=float(deltas[j]) if comparable[j] else None,
                    distance_share_pct=share,
                    status=status,
                )
            )
        sorted_components = sorted(
            [c for c in components if c.standardized_difference is not None],
            key=lambda c: (abs(c.standardized_difference), c.metric),
        )
        out.append(
            SimilarityResult(
                player_id=player.player_id,
                player_name=player.player_name,
                similarity=round(similarity, 2) if similarity is not None else None,
                comparable_metric_count=count,
                coverage=round(100 * int(observed.sum()) / len(metrics), 2),
                components=components,
                closest_dimensions=[c.metric for c in sorted_components[:3]]
                if similarity is not None
                else [],
                largest_differences=[c.metric for c in reversed(sorted_components[-3:])]
                if similarity is not None
                else [],
                warning=warning,
            )
        )
    return sorted(
        out, key=lambda r: (-(r.similarity if r.similarity is not None else -1), -r.coverage, r.player_id)
    )

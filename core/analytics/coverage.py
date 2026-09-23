from __future__ import annotations

from typing import Mapping, Sequence

from core.schemas.models import DataCoverageResult

# Canonical v0.1 metric domains. This becomes versioned metric governance later.
METRIC_DOMAINS: dict[str, list[str]] = {
    "availability": ["minutes", "starts"],
    "output": ["goals_per90", "assists_per90", "xg_per90", "xa_per90"],
    "progression": ["progressive_passes_per90", "progressive_carries_per90", "passes_into_final_third_per90"],
    "possession": ["pass_completion", "turnovers_per90", "carries_per90"],
    "defending": ["pressures_per90", "tackles_per90", "interceptions_per90", "aerial_win_pct"],
    "physical": ["top_speed", "distance_per90", "high_intensity_runs_per90"],
}

HIGH_VALUE = {
    "minutes",
    "xg_per90",
    "xa_per90",
    "progressive_passes_per90",
    "progressive_carries_per90",
    "pressures_per90",
    "pass_completion",
}


def calculate_coverage(
    values: Mapping[str, object], expected_metrics: Sequence[str] | None = None
) -> DataCoverageResult:
    expected = list(expected_metrics or [m for group in METRIC_DOMAINS.values() for m in group])
    observed = {m for m in expected if values.get(m) is not None and values.get(m) != ""}
    domain_scores: dict[str, float] = {}
    for domain, metrics in METRIC_DOMAINS.items():
        relevant = [m for m in metrics if m in expected]
        if not relevant:
            continue
        domain_scores[domain] = round(100 * sum(m in observed for m in relevant) / len(relevant), 2)

    coverage = 100 * len(observed) / max(len(expected), 1)
    missing_high = sorted((HIGH_VALUE & set(expected)) - observed)
    if coverage >= 80:
        label = "high"
    elif coverage >= 55:
        label = "medium"
    elif coverage >= 30:
        label = "limited"
    else:
        label = "very_limited"

    return DataCoverageResult(
        overall_coverage=round(coverage, 2),
        observed_metrics=len(observed),
        expected_metrics=len(expected),
        domain_coverage=domain_scores,
        missing_high_value_metrics=missing_high,
        confidence_label=label,
    )

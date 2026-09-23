"""Cohort-aware research profiles. Percentiles, confidence and fit remain distinct."""

from __future__ import annotations

from math import isfinite

MIN_MINUTES = 180
MIN_COHORT = 10
PROFILE_VERSION = "profile-evidence-v2.1"


def evidence_confidence(metrics: list[dict], minutes: float, eligible: bool) -> float:
    """Equal-weight profile support; unavailable metrics remain in the denominator.

    A large positional cohort cannot substitute for observations of a metric.
    This heuristic is not a calibrated probability or a player-quality score.
    """
    if not eligible or not metrics:
        return 0.0
    support = sum(
        min(m["cohort_observations"] / 30, 1)
        for m in metrics
        if m["value"] is not None and m["percentile"] is not None
    ) / len(metrics)
    return 100 * support * min(minutes / 900, 1)


def comparable(player: dict, other: dict) -> bool:
    return all(
        player[k] == other[k]
        for k in ("dataset_id", "competition_id", "season_id", "gender", "position_group")
    )


def cohort_for(player: dict, players: list[dict], min_minutes: int = MIN_MINUTES) -> list[dict]:
    return [p for p in players if comparable(player, p) and p["minutes"] >= min_minutes]


def percentile(value: float | None, reference: list[float], *, min_size: int = MIN_COHORT) -> float | None:
    clean = [v for v in reference if v is not None and isfinite(v)]
    if value is None or not isfinite(value) or len(clean) < min_size:
        return None
    # Midrank of the empirical CDF, including the target when it is in the cohort.
    return 100 * (sum(v < value for v in clean) + 0.5 * sum(v == value for v in clean)) / len(clean)


def player_profile(player: dict, dataset: dict, min_minutes: int = MIN_MINUTES) -> dict:
    cohort = cohort_for(player, dataset["players"], min_minutes)
    catalog = dataset["metric_catalog"]
    eligible = player["minutes"] >= min_minutes and player["position_group"] not in {"GK", "UNK"}
    reasons = []
    if player["minutes"] < min_minutes:
        reasons.append("below_minimum_minutes")
    if len(cohort) < MIN_COHORT:
        reasons.append("insufficient_peers")
    if player["position_group"] in {"GK", "UNK"}:
        reasons.append("position_model_unavailable")
    if dataset["manifest"]["is_partial"]:
        reasons.append("partial_competition_coverage")
    dominant_share = max(player["position_minutes"].values(), default=0) / max(player["minutes"], 1e-9)
    if dominant_share < 0.6:
        reasons.append("mixed_position_exposure")
    metrics = []
    for name, definition in catalog.items():
        value = player["metrics"].get(name)
        values = [p["metrics"][name] for p in cohort if p["metrics"].get(name) is not None]
        rank = percentile(value, values) if eligible else None
        favorable = 100 - rank if rank is not None and definition["direction"] == "lower" else rank
        metrics.append(
            {
                **definition,
                "value": value,
                "percentile": rank,
                "favorable_percentile": favorable,
                "cohort_observations": len(values),
            }
        )
    observed = sum(m["value"] is not None for m in metrics)
    coverage = 100 * observed / len(metrics) if metrics else 0
    confidence = evidence_confidence(metrics, player["minutes"], eligible)
    if eligible and any(m["value"] is not None and m["cohort_observations"] < MIN_COHORT for m in metrics):
        reasons.append("insufficient_metric_reference")
    strengths = sorted(
        [m for m in metrics if m["favorable_percentile"] is not None and m["favorable_percentile"] >= 75],
        key=lambda m: (-m["favorable_percentile"], m["key"]),
    )[:3]
    gaps = sorted(
        [m for m in metrics if m["favorable_percentile"] is not None and m["favorable_percentile"] <= 25],
        key=lambda m: (m["favorable_percentile"], m["key"]),
    )[:3]
    manifest = dataset["manifest"]
    return {
        "player": player,
        "metrics": metrics,
        "cohort": {
            "competition": player["competition"],
            "season": player["season"],
            "gender": player["gender"],
            "position_group": player["position_group"],
            "minimum_minutes": min_minutes,
            "minimum_players": MIN_COHORT,
            "size": len(cohort),
            "eligible": eligible and len(cohort) >= MIN_COHORT,
            "method": "Empirical midrank; same dataset, competition, season, gender and dominant position",
        },
        "evidence": {
            "version": PROFILE_VERSION,
            "data_coverage": coverage,
            "confidence_score": confidence,
            "confidence_method": "100 × min(minutes/900,1) × sum(min(metric observations/30,1) for observed benchmarked metrics) / all profile metrics. Each metric needs 10 reference observations. Not a probability or quality score.",
            "minutes": player["minutes"],
            "events": player["event_count"],
            "missing_context": [
                "current_club",
                "age",
                "preferred_foot",
                "contract",
                "market_value",
                "injuries",
                "tracking",
                "league_strength_adjustment",
            ],
            "warnings": reasons + player["quality_flags"],
            "strengths": [m["key"] for m in strengths],
            "review_areas": [m["key"] for m in gaps],
        },
        "lineage": {
            k: manifest[k]
            for k in (
                "dataset_id",
                "source",
                "source_url",
                "source_revision",
                "license_url",
                "feature_version",
                "schema_version",
                "minutes_version",
                "date_from",
                "date_to",
                "is_partial",
                "coverage_pct",
            )
        },
        "fit_score": None,
        "player_quality": None,
    }

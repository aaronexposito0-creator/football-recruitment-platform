from __future__ import annotations

from dataclasses import dataclass
from math import exp, isfinite
from typing import Iterable, Mapping

import numpy as np

from core.schemas.models import (
    FitComponent,
    FitResult,
    MetricRequirement,
    PlayerRecord,
    RecruitmentBrief,
    RequirementDirection,
)


@dataclass(frozen=True)
class PopulationStats:
    mean: float
    std: float
    p10: float
    p90: float


def _logistic(z: float) -> float:
    # bounded 0..100; 50 at population mean
    return 100.0 / (1.0 + exp(-max(-700.0, min(700.0, 1.25 * z))))


def _metric_score(value: float, req: MetricRequirement, stats: PopulationStats) -> float:
    std = max(float(stats.std), 1e-9)
    if req.direction == RequirementDirection.higher:
        return _logistic((value - stats.mean) / std)
    if req.direction == RequirementDirection.lower:
        return _logistic((stats.mean - value) / std)

    target = float(req.target)
    tolerance = req.tolerance or std
    distance = abs(value - target)
    standardized_distance = distance / tolerance
    if standardized_distance > 40:
        return 0.0
    return float(100.0 * np.exp(-0.5 * standardized_distance**2))


def _hard_metric_status(value: float, req: MetricRequirement) -> tuple[bool, str | None]:
    if req.minimum is not None and value < req.minimum:
        return False, f"{req.metric} below required minimum ({value:.2f} < {req.minimum:.2f})"
    if req.maximum is not None and value > req.maximum:
        return False, f"{req.metric} above allowed maximum ({value:.2f} > {req.maximum:.2f})"
    return True, None


def _eligible(player: PlayerRecord, brief: RecruitmentBrief) -> tuple[bool, list[str]]:
    reasons: list[str] = []
    if player.minutes < brief.min_minutes:
        reasons.append(f"minutes below minimum ({player.minutes:.0f} < {brief.min_minutes})")
    if brief.age_min is not None and (player.age is None or player.age < brief.age_min):
        reasons.append("age below requested range or unavailable")
    if brief.age_max is not None and (player.age is None or player.age > brief.age_max):
        reasons.append("age above requested range or unavailable")
    if brief.position_groups and player.position_group not in brief.position_groups:
        reasons.append(f"position {player.position_group!r} outside requested groups")
    if brief.preferred_foot and (
        not player.preferred_foot or player.preferred_foot.lower() != brief.preferred_foot.lower()
    ):
        reasons.append("preferred foot mismatch or unavailable")
    return not reasons, reasons


def score_player(
    player: PlayerRecord,
    brief: RecruitmentBrief,
    population: Mapping[str, PopulationStats],
) -> FitResult:
    eligible, reasons = _eligible(player, brief)
    components: list[FitComponent] = []
    warnings: list[str] = []
    observed_weight = 0.0
    total_weight = sum(r.weight for r in brief.requirements) or 1.0
    weighted_points = 0.0

    for req in brief.requirements:
        value = player.metrics.get(req.metric)
        stats = population.get(req.metric)
        if value is not None and isfinite(value):
            hard_ok, hard_reason = _hard_metric_status(float(value), req)
            if not hard_ok:
                eligible = False
                reasons.append(hard_reason or f"hard constraint failed: {req.metric}")
        elif req.minimum is not None or req.maximum is not None:
            eligible = False
            reasons.append(f"Cannot verify hard constraint: {req.metric} is missing")
        if value is None or not isfinite(value) or stats is None:
            warnings.append(f"missing comparable data for {req.metric}")
            components.append(
                FitComponent(
                    metric=req.metric,
                    observed=float(value) if value is not None and isfinite(value) else None,
                    normalized_score=None,
                    weight=req.weight,
                    contribution=0.0,
                    status="missing",
                    explanation="Not scored: missing observation or insufficient reference evidence. No imputation.",
                )
            )
            continue

        score = _metric_score(float(value), req, stats)
        contribution = score * req.weight
        observed_weight += req.weight
        weighted_points += contribution
        status = "strong" if score >= 70 else "neutral" if score >= 40 else "weak"
        components.append(
            FitComponent(
                metric=req.metric,
                observed=float(value),
                normalized_score=score,
                weight=req.weight,
                contribution=contribution,
                status=status,
                explanation=f"{score:.0f}/100 against the comparison population for this requirement.",
            )
        )

    coverage = observed_weight / total_weight
    raw_fit = weighted_points / observed_weight if observed_weight else None

    # Confidence is intentionally conservative. More minutes and more metric coverage raise it.
    minutes_factor = min(max(player.minutes / 900, 0.0), 1.0)
    confidence = 100 * coverage * minutes_factor

    # Fit describes observed role compatibility. Evidence and eligibility are separate.
    # Components are normalized contributions whose sum equals the unrounded fit.
    for component in components:
        component.contribution = (
            round(component.contribution / observed_weight, 6) if observed_weight else 0.0
        )
        if component.normalized_score is not None and observed_weight:
            component.delta_from_neutral = round(
                (component.normalized_score - 50) * component.weight / observed_weight, 6
            )

    return FitResult(
        player_id=player.player_id,
        player_name=player.player_name,
        team_name=player.team_name,
        fit_score=round(raw_fit, 2) if raw_fit is not None else None,
        confidence_score=round(float(confidence), 2),
        data_coverage=round(float(coverage * 100), 2),
        eligible=eligible,
        components=components,
        reasons=reasons,
        warnings=warnings,
    )


def rank_players(
    players: Iterable[PlayerRecord],
    brief: RecruitmentBrief,
    population: Mapping[str, PopulationStats],
) -> list[FitResult]:
    results = [score_player(p, brief, population) for p in players]
    return sorted(
        results,
        key=lambda r: (r.eligible, r.fit_score if r.fit_score is not None else -1, r.confidence_score),
        reverse=True,
    )

from fastapi import APIRouter, HTTPException

from core.analytics import compute_population_stats, rank_players
from core.schemas.models import RecruitmentBrief
from core.utils.demo_data import demo_players
from apps.api.app.services.catalog import as_record, get_catalog
from core.analytics.profiles import MIN_COHORT, MIN_MINUTES

from core.schemas.analysis import FitResponse

router = APIRouter(prefix="/recruitment", tags=["recruitment"])


@router.post("/fit", response_model=FitResponse)
def real_fit(brief: RecruitmentBrief):
    dataset, mode = get_catalog()
    if len(brief.position_groups) != 1 or brief.position_groups[0] not in {
        "CB",
        "FB",
        "DM",
        "CM",
        "AM",
        "W",
        "ST",
    }:
        raise HTTPException(
            422, "Choose exactly one supported outfield position family for a comparable cohort"
        )
    unsupported = {r.metric for r in brief.requirements} - dataset["metric_catalog"].keys()
    if unsupported:
        raise HTTPException(422, f"Unsupported metrics: {', '.join(sorted(unsupported))}")
    # Eligibility constraints must not move the reference distribution or scores.
    # The tournament benchmark is always >=180 minutes; the requested minimum
    # is evaluated by score_player, alongside the other hard constraints.
    minimum = MIN_MINUTES
    cohort = [
        p
        for p in dataset["players"]
        if p["position_group"] == brief.position_groups[0] and p["minutes"] >= minimum
    ]
    if len(cohort) < MIN_COHORT:
        return {
            "brief": brief,
            "results": [],
            "population_size": len(cohort),
            "minimum_minutes": minimum,
            "requested_minimum_minutes": brief.min_minutes,
            "warning": "At least 10 comparable players required",
            "mode": mode,
            "dataset_id": dataset["manifest"]["dataset_id"],
        }
    players = [as_record(p) for p in cohort]
    observations = {
        r.metric: sum(p.metrics.get(r.metric) is not None for p in players) for r in brief.requirements
    }
    population = compute_population_stats(
        players, [r.metric for r in brief.requirements], min_observations=MIN_COHORT
    )
    results = rank_players(players, brief, population)
    minutes = {p.player_id: p.minutes for p in players}
    for result in results:
        total_weight = sum(c.weight for c in result.components)
        support = (
            sum(
                c.weight * min(observations[c.metric] / 30, 1)
                for c in result.components
                if c.normalized_score is not None
            )
            / total_weight
        )
        result.confidence_score = round(100 * support * min(minutes[result.player_id] / 900, 1), 2)
        result.warnings.append(
            "Historical tournament cohort; confidence is a heuristic evidence index, not a probability"
        )
    return {
        "brief": brief,
        "results": results,
        "population_size": len(cohort),
        "minimum_minutes": minimum,
        "requested_minimum_minutes": brief.min_minutes,
        "metric_observations": observations,
        "fit_version": "weighted-logistic-v2.1",
        "confidence_method": "Minutes factor × weighted observed requirement support; each metric needs 10 observations and reaches full peer support at 30. Missing requirement weight remains in denominator.",
        "dataset_id": dataset["manifest"]["dataset_id"],
        "mode": mode,
        "warning": "Fit measures observed role requirements only. It is not player quality or a tactical team-fit model.",
    }


@router.post("/fit/demo")
def demo_fit(brief: RecruitmentBrief):
    players = demo_players()
    metrics = sorted({r.metric for r in brief.requirements})
    population = compute_population_stats(players, metrics)
    results = rank_players(players, brief, population)
    return {
        "brief": brief,
        "population_size": len(players),
        "warning": "Synthetic demo data only. Real-data adapters are wired separately.",
        "results": results[:15],
    }

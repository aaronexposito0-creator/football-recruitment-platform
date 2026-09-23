from typing import Annotated

from core.analytics.scouting import scouting_index
from core.analytics.search import matches_player_search, search_key
from core.schemas.analysis import AdvancedSearch
from fastapi import APIRouter, HTTPException, Query

from core.analytics import player_similarity
from core.utils.demo_data import METRICS, demo_players
from core.analytics.profiles import MIN_COHORT, MIN_MINUTES, cohort_for, player_profile
from apps.api.app.services.catalog import as_record, find_player, get_catalog

from core.schemas.analysis import ProfileResponse, SearchResponse, SimilarityResponse, VisualResponse

router = APIRouter(prefix="/players", tags=["players"])

# Keep the previously accepted parameter explicit, but do not let it silently
# redefine the benchmark shared by search, briefs and published profiles.
FixedReferenceMinutes = Annotated[
    int,
    Query(
        ge=MIN_MINUTES,
        le=MIN_MINUTES,
        description="Fixed benchmark exposure (180 minutes). Filter similarity candidates with candidate_min_minutes.",
    ),
]


@router.get("", response_model=SearchResponse)
def list_players(
    q: str = Query(default="", max_length=120),
    position: str | None = None,
    team: str | None = None,
    min_minutes: int = Query(default=0, ge=0, le=20000),
    limit: int = Query(default=40, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
):
    dataset, mode = get_catalog()
    found = [
        p
        for p in dataset["players"]
        if p["minutes"] >= min_minutes
        and (not position or p["position_group"] == position)
        and (not team or p["team_name"] == team)
        and matches_player_search(p, q)
    ]
    found.sort(key=lambda p: (-p["minutes"], p["player_id"]))
    return {
        "results": found[offset : offset + limit],
        "total": len(found),
        "offset": offset,
        "limit": limit,
        "mode": mode,
        "dataset_id": dataset["manifest"]["dataset_id"],
    }


@router.get("/{player_id}/profile", response_model=ProfileResponse)
def profile(player_id: str, min_minutes: FixedReferenceMinutes = MIN_MINUTES):
    dataset, mode = get_catalog()
    return {**player_profile(find_player(player_id, dataset), dataset, min_minutes), "mode": mode}


@router.get("/{player_id}/similar", response_model=SimilarityResponse)
def similar(
    player_id: str,
    limit: int = Query(default=8, ge=1, le=200),
    min_minutes: FixedReferenceMinutes = MIN_MINUTES,
    exclude_team: str | None = None,
    candidate_min_minutes: Annotated[int, Query(ge=0, le=20000)] = 0,
    min_confidence: Annotated[float, Query(ge=0, le=100)] = 0,
):
    dataset, mode = get_catalog()
    target = find_player(player_id, dataset)
    population = cohort_for(target, dataset["players"], min_minutes)
    selected_metrics = [
        "npxg_per90",
        "xa_per90",
        "progressive_passes_per90",
        "progressive_carries_per90",
        "pass_completion",
        "pressures_per90",
        "tackles_per90",
        "turnovers_per90",
    ]
    if (
        len(population) < MIN_COHORT
        or target["minutes"] < min_minutes
        or target["position_group"] in {"GK", "UNK"}
    ):
        return {
            "target": target["player_id"],
            "results": [],
            "warning": "Insufficient comparable evidence",
            "mode": mode,
            "dataset_id": dataset["manifest"]["dataset_id"],
            "cohort_size": len(population),
        }
    result = player_similarity(
        as_record(target),
        [as_record(p) for p in population if p["player_id"] != player_id],
        selected_metrics,
        min_reference_observations=MIN_COHORT,
    )
    evidence = scouting_index(dataset) if min_confidence else {}
    identities = {p["player_id"]: p for p in population}
    filtered = [
        r
        for r in result
        if r.similarity is not None
        and identities[r.player_id]["minutes"] >= candidate_min_minutes
        and (not exclude_team or identities[r.player_id]["team_name"] != exclude_team)
        and (not min_confidence or evidence[r.player_id]["confidence"] >= min_confidence)
    ]
    return {
        "target": target["player_id"],
        "results": filtered[:limit],
        "candidate_count": len(filtered),
        "filter_note": "Candidate filters do not change the cohort scaling or pairwise similarity scores.",
        "metrics": selected_metrics,
        "method": "100 / (1 + RMS standardized distance), mutually observed nonconstant metrics with at least 10 reference observations; not quality or probability",
        "cohort_size": len(population),
        "mode": mode,
        "dataset_id": dataset["manifest"]["dataset_id"],
    }


@router.get("/demo")
def list_demo_players():
    return demo_players()


@router.get("/{player_id}/similar/demo")
def similar_demo(player_id: str, limit: int = Query(default=8, ge=1, le=30)):
    players = demo_players()
    target = next((p for p in players if p.player_id == player_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Player not found")
    candidates = [p for p in players if p.player_id != player_id]
    return {
        "target": target,
        "metrics": METRICS,
        "results": player_similarity(target, candidates, METRICS)[:limit],
    }


@router.post("/search", response_model=SearchResponse)
def advanced_search(query: AdvancedSearch):
    dataset, mode = get_catalog()
    unknown = query.percentile_floors.keys() - dataset["metric_catalog"].keys()
    if unknown or any(not 0 <= value <= 100 for value in query.percentile_floors.values()):
        raise HTTPException(
            422, "Percentile filters require supported metrics and thresholds between 0 and 100"
        )
    index = scouting_index(dataset)
    results = []
    for player in dataset["players"]:
        summary = index[player["player_id"]]
        if (
            player["minutes"] < query.min_minutes
            or query.position
            and player["position_group"] != query.position
        ):
            continue
        if query.team and player["team_name"] != query.team:
            continue
        if not matches_player_search(player, query.q):
            continue
        if summary["confidence"] < query.min_confidence or summary["data_coverage"] < query.min_coverage:
            continue
        if query.benchmark_only and not summary["eligible"]:
            continue
        if any(
            summary["percentiles"].get(key) is None or summary["percentiles"][key] < floor
            for key, floor in query.percentile_floors.items()
        ):
            continue
        results.append(player)
    order = {
        "minutes": lambda p: (-p["minutes"], p["player_id"]),
        "confidence": lambda p: (-index[p["player_id"]]["confidence"], p["player_id"]),
        "name": lambda p: (search_key(p["display_name"]), p["player_id"]),
    }
    results.sort(key=order[query.sort_by])
    return {
        "results": results[query.offset : query.offset + query.limit],
        "total": len(results),
        "offset": query.offset,
        "limit": query.limit,
        "mode": mode,
        "dataset_id": dataset["manifest"]["dataset_id"],
        "benchmark_note": "Fixed >=180 minute position cohorts. Search filters do not redefine percentiles.",
    }


@router.get("/{player_id}/visuals", response_model=VisualResponse, response_model_exclude_unset=True)
def visuals(player_id: str):
    dataset, mode = get_catalog()
    find_player(player_id, dataset)
    view = dataset.get("visual_profiles", {}).get(player_id)
    if view is None:
        raise HTTPException(503, "Spatial analysis is not built for this dataset")
    return {
        **view,
        "mode": mode,
        "source": dataset["manifest"]["source"],
        "source_revision": dataset["manifest"]["source_revision"],
        "license_url": dataset["manifest"]["license_url"],
    }

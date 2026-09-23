from fastapi import APIRouter
from core.analytics.archetypes import archetypes
from core.analytics.scouting import scouting_index

from apps.api.app.services.catalog import get_catalog

from core.schemas.analysis import CatalogResponse, CoverageResponse, MetricDefinition

router = APIRouter(prefix="/data", tags=["data"])


@router.get("/coverage", response_model=CoverageResponse)
def data_coverage():
    data, mode = get_catalog()
    return coverage_for(data, mode)


def coverage_for(data: dict, mode: str) -> dict:
    manifest = data["manifest"]
    return {
        "mode": mode,
        "dataset_id": manifest["dataset_id"],
        "source": manifest["source"],
        "competition": manifest["competition_name"],
        "season": manifest["season_name"],
        "matches_available": manifest["matches_available"],
        "matches_ingested": manifest["matches_ingested"],
        "events": manifest["events"],
        "players": manifest["players"],
        "teams": manifest["teams"],
        "coverage_pct": manifest["coverage_pct"],
        "is_partial": manifest["is_partial"],
        "date_from": manifest["date_from"],
        "date_to": manifest["date_to"],
        "source_revision": manifest["source_revision"],
        "feature_version": manifest["feature_version"],
        "license_url": manifest["license_url"],
        "usage": manifest["usage"],
        "quality": manifest["quality"],
        "scope": manifest["coverage_scope"],
    }


@router.get("/metrics", response_model=dict[str, MetricDefinition])
def metrics():
    return get_catalog()[0]["metric_catalog"]


@router.get("/catalog", response_model=CatalogResponse)
def catalog():
    data, mode = get_catalog()
    return {
        "coverage": coverage_for(data, mode),
        "players": data["players"],
        "metric_catalog": data["metric_catalog"],
        "archetypes": archetypes(),
        "scouting_index": scouting_index(data),
        "mode": mode,
    }

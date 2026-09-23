"""Public real-analysis response contracts used by FastAPI/OpenAPI.

Additional lineage fields are retained for forwards-compatible analysis exports.
All numerical fields in the analytical contract reject NaN/infinity.
"""

from typing import Literal

from pydantic import ConfigDict, Field

from core.schemas.models import FiniteModel, FitResult, RecruitmentBrief, SimilarityResult


class AnalysisModel(FiniteModel):
    model_config = ConfigDict(allow_inf_nan=False, extra="allow")


class RealPlayer(AnalysisModel):
    player_id: str
    player_name: str
    display_name: str
    team_id: str
    team_name: str
    position_group: str
    minutes: float = Field(gt=0)
    position_minutes: dict[str, float]
    appearances: int = Field(gt=0)
    competition_id: str
    season_id: str
    competition: str
    season: str
    gender: str
    dataset_id: str
    age: int | None
    preferred_foot: str | None
    metrics: dict[str, float | None]
    totals: dict[str, float | None]


class MetricDefinition(AnalysisModel):
    key: str
    names: dict[str, str]
    family: str
    definition: str
    denominator: str
    unit: str
    direction: Literal["higher", "lower"]
    version: str


class ProfileMetric(MetricDefinition):
    value: float | None
    percentile: float | None = Field(ge=0, le=100)
    favorable_percentile: float | None = Field(ge=0, le=100)
    cohort_observations: int = Field(ge=0)


class Cohort(AnalysisModel):
    size: int = Field(ge=0)
    minimum_minutes: int
    minimum_players: int
    eligible: bool
    position_group: str


class Evidence(AnalysisModel):
    data_coverage: float = Field(ge=0, le=100)
    confidence_score: float = Field(ge=0, le=100)
    confidence_method: str
    minutes: float
    events: int
    missing_context: list[str]
    warnings: list[str]
    strengths: list[str]
    review_areas: list[str]


class Lineage(AnalysisModel):
    dataset_id: str
    source: str
    source_url: str
    source_revision: str
    license_url: str
    feature_version: str


class ProfileResponse(AnalysisModel):
    player: RealPlayer
    metrics: list[ProfileMetric]
    cohort: Cohort
    evidence: Evidence
    lineage: Lineage
    mode: str
    fit_score: None
    player_quality: None


class SearchResponse(AnalysisModel):
    results: list[RealPlayer]
    total: int
    offset: int
    limit: int
    dataset_id: str
    mode: str


class SimilarityResponse(AnalysisModel):
    target: str
    results: list[SimilarityResult]
    dataset_id: str
    cohort_size: int
    mode: str


class FitResponse(AnalysisModel):
    brief: RecruitmentBrief
    minimum_minutes: int
    requested_minimum_minutes: int
    results: list[FitResult]
    population_size: int
    dataset_id: str
    mode: str
    warning: str


class CoverageResponse(AnalysisModel):
    dataset_id: str
    matches_available: int
    matches_ingested: int
    events: int
    players: int
    teams: int
    coverage_pct: float = Field(ge=0, le=100)
    is_partial: bool
    mode: str


class CatalogResponse(AnalysisModel):
    players: list[RealPlayer]
    metric_catalog: dict[str, MetricDefinition]
    coverage: CoverageResponse
    mode: str


class AdvancedSearch(AnalysisModel):
    q: str = Field(default="", max_length=120)
    position: str | None = None
    team: str | None = None
    min_minutes: int = Field(default=180, ge=0, le=20000)
    min_confidence: float = Field(default=0, ge=0, le=100)
    min_coverage: float = Field(default=0, ge=0, le=100)
    benchmark_only: bool = False
    percentile_floors: dict[str, float] = Field(default_factory=dict, max_length=5)
    sort_by: Literal["minutes", "confidence", "name"] = "minutes"
    limit: int = Field(default=40, ge=1, le=200)
    offset: int = Field(default=0, ge=0)


class SpatialCell(AnalysisModel):
    zone: int = Field(ge=0, le=23)
    count: int = Field(ge=0)
    completed: int = Field(ge=0)
    xg: float | None = Field(default=None, ge=0)


class SpatialFlow(AnalysisModel):
    from_zone: int = Field(alias="from", ge=0, le=23)
    to: int = Field(ge=0, le=23)
    count: int = Field(gt=0)


class SpatialMap(AnalysisModel):
    events: int = Field(ge=0)
    located: int = Field(ge=0)
    cells: list[SpatialCell]
    flows: list[SpatialFlow]


class SpatialMatch(AnalysisModel):
    match_id: str
    date: str
    opponent: str
    goals_for: int
    goals_against: int
    minutes: float = Field(gt=0)
    maps: dict[str, SpatialMap]


class VisualResponse(AnalysisModel):
    player_id: str
    dataset_id: str
    version: str
    maps: dict[str, SpatialMap]
    matches: list[SpatialMatch]
    incomplete_metrics: list[str]
    source: str
    source_revision: str
    license_url: str
    mode: str

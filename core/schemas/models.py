from __future__ import annotations

from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class FiniteModel(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False)


class Persona(str, Enum):
    sporting_director = "sporting_director"
    scout = "scout"
    coach = "coach"
    analyst = "analyst"
    player = "player"


class RequirementDirection(str, Enum):
    higher = "higher"
    lower = "lower"
    target = "target"


class MetricRequirement(FiniteModel):
    metric: str
    weight: float = Field(default=1.0, ge=0.0, le=10.0)
    direction: RequirementDirection = RequirementDirection.higher
    target: Optional[float] = None
    tolerance: Optional[float] = Field(default=None, gt=0)
    minimum: Optional[float] = None
    maximum: Optional[float] = None

    @model_validator(mode="after")
    def target_requires_target(self):
        if self.direction == RequirementDirection.target and self.target is None:
            raise ValueError("target direction requires target value")
        if self.minimum is not None and self.maximum is not None and self.minimum > self.maximum:
            raise ValueError("minimum exceeds maximum")
        return self


class RecruitmentBrief(FiniteModel):
    role_name: str
    position_groups: List[str] = Field(default_factory=list)
    age_min: Optional[int] = Field(default=None, ge=15, le=50)
    age_max: Optional[int] = Field(default=None, ge=15, le=50)
    min_minutes: int = Field(default=450, ge=0)
    preferred_foot: Optional[str] = None
    requirements: List[MetricRequirement] = Field(min_length=1, max_length=40)
    league_context_weight: float = Field(default=0.0, ge=0.0, le=1.0)

    @model_validator(mode="after")
    def consistent_brief(self):
        if not any(r.weight > 0 for r in self.requirements):
            raise ValueError("At least one requirement must have positive weight")
        if len({r.metric for r in self.requirements}) != len(self.requirements):
            raise ValueError("Duplicate metric requirements")
        if self.age_min is not None and self.age_max is not None and self.age_min > self.age_max:
            raise ValueError("age_min exceeds age_max")
        if self.league_context_weight:
            raise ValueError("League-strength adjustment is not implemented; use weight 0")
        return self


class PlayerRecord(FiniteModel):
    player_id: str
    player_name: str
    team_name: str
    competition: str
    season: str
    age: Optional[int] = None
    position_group: Optional[str] = None
    preferred_foot: Optional[str] = None
    minutes: float = Field(default=0.0, ge=0)
    metrics: Dict[str, Optional[float]] = Field(default_factory=dict)
    metadata: Dict[str, str | int | float | bool | None] = Field(default_factory=dict)


class FitComponent(BaseModel):
    metric: str
    observed: Optional[float]
    normalized_score: Optional[float]
    weight: float
    contribution: float
    delta_from_neutral: float = 0.0
    status: str
    explanation: str


class FitResult(BaseModel):
    player_id: str
    player_name: str
    team_name: str
    fit_score: Optional[float]
    confidence_score: float
    data_coverage: float
    eligible: bool
    components: List[FitComponent]
    reasons: List[str]
    warnings: List[str]


class SimilarityComponent(FiniteModel):
    metric: str
    target_value: Optional[float]
    candidate_value: Optional[float]
    cohort_std: Optional[float]
    cohort_observations: int = Field(ge=0)
    standardized_difference: Optional[float]
    distance_share_pct: Optional[float]
    status: str


class SimilarityResult(FiniteModel):
    player_id: str
    player_name: str
    similarity: Optional[float]
    comparable_metric_count: int
    coverage: float
    components: List[SimilarityComponent] = Field(default_factory=list)
    closest_dimensions: List[str] = Field(default_factory=list)
    largest_differences: List[str] = Field(default_factory=list)
    warning: Optional[str] = None


class DataCoverageResult(BaseModel):
    overall_coverage: float
    observed_metrics: int
    expected_metrics: int
    domain_coverage: Dict[str, float]
    missing_high_value_metrics: List[str]
    confidence_label: str

"""Bounded, source-separated club imports. Input labels are never evidence of equivalence."""

import json
from importlib.resources import files
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

from core.pipeline.metrics import DEFINITIONS
from core.schemas.models import FiniteModel

IMPORT_LIMITS = json.loads(files("core").joinpath("reference/import_limits.json").read_text(encoding="utf-8"))
PREVIEW_CELL_CHARACTERS = IMPORT_LIMITS["preview_cell_characters"]
MAPPED_CELL_CHARACTERS = IMPORT_LIMITS["mapped_cell_characters"]
Cell = Annotated[str, StringConstraints(max_length=PREVIEW_CELL_CHARACTERS)] | None
POSITIONS = ("GK", "CB", "FB", "DM", "CM", "AM", "W", "ST", "UNK")
IMPORT_FIELDS = (
    "player_name",
    "player_id",
    "team_name",
    "position_group",
    "minutes",
    "age",
    "dataset_id",
    *DEFINITIONS,
)


class ClubImport(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    headers: list[Annotated[str, StringConstraints(min_length=1, max_length=100)]] = Field(
        min_length=1, max_length=60
    )
    rows: list[list[Cell]] = Field(min_length=1, max_length=2000)
    source_rows: list[Annotated[int, Field(ge=1, le=2001, strict=True)]] | None = Field(
        default=None, max_length=2000
    )
    mapping: dict[str, str]
    decimal: Literal[".", ","] = "."
    label: str = Field(default="My Club", min_length=1, max_length=100)

    @model_validator(mode="after")
    def valid_table(self):
        if len(set(h.casefold() for h in self.headers)) != len(self.headers):
            raise ValueError("Duplicate column headers")
        if any(len(row) != len(self.headers) for row in self.rows):
            raise ValueError("Every row must have the same number of cells as the header")
        if self.source_rows is not None and (
            len(self.source_rows) != len(self.rows) or self.source_rows != sorted(set(self.source_rows))
        ):
            raise ValueError("Source row numbers must be unique, increasing and match the number of rows")
        if "player_name" not in self.mapping:
            raise ValueError("Map a player-name column before analysing")
        if any(
            field not in IMPORT_FIELDS or column not in self.headers for field, column in self.mapping.items()
        ):
            raise ValueError("Unknown mapping field or source column")
        if len(set(self.mapping.values())) != len(self.mapping):
            raise ValueError("One source column cannot represent two different fields")
        mapped_indices = [self.headers.index(column) for column in self.mapping.values()]
        if any(
            row[i] is not None and len(row[i]) > MAPPED_CELL_CHARACTERS
            for row in self.rows
            for i in mapped_indices
        ):
            raise ValueError(
                f"Mapped football fields are limited to {MAPPED_CELL_CHARACTERS} characters per cell; leave long notes unmapped"
            )
        return self


class ImportPreviewResponse(FiniteModel):
    headers: list[str]
    rows: list[list[Cell]]
    source_rows: list[int]
    suggested_mapping: dict[str, str]
    warnings: list[str]
    file_sha256: str
    row_count: int = Field(ge=1, le=2000)
    fields: list[str]
    storage: Literal["memory_only"]


class ImportBenchmark(FiniteModel):
    reference_player_id: str
    reference_name: str
    cohort_size: int
    eligible: bool
    percentiles: dict[str, float | None]


class ImportedProfile(FiniteModel):
    player_id: str
    source_player_id: str | None
    player_name: str | None
    team_name: str
    position_group: str
    minutes: float | None = Field(ge=0)
    age: float | None
    totals: dict[str, float | None]
    metrics: dict[str, float | None]
    data_coverage: float = Field(ge=0, le=100)
    confidence: float | None = Field(ge=0, le=100)
    issues: list[str]
    source_row: int
    benchmark: ImportBenchmark | None


class ImportQualityChecks(FiniteModel):
    passed: int = Field(ge=0)
    total: int = Field(ge=1)


class ClubAnalysisResponse(FiniteModel):
    import_id: str
    label: str
    players: list[ImportedProfile]
    data_quality: float = Field(ge=0, le=100)
    quality_checks: ImportQualityChecks
    data_coverage: float = Field(ge=0, le=100)
    quality_method: str
    rows_with_issues: int
    external_comparison: str
    reference_dataset_id: str
    storage: Literal["memory_only"]

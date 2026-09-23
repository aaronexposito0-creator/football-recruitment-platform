export type Language = "en" | "es" | "fr";
export type Mode =
  | "players"
  | "recruitment"
  | "compare"
  | "shortlist"
  | "squad"
  | "myClub"
  | "data";
export type Persona =
  "sporting_director" | "scout" | "coach" | "analyst" | "player";
export interface MetricDefinition {
  key: string;
  names: Record<Language, string>;
  family: string;
  definition: string;
  denominator: string;
  unit: string;
  direction: "higher" | "lower";
  version: string;
}
export interface Player {
  player_id: string;
  source_player_id: string;
  player_name: string;
  display_name: string;
  team_id: string;
  team_name: string;
  nationality: string | null;
  position_group: string;
  minutes: number;
  starts: number;
  appearances: number;
  event_count: number;
  competition: string;
  season: string;
  gender: string;
  dataset_id: string;
  competition_id: string;
  season_id: string;
  position_minutes: Record<string, number>;
  metrics: Record<string, number | null>;
  totals: Record<string, number | null>;
  quality_flags: string[];
  age: null;
  preferred_foot: null;
  match_ids: string[];
}
export interface Coverage {
  dataset_id: string;
  source: string;
  competition: string;
  season: string;
  matches_ingested: number;
  matches_available: number;
  players: number;
  events: number;
  teams: number;
  coverage_pct: number;
  is_partial: boolean;
  date_from: string;
  date_to: string;
  source_revision: string;
  feature_version: string;
  license_url: string;
  usage: string;
  quality: {
    match_id: number;
    warnings: string[];
    scoreline_reconciled: boolean;
    minutes_valid: boolean;
  }[];
}
export interface ScoutingSummary {
  data_coverage: number;
  confidence: number;
  cohort_size: number;
  eligible: boolean;
  percentiles: Record<string, number | null>;
}
export interface Archetype {
  id: string;
  position_group: string;
  names: Record<Language, string>;
  brief: Brief;
  version: string;
  evidence_note: string;
}
export interface Catalog {
  scouting_index: Record<string, ScoutingSummary>;
  archetypes: Archetype[];
  players: Player[];
  coverage: Coverage;
  metric_catalog: Record<string, MetricDefinition>;
  mode: string;
}
export interface ProfileMetric extends MetricDefinition {
  value: number | null;
  percentile: number | null;
  favorable_percentile: number | null;
  cohort_observations: number;
}
export interface Profile {
  player: Player;
  metrics: ProfileMetric[];
  mode: string;
  cohort: {
    size: number;
    minimum_minutes: number;
    minimum_players: number;
    eligible: boolean;
    position_group: string;
  };
  evidence: {
    data_coverage: number;
    confidence_score: number;
    minutes: number;
    events: number;
    missing_context: string[];
    warnings: string[];
    strengths: string[];
    review_areas: string[];
  };
  lineage: {
    dataset_id: string;
    source_revision: string;
    source_url: string;
    license_url: string;
    feature_version: string;
  };
  fit_score: null;
  player_quality: null;
}
export interface Similarity {
  target: string;
  dataset_id: string;
  results: {
    player_id: string;
    player_name: string;
    similarity: number;
    comparable_metric_count: number;
    coverage: number;
    closest_dimensions: string[];
    largest_differences: string[];
    components: {
      metric: string;
      target_value: number | null;
      candidate_value: number | null;
      cohort_std: number | null;
      cohort_observations: number;
      standardized_difference: number | null;
      distance_share_pct: number | null;
      status:
        | "compared"
        | "missing"
        | "constant_reference"
        | "insufficient_reference";
    }[];
  }[];
  warning?: string;
  cohort_size?: number;
}
export interface Requirement {
  metric: string;
  weight: number;
  direction: string;
  minimum?: number | null;
  maximum?: number | null;
  target?: number | null;
  tolerance?: number | null;
}
export interface Brief {
  role_name: string;
  position_groups: string[];
  min_minutes: number;
  requirements: Requirement[];
  age_min?: number | null;
  age_max?: number | null;
  preferred_foot?: string | null;
  league_context_weight?: number;
}
export interface Fit {
  brief: Brief;
  minimum_minutes: number;
  requested_minimum_minutes: number;
  results: {
    player_id: string;
    player_name: string;
    team_name: string;
    fit_score: number | null;
    data_coverage: number;
    confidence_score: number;
    eligible: boolean;
    reasons: string[];
    components: {
      metric: string;
      observed: number | null;
      normalized_score: number | null;
      weight: number;
      contribution: number;
      delta_from_neutral: number;
      status: string;
      explanation: string;
    }[];
  }[];
  population_size: number;
  dataset_id: string;
  mode: string;
  warning: string;
}

export type MapKind =
  | "shots"
  | "passes"
  | "progressive_passes"
  | "progressive_carries"
  | "pressures"
  | "tackles_interceptions";
export interface SpatialMap {
  events: number;
  located: number;
  cells: {
    zone: number;
    count: number;
    completed: number;
    xg?: number | null;
  }[];
  flows: { from: number; to: number; count: number }[];
}
export interface VisualProfile {
  player_id: string;
  dataset_id: string;
  version: string;
  maps: Record<MapKind, SpatialMap>;
  incomplete_metrics: string[];
  source: string;
  source_revision: string;
  license_url: string;
  matches: {
    match_id: string;
    date: string;
    opponent: string;
    goals_for: number;
    goals_against: number;
    minutes: number;
    maps: Record<MapKind, SpatialMap>;
  }[];
}

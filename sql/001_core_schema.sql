-- Canonical warehouse draft. Source-native raw tables live separately.
CREATE TABLE IF NOT EXISTS competitions (
    competition_key TEXT PRIMARY KEY,
    source_key TEXT NOT NULL,
    source_competition_id TEXT NOT NULL,
    name TEXT NOT NULL,
    country TEXT,
    gender TEXT,
    UNIQUE(source_key, source_competition_id)
);

CREATE TABLE IF NOT EXISTS seasons (
    season_key TEXT PRIMARY KEY,
    competition_key TEXT NOT NULL REFERENCES competitions(competition_key),
    source_season_id TEXT NOT NULL,
    season_name TEXT NOT NULL,
    start_date DATE,
    end_date DATE
);

CREATE TABLE IF NOT EXISTS teams (
    team_key TEXT PRIMARY KEY,
    canonical_name TEXT NOT NULL,
    country TEXT
);

CREATE TABLE IF NOT EXISTS players (
    player_key TEXT PRIMARY KEY,
    canonical_name TEXT NOT NULL,
    birth_date DATE,
    preferred_foot TEXT,
    nationality TEXT
);

CREATE TABLE IF NOT EXISTS player_source_map (
    source_key TEXT NOT NULL,
    source_player_id TEXT NOT NULL,
    player_key TEXT NOT NULL REFERENCES players(player_key),
    source_name TEXT,
    PRIMARY KEY(source_key, source_player_id)
);

CREATE TABLE IF NOT EXISTS matches (
    match_key TEXT PRIMARY KEY,
    source_key TEXT NOT NULL,
    source_match_id TEXT NOT NULL,
    competition_key TEXT,
    season_key TEXT,
    match_date TIMESTAMP,
    home_team_key TEXT,
    away_team_key TEXT,
    home_score INTEGER,
    away_score INTEGER,
    UNIQUE(source_key, source_match_id)
);

CREATE TABLE IF NOT EXISTS player_match_minutes (
    match_key TEXT NOT NULL,
    player_key TEXT NOT NULL,
    team_key TEXT NOT NULL,
    minutes NUMERIC NOT NULL,
    position_group TEXT,
    PRIMARY KEY(match_key, player_key)
);

CREATE TABLE IF NOT EXISTS events (
    event_key TEXT PRIMARY KEY,
    source_key TEXT NOT NULL,
    source_event_id TEXT NOT NULL,
    match_key TEXT NOT NULL,
    player_key TEXT,
    team_key TEXT,
    period INTEGER,
    minute INTEGER,
    second NUMERIC,
    event_type TEXT,
    x NUMERIC,
    y NUMERIC,
    end_x NUMERIC,
    end_y NUMERIC,
    outcome TEXT,
    xg NUMERIC,
    raw_payload JSON,
    UNIQUE(source_key, source_event_id)
);

CREATE TABLE IF NOT EXISTS player_season_features (
    player_key TEXT NOT NULL,
    team_key TEXT NOT NULL,
    competition_key TEXT NOT NULL,
    season_key TEXT NOT NULL,
    minutes NUMERIC NOT NULL,
    feature_version TEXT NOT NULL,
    features JSON NOT NULL,
    PRIMARY KEY(player_key, team_key, competition_key, season_key, feature_version)
);

CREATE TABLE IF NOT EXISTS user_upload_datasets (
    dataset_key TEXT PRIMARY KEY,
    owner_namespace TEXT NOT NULL,
    name TEXT NOT NULL,
    uploaded_at TIMESTAMP NOT NULL,
    schema_version TEXT NOT NULL,
    coverage_score NUMERIC,
    metadata JSON
);

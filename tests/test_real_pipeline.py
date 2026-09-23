"""Offline end-to-end contract with invented provider-shaped TEST fixtures only.

No provider raw files are shipped as tests. Arithmetic expectations are hand
calculated, independent of production aggregation and percentile functions.
"""

import copy
import json
from pathlib import Path
from types import SimpleNamespace

import pytest
from filelock import FileLock

from core.pipeline.build import ingest
from core.pipeline.cache import RepositoryCache, SourceError
from core.pipeline.canonical import key, normalize_events, normalize_roster, progressive
from core.pipeline.metrics import match_features, season_features
from core.pipeline.minutes import compute_minutes
from core.pipeline.warehouse import open_warehouse
from test_minutes import event, fixture

REVISION = "a" * 40
MATCH = {
    "match_id": 1,
    "match_date": "2024-01-01",
    "match_status": "available",
    "competition": {"competition_id": 55},
    "season": {"season_id": 282},
    "home_team": {"home_team_id": 1},
    "away_team": {"away_team_id": 2},
    "home_score": 1,
    "away_score": 0,
}


def source_fixture():
    events, lineups = fixture()
    for team in lineups:
        team["team_name"] = f"Test team {team['team_id']}"
        for player in team["lineup"]:
            player["player_name"] = f"Test player {player['player_id']}"
    events += [
        event(
            10,
            "Pass",
            time="00:01:00.000",
            pid=101,
            location=[60, 40],
            pass_ignored={},
            **{"pass": {"end_location": [100, 40], "goal_assist": True, "assisted_shot_id": "11"}},
        ),
        event(
            11,
            "Shot",
            time="00:01:01.000",
            pid=102,
            location=[100, 40],
            shot={"statsbomb_xg": 0.25, "type": {"name": "Open Play"}, "outcome": {"name": "Goal"}},
        ),
        event(12, "Pressure", time="00:01:01.000", pid=201, team=2),
    ]
    return events, lineups


def features(events=None):
    original, lineups = source_fixture()
    events = original if events is None else events
    exposure = compute_minutes(events, lineups)
    canonical = normalize_events(events, MATCH, "b" * 64)
    return match_features(canonical, events, exposure), normalize_roster(lineups)[0]


def test_event_features_count_denominators_and_no_invented_bench():
    rows, players = features()
    out = {p["player_id"]: p for p in season_features(rows, {p["player_key"]: p for p in players})}
    creator = out[key("player", 101)]
    assert creator["minutes"] == 97
    assert creator["totals"]["xa"] == 0.25
    assert creator["totals"]["assists"] == creator["totals"]["key_passes"] == 1
    assert creator["metrics"]["xa_per90"] == pytest.approx(22.5 / 97)
    assert creator["metrics"]["pass_completion"] == 100
    assert out[key("player", 102)]["metrics"]["pass_completion"] is None
    assert key("player", 112) not in out
    assert len(out) == 22


def test_weighted_exposure_not_mean_of_match_rates_and_missing_propagates():
    rows, players = features()
    first = next(r for r in rows if r["player_key"] == key("player", 101))
    second = {**copy.deepcopy(first), "minutes": 3, "xa": None, "passes": 3, "completed_passes": 1}
    second["position_seconds"] = {"CM": 180}
    result = season_features([first, second], {p["player_key"]: p for p in players})[0]
    assert result["minutes"] == 100
    assert result["metrics"]["passes_per90"] == 3.6  # (1+3)*90/(97+3)
    assert result["metrics"]["pass_completion"] == 50  # (1+1)/(1+3), not mean(100,33.3)
    assert result["metrics"]["xa_per90"] is None


@pytest.mark.parametrize("fault", ["missing_link", "other_team", "earlier_shot", "missing_xg"])
def test_invalid_shot_assist_links_withhold_xa(fault):
    events, _ = source_fixture()
    shot = next(e for e in events if e["type"]["name"] == "Shot")
    creator = next(e for e in events if e["type"]["name"] == "Pass")
    if fault == "missing_link":
        creator["pass"]["assisted_shot_id"] = "not-in-this-match"
    if fault == "other_team":
        shot.update(team={"id": 2}, player={"id": 201})
    if fault == "earlier_shot":
        shot["index"] = 9
    if fault == "missing_xg":
        shot["shot"].pop("statsbomb_xg")
    rows, _ = features(events)
    assert next(r for r in rows if r["player_key"] == key("player", 101))["xa"] is None


def test_penalties_shootouts_own_goals_and_restarts_are_distinct():
    events, _ = source_fixture()
    events += [
        event(
            20,
            "Shot",
            time="00:02:00.000",
            pid=102,
            shot={"type": {"name": "Penalty"}, "outcome": {"name": "Goal"}, "statsbomb_xg": 0.8},
        ),
        event(21, "Shot", period=5, pid=102, shot={"outcome": {"name": "Goal"}, "statsbomb_xg": 0.8}),
        event(22, "Own Goal Against", time="00:03:00.000", pid=102),
        event(
            23,
            "Pass",
            time="00:04:00.000",
            pid=101,
            location=[60, 40],
            **{"pass": {"end_location": [105, 40], "type": {"name": "Free Kick"}}},
        ),
    ]
    rows, _ = features(events)
    striker = next(r for r in rows if r["player_key"] == key("player", 102))
    assert striker["goals"] == 2 and striker["non_penalty_goals"] == 1
    assert striker["shots"] == 2 and striker["npxg"] == 0.25
    passer = next(r for r in rows if r["player_key"] == key("player", 101))
    assert passer["passes"] == 2 and passer["progressive_passes"] == 1
    assert passer["entries_into_box"] == 0


def test_uncovered_pressure_and_locations_withheld_not_zero():
    events, _ = source_fixture()
    events = [e for e in events if e["type"]["name"] != "Pressure"]
    next(e for e in events if e["type"]["name"] == "Pass").pop("location")
    rows, _ = features(events)
    assert all(r["pressures"] is None for r in rows)
    passer = next(r for r in rows if r["player_key"] == key("player", 101))
    assert passer["progressive_passes"] is None
    assert passer["entries_into_box"] is None


def test_spatial_rules_and_invalid_provider_values():
    assert progressive(60, 40, 100, 40)
    assert not progressive(60, 40, 70, 40)  # 8.75m < 10m
    assert not progressive(100, 40, 60, 40)
    events, _ = source_fixture()
    events.append(copy.deepcopy(events[0]))
    with pytest.raises(ValueError, match="Duplicate"):
        normalize_events(events, MATCH, "b" * 64)
    events, _ = source_fixture()
    next(e for e in events if e["type"]["name"] == "Shot")["shot"]["statsbomb_xg"] = float("nan")
    with pytest.raises(ValueError, match="xG"):
        normalize_events(events, MATCH, "b" * 64)


def seed(root: Path):
    events, lineups = source_fixture()
    values = {
        "data/competitions.json": [
            {
                "competition_id": 55,
                "season_id": 282,
                "competition_name": "Test cup",
                "season_name": "2024",
                "competition_gender": "male",
            }
        ],
        "data/matches/55/282.json": [MATCH, {**MATCH, "match_id": 2, "match_date": "2024-01-02"}],
    }
    for mid in (1, 2):
        values[f"data/lineups/{mid}.json"] = lineups
        values[f"data/events/{mid}.json"] = events
    session = SimpleNamespace(
        get=lambda url, **_: SimpleNamespace(
            content=json.dumps(values[url.split(REVISION + "/")[1]]).encode(), raise_for_status=lambda: None
        )
    )
    cache = RepositoryCache(root, REVISION, session=session)
    for path in values:
        cache.get_json(path)


def test_reproducible_pipeline_parquet_duckdb_atomic_and_partial(tmp_path):
    seed(tmp_path)
    partial = ingest(tmp_path, REVISION, 55, 282, offline=True, limit=1)
    assert partial["manifest"]["is_partial"] and partial["manifest"]["coverage_pct"] == 50
    full = ingest(tmp_path, REVISION, 55, 282, offline=True)
    assert not full["manifest"]["is_partial"]
    assert full["manifest"]["dataset_id"] != partial["manifest"]["dataset_id"]
    again = ingest(tmp_path, REVISION, 55, 282, offline=True, workers=1)
    assert full == again  # Same immutable artifact, including Parquet SHA-256 set
    path = tmp_path / "datasets" / full["manifest"]["dataset_id"]
    with open_warehouse(path) as db:
        assert db.execute("select count(*) from events").fetchone()[0] == 14
        assert db.execute("select sum(minutes) from player_minutes").fetchone()[0] == 22 * 194
        assert db.execute("select count(*) from player_features").fetchone()[0] == 22
    before = (tmp_path / "CURRENT.json").read_bytes()
    raw = tmp_path / "raw/statsbomb" / REVISION / "data/events/2.json"
    raw.unlink()
    with pytest.raises(SourceError, match="Offline cache miss"):
        ingest(tmp_path, REVISION, 55, 282, offline=True)
    assert (tmp_path / "CURRENT.json").read_bytes() == before
    assert not list(tmp_path.glob(".building-*"))
    with FileLock(tmp_path / ".ingest.lock"):
        with pytest.raises(RuntimeError, match="writer"):
            ingest(tmp_path, REVISION, 55, 282, offline=True)

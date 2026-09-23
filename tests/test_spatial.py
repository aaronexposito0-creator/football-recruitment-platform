import json

from core.pipeline.canonical import normalize_events
from core.pipeline.minutes import compute_minutes
from core.pipeline.spatial import combine_maps, match_spatial, publish_maps, zone
from test_real_pipeline import MATCH, source_fixture


def test_zone_grid_counts_and_open_play_flows():
    events, lineups = source_fixture()
    result = match_spatial(normalize_events(events, MATCH, "a" * 64), compute_minutes(events, lineups))
    creator = next(r for r in result if r["player_id"] == "statsbomb:player:101")
    assert creator["maps"]["passes"]["events"] == creator["maps"]["passes"]["located"] == 1
    assert creator["maps"]["passes"]["flows"] == [{"from": 15, "to": 17, "count": 1}]
    assert creator["maps"]["progressive_passes"]["events"] == 1
    combined = publish_maps(combine_maps([creator, creator]))
    assert combined["passes"]["flows"][0]["count"] == 2
    assert combined["passes"]["cells"][0] == {"zone": 15, "count": 2, "completed": 2}
    striker = next(r for r in result if r["player_id"] == "statsbomb:player:102")
    public = publish_maps(striker["maps"])
    assert public["shots"]["cells"][0] == {"zone": 17, "count": 1, "completed": 0, "xg": 0.25}
    assert "event_key" not in json.dumps(public) and "end_x" not in json.dumps(public)
    assert zone(120.1, 80.1) == 23 and zone(None, 40) is None


def test_missing_locations_are_explicit_not_assigned_to_a_zone():
    events, lineups = source_fixture()
    result = match_spatial(normalize_events(events, MATCH, "a" * 64), compute_minutes(events, lineups))
    defender = next(r for r in result if r["player_id"] == "statsbomb:player:201")
    assert defender["maps"]["pressures"]["events"] == 1
    assert defender["maps"]["pressures"]["located"] == 0
    assert defender["maps"]["pressures"]["cells"] == []

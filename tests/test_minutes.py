import pytest

from core.pipeline.minutes import MinutesError, compute_minutes


def event(index, kind, period=1, time="00:00:00.000", pid=None, team=1, **extra):
    e = {
        "id": str(index),
        "index": index,
        "type": {"name": kind},
        "period": period,
        "timestamp": time,
        "team": {"id": team},
        **extra,
    }
    if pid is not None:
        e["player"] = {"id": pid}
    return e


def fixture():
    lineups = [
        {"team_id": team, "lineup": [{"player_id": team * 100 + n} for n in range(1, 16)]} for team in (1, 2)
    ]
    events = [
        event(
            team,
            "Starting XI",
            team=team,
            tactics={
                "lineup": [{"player": {"id": team * 100 + n}, "position": {"id": 14}} for n in range(1, 12)]
            },
        )
        for team in (1, 2)
    ]
    events += [event(900, "Half End", 1, "00:47:00.000"), event(901, "Half End", 2, "00:50:00.000")]
    return events, lineups


def rows(result):
    return {r["player_id"]: r for r in result.rows}


def test_full_match_includes_stoppage_not_half_time():
    e, lineups = fixture()
    r = compute_minutes(e, lineups)
    assert rows(r)[101]["minutes"] == 97
    assert sum(x["minutes"] for x in r.rows) == 22 * 97
    assert 112 not in rows(r)


def test_halftime_substitution_preserves_first_half_added_time():
    e, lineups = fixture()
    e.append(event(20, "Substitution", 2, pid=101, substitution={"replacement": {"id": 112}}))
    r = rows(compute_minutes(e, lineups))
    assert r[101]["minutes"] == 47
    assert r[112]["minutes"] == 50
    assert not r[112]["started"]


def test_substitute_can_be_substituted_and_extra_time_counts():
    e, lineups = fixture()
    e += [
        event(20, "Substitution", 1, "00:30:30.000", 101, substitution={"replacement": {"id": 112}}),
        event(21, "Substitution", 2, "00:20:00.000", 112, substitution={"replacement": {"id": 113}}),
        event(902, "Half End", 3, "00:16:00.000"),
        event(903, "Half End", 4, "00:17:00.000"),
        event(904, "Shot", 5, "00:02:00.000", 101),
    ]
    r = rows(compute_minutes(e, lineups))
    assert r[101]["minutes"] == 30.5
    assert r[112]["minutes"] == 36.5
    assert r[113]["minutes"] == 63
    assert r[102]["minutes"] == 130


@pytest.mark.parametrize(
    "event_name,field", [("Bad Behaviour", "bad_behaviour"), ("Foul Committed", "foul_committed")]
)
@pytest.mark.parametrize("card", ["Red Card", "Second Yellow"])
def test_dismissal_reduces_team_exposure(event_name, field, card):
    e, lineups = fixture()
    e.append(event(40, event_name, 2, "00:15:00.000", 101, **{field: {"card": {"name": card}}}))
    r = compute_minutes(e, lineups)
    assert rows(r)[101]["minutes"] == 62
    assert sum(x["minutes"] for x in r.rows) == 22 * 97 - 35


def test_temporary_off_on_and_tactical_change():
    e, lineups = fixture()
    e += [
        event(10, "Player Off", 1, "00:20:00.000", 101),
        event(11, "Player On", 1, "00:22:00.000", 101),
        event(
            12,
            "Tactical Shift",
            2,
            "00:10:00.000",
            tactics={"lineup": [{"player": {"id": 101}, "position": {"id": 10}}]},
        ),
    ]
    r = rows(compute_minutes(e, lineups))[101]
    assert r["minutes"] == 95
    assert r["position_seconds"] == {"CM": 55 * 60, "DM": 40 * 60}


def test_missing_end_rejects_rather_than_guessing_90():
    e, lineups = fixture()
    e = [x for x in e if x["index"] != 901]
    e.append(event(25, "Pass", 2, "00:30:00.000", 101))
    with pytest.raises(MinutesError, match="Half End"):
        compute_minutes(e, lineups)


def test_inactive_event_fails_quality_gate():
    e, lineups = fixture()
    e.append(event(40, "Pass", 2, "00:01:00.000", 115))
    with pytest.raises(MinutesError, match="inactive"):
        compute_minutes(e, lineups)

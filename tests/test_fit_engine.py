from core.analytics.fit_engine import PopulationStats, score_player
from core.schemas.models import MetricRequirement, PlayerRecord, RecruitmentBrief, RequirementDirection


def _brief():
    return RecruitmentBrief(
        role_name="Progressive 8",
        position_groups=["CM"],
        age_max=23,
        min_minutes=900,
        requirements=[
            MetricRequirement(
                metric="progressive_passes_per90",
                weight=3,
                direction=RequirementDirection.higher,
                minimum=4.0,
            ),
            MetricRequirement(metric="pressures_per90", weight=2, direction=RequirementDirection.higher),
            MetricRequirement(metric="turnovers_per90", weight=1, direction=RequirementDirection.lower),
        ],
    )


def _population():
    return {
        "progressive_passes_per90": PopulationStats(5, 1, 3.7, 6.3),
        "pressures_per90": PopulationStats(15, 4, 10, 20),
        "turnovers_per90": PopulationStats(9, 2, 6.5, 11.5),
    }


def test_strong_profile_scores_high_and_is_eligible():
    p = PlayerRecord(
        player_id="1",
        player_name="A",
        team_name="T",
        competition="L",
        season="S",
        age=21,
        position_group="CM",
        minutes=1800,
        metrics={"progressive_passes_per90": 7, "pressures_per90": 21, "turnovers_per90": 6},
    )
    r = score_player(p, _brief(), _population())
    assert r.eligible is True
    assert r.fit_score > 75
    assert r.data_coverage == 100
    assert r.confidence_score > 90


def test_missing_metric_lowers_confidence_without_fake_imputation():
    p = PlayerRecord(
        player_id="2",
        player_name="B",
        team_name="T",
        competition="L",
        season="S",
        age=21,
        position_group="CM",
        minutes=1800,
        metrics={"progressive_passes_per90": 7, "pressures_per90": None, "turnovers_per90": 6},
    )
    r = score_player(p, _brief(), _population())
    assert r.data_coverage < 100
    assert r.confidence_score < 100
    assert any(c.status == "missing" for c in r.components)


def test_hard_constraint_marks_ineligible():
    p = PlayerRecord(
        player_id="3",
        player_name="C",
        team_name="T",
        competition="L",
        season="S",
        age=26,
        position_group="CM",
        minutes=1800,
        metrics={"progressive_passes_per90": 3, "pressures_per90": 21, "turnovers_per90": 6},
    )
    r = score_player(p, _brief(), _population())
    assert r.eligible is False
    assert r.reasons


def test_missing_hard_constraint_fails_even_without_population_stats():
    brief = RecruitmentBrief(
        role_name="Required", requirements=[MetricRequirement(metric="x", weight=1, minimum=2)]
    )
    player = PlayerRecord(player_id="x", player_name="X", team_name="T", competition="L", season="S")
    result = score_player(player, brief, {})
    assert not result.eligible and result.fit_score is None and result.confidence_score == 0
    assert result.components[0].normalized_score is None


def test_fit_independent_of_minutes_confidence_and_signed_explanation():
    import pytest

    kwargs = dict(
        player_id="a",
        player_name="A",
        team_name="T",
        competition="L",
        season="S",
        age=21,
        position_group="CM",
        metrics={"progressive_passes_per90": 7, "pressures_per90": 21, "turnovers_per90": 6},
    )
    low = score_player(PlayerRecord(**kwargs, minutes=100), _brief(), _population())
    high = score_player(PlayerRecord(**kwargs, minutes=1800), _brief(), _population())
    assert low.fit_score == high.fit_score
    assert low.confidence_score < high.confidence_score
    assert not low.eligible and high.eligible
    assert 50 + sum(c.delta_from_neutral for c in high.components) == pytest.approx(high.fit_score, abs=0.02)


def test_extreme_target_preference_is_finite_and_does_not_overflow():
    brief = RecruitmentBrief(
        role_name="Target",
        requirements=[
            MetricRequirement(
                metric="x", weight=1, direction=RequirementDirection.target, target=1e200, tolerance=1
            )
        ],
    )
    player = PlayerRecord(
        player_id="x", player_name="X", team_name="T", competition="L", season="S", metrics={"x": 0}
    )
    result = score_player(player, brief, {"x": PopulationStats(0, 1, 0, 1)})
    assert result.fit_score == 0

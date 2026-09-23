from core.analytics.similarity import player_similarity
from core.schemas.models import PlayerRecord


def p(pid, vals):
    return PlayerRecord(
        player_id=pid, player_name=pid, team_name="T", competition="L", season="S", metrics=vals
    )


def test_similarity_ranks_close_profile_first():
    metrics = ["a", "b", "c"]
    target = p("target", {"a": 10, "b": 5, "c": 8})
    close = p("close", {"a": 9.8, "b": 5.1, "c": 8.2})
    far = p("far", {"a": 1, "b": 14, "c": 0})
    out = player_similarity(target, [far, close], metrics)
    assert out[0].player_id == "close"
    assert out[0].similarity > out[1].similarity


def test_explanation_reconstructs_score_and_distance_shares():
    import math
    import pytest

    target = p("t", {"a": 1, "b": 2, "c": 3, "constant": 1})
    candidates = [
        p("x", {"a": 2, "b": 4, "c": 6, "constant": 1}),
        p("y", {"a": 10, "b": 11, "c": 12, "constant": 1}),
    ]
    result = player_similarity(target, candidates, ["a", "b", "c", "constant"])[0]
    comparable = [c for c in result.components if c.status == "compared"]
    assert len(comparable) == result.comparable_metric_count == 3
    rms = math.sqrt(sum(c.standardized_difference**2 for c in comparable) / 3)
    assert result.similarity == round(100 / (1 + rms), 2)
    assert sum(c.distance_share_pct for c in comparable) == pytest.approx(100)
    assert result.components[-1].status == "constant_reference"
    assert player_similarity(target, reversed(candidates), ["a", "b", "c", "constant"]) == player_similarity(
        target, candidates, ["a", "b", "c", "constant"]
    )


def test_missing_or_constant_evidence_never_means_perfect_similarity():
    target = p("t", {"a": 1, "b": 2, "c": 3})
    no_evidence = player_similarity(target, [p("x", {})], ["a", "b", "c"])[0]
    identical_constants = player_similarity(target, [p("x", target.metrics)], ["a", "b", "c"])[0]
    assert no_evidence.similarity is None and no_evidence.coverage == 0
    assert identical_constants.similarity is None and identical_constants.coverage == 100
    assert not identical_constants.closest_dimensions

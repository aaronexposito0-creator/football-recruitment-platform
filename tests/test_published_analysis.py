from scripts.validate_analysis import validate


def test_all_published_players_arithmetic_and_explanations():
    report = validate()
    assert report["checks"]["player_exposures"] == 493
    assert report["checks"]["rate_cells"] == report["checks"]["percentile_cells"] == 493 * 21
    assert report["players_below_180"] > 0
    assert report["players_with_missing_metrics"]

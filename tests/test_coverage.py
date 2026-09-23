from core.analytics.coverage import calculate_coverage


def test_partial_upload_reports_missing_information():
    r = calculate_coverage({"minutes": 1200, "goals_per90": 0.2, "pass_completion": 82.0})
    assert 0 < r.overall_coverage < 100
    assert r.missing_high_value_metrics
    assert r.confidence_label in {"very_limited", "limited", "medium", "high"}

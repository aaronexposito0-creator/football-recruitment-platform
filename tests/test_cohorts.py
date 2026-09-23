from core.analytics.profiles import cohort_for, percentile


def test_ties_and_small_cohorts_are_honest():
    assert percentile(2, [1, 2, 2, 3], min_size=4) == 50
    assert percentile(2, [2] * 10) == 50
    assert percentile(2, [1, 2, 3]) is None
    assert percentile(None, list(range(20))) is None


def test_cohort_never_mixes_position_season_gender_or_dataset():
    target = {
        "dataset_id": "a",
        "competition_id": "55",
        "season_id": "2024",
        "gender": "male",
        "position_group": "CM",
        "minutes": 200,
    }
    wrong = [
        {**target, field: "other"}
        for field in ("dataset_id", "competition_id", "season_id", "gender", "position_group")
    ]
    assert cohort_for(target, [target, *wrong, {**target, "minutes": 179}]) == [target]

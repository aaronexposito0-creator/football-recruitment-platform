"""Search evidence is calculated by the same profile engine, never in the UI."""

from core.analytics.profiles import player_profile


def scouting_index(dataset: dict) -> dict:
    result = {}
    for player in dataset["players"]:
        profile = player_profile(player, dataset)
        result[player["player_id"]] = {
            "data_coverage": profile["evidence"]["data_coverage"],
            "confidence": profile["evidence"]["confidence_score"],
            "cohort_size": profile["cohort"]["size"],
            "eligible": profile["cohort"]["eligible"],
            "percentiles": {m["key"]: m["favorable_percentile"] for m in profile["metrics"]},
        }
    return result

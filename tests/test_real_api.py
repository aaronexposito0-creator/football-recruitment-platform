import json
from copy import deepcopy

import pytest

from fastapi.testclient import TestClient

from apps.api.app.main import app
from apps.api.app.services.catalog import get_catalog
from core.analytics.profiles import player_profile

client = TestClient(app)


def test_readiness_requires_a_valid_research_snapshot(tmp_path, monkeypatch):
    monkeypatch.setenv("FRP_DATA_DIR", str(tmp_path))
    assert client.get("/ready").json() == {
        "status": "ready",
        "mode": "bundled_analysis",
        "players": 493,
    }
    monkeypatch.setenv("FRP_SNAPSHOT", str(tmp_path / "missing.json"))
    assert client.get("/health").status_code == 200
    response = client.get("/ready")
    assert response.status_code == 503
    assert str(tmp_path) not in response.text


def test_real_catalog_and_known_player_profile():
    catalog = client.get("/data/catalog")
    assert catalog.status_code == 200
    data = catalog.json()
    assert data["coverage"]["matches_ingested"] == 51
    assert data["coverage"]["events"] == 187924
    assert all(not p["player_name"].startswith("Demo ") for p in data["players"])
    yamal = next(p for p in data["players"] if "Yamal" in p["player_name"])
    profile = client.get(f"/players/{yamal['player_id']}/profile").json()
    assert profile["player"]["totals"]["goals"] == 1
    assert profile["player"]["appearances"] == 7
    assert profile["player"]["position_group"] == "W"
    assert profile["player"]["minutes"] > 500
    assert profile["fit_score"] is None and profile["player_quality"] is None
    assert profile["lineage"]["source_revision"]
    assert profile["evidence"]["missing_context"]


def test_bundled_analysis_works_without_warehouse(tmp_path, monkeypatch):
    monkeypatch.setenv("FRP_DATA_DIR", str(tmp_path))
    response = client.get("/data/coverage")
    assert response.status_code == 200
    assert response.json()["mode"] == "bundled_analysis"


def test_search_is_accent_insensitive_and_paginated():
    response = client.get("/players", params={"q": "fabian", "limit": 1}).json()
    assert response["total"] >= 1
    assert "Fabián" in response["results"][0]["player_name"]
    assert len(response["results"]) == 1
    assert client.get("/players/not-a-real-player/profile").status_code == 404
    assert client.get("/players", params={"min_minutes": -1}).status_code == 422


def test_localised_search_is_consistent_in_simple_and_advanced_api():
    from core.analytics.search import search_key

    assert search_key("  Łukáš   Ødegaard  ") == "lukas odegaard"
    baseline = client.get("/players", params={"q": "Spain", "limit": 100}).json()
    expected = {p["player_id"] for p in baseline["results"]}
    assert len(expected) == 25
    for query in ("España", "Espagne", "  ESPANA  "):
        simple = client.get("/players", params={"q": query, "limit": 100}).json()
        advanced = client.post("/players/search", json={"q": query, "min_minutes": 0, "limit": 100}).json()
        for response in (simple, advanced):
            assert {p["player_id"] for p in response["results"]} == expected
            assert all(p["team_name"] == "Spain" for p in response["results"])


def test_unknown_metric_and_mixed_cohort_rejected():
    brief = {
        "role_name": "Test",
        "position_groups": ["CM"],
        "requirements": [{"metric": "speed", "weight": 1}],
    }
    assert client.post("/recruitment/fit", json=brief).status_code == 422
    brief["position_groups"] = ["CM", "CB"]
    brief["requirements"][0]["metric"] = "pressures_per90"
    assert client.post("/recruitment/fit", json=brief).status_code == 422
    brief["position_groups"] = ["UNSUPPORTED"]
    assert client.post("/recruitment/fit", json=brief).status_code == 422


def test_small_fit_cohort_retains_requested_brief_and_reference_context(monkeypatch):
    from apps.api.app.routers import recruitment

    data = deepcopy(get_catalog()[0])
    data["players"] = [p for p in data["players"] if p["position_group"] == "CM" and p["minutes"] >= 180][:9]
    monkeypatch.setattr(recruitment, "get_catalog", lambda: (data, "test_small_reference"))
    brief = {
        "role_name": "Sparse reference",
        "position_groups": ["CM"],
        "min_minutes": 450,
        "requirements": [{"metric": "pressures_per90", "weight": 1}],
    }
    response = client.post("/recruitment/fit", json=brief)
    assert response.status_code == 200
    view = response.json()
    assert not view["results"] and view["population_size"] == 9
    assert view["brief"]["role_name"] == brief["role_name"]
    assert view["brief"]["requirements"][0]["weight"] == 1
    assert view["minimum_minutes"] == 180 and view["requested_minimum_minutes"] == 450
    assert view["dataset_id"] == data["manifest"]["dataset_id"]


def test_real_fit_uses_cohort_and_missing_hard_filters_do_not_pass():
    brief = {
        "role_name": "Progressor",
        "position_groups": ["CM"],
        "min_minutes": 180,
        "age_max": 23,
        "requirements": [{"metric": "progressive_passes_per90", "weight": 1}],
    }
    result = client.post("/recruitment/fit", json=brief).json()
    assert result["population_size"] >= 10
    assert result["results"]
    assert all(not r["eligible"] for r in result["results"])


def test_low_minutes_have_no_percentile_and_serialization_is_finite():
    data, _ = get_catalog()
    player = next(p for p in data["players"] if 0 < p["minutes"] < 90)
    response = client.get(f"/players/{player['player_id']}/profile")
    profile = response.json()
    assert not profile["cohort"]["eligible"]
    assert all(m["percentile"] is None for m in profile["metrics"])
    assert "NaN" not in json.dumps(profile)


def test_profile_confidence_requires_evidence_for_each_metric_not_just_a_large_cohort():
    source, _ = get_catalog()
    dataset = deepcopy(source)
    target = next(p for p in dataset["players"] if p["display_name"] == "Lamine Yamal")
    baseline = player_profile(target, dataset)
    # Keep Yamal's measurements unchanged; remove comparative shot evidence only.
    for p in dataset["players"]:
        if p["player_id"] != target["player_id"]:
            p["metrics"]["shots_per90"] = None
    changed = player_profile(target, dataset)
    assert changed["evidence"]["data_coverage"] == baseline["evidence"]["data_coverage"] == 100
    assert changed["cohort"]["size"] == baseline["cohort"]["size"] == 30
    assert next(m for m in changed["metrics"] if m["key"] == "shots_per90")["percentile"] is None
    assert changed["evidence"]["confidence_score"] == pytest.approx(
        baseline["evidence"]["confidence_score"] * 20 / 21
    )
    assert "insufficient_metric_reference" in changed["evidence"]["warnings"]
    for p in dataset["players"]:
        if p["player_id"] != target["player_id"]:
            p["metrics"] = {key: None for key in p["metrics"]}
    assert player_profile(target, dataset)["evidence"]["confidence_score"] == 0


def test_subminute_single_position_does_not_become_mixed_position_exposure():
    dataset, _ = get_catalog()
    player = next(p for p in dataset["players"] if p["player_id"] == "statsbomb:player:6941")
    assert 0 < player["minutes"] < 1 and len(player["position_minutes"]) == 1
    profile = player_profile(player, dataset)
    assert "below_minimum_minutes" in profile["evidence"]["warnings"]
    assert "mixed_position_exposure" not in profile["evidence"]["warnings"]
    assert profile["evidence"]["confidence_score"] == 0


def test_real_similarity_explanation_and_unsupported_goalkeeper():
    result = client.get("/players/statsbomb:player:316046/similar").json()
    assert result["dataset_id"] and result["cohort_size"] == 30
    assert len(result["results"]) == 8
    for similar in result["results"]:
        assert len(similar["components"]) == 8
        assert similar["closest_dimensions"] and similar["largest_differences"]
    data, _ = get_catalog()
    keeper = next(p for p in data["players"] if p["position_group"] == "GK" and p["minutes"] > 180)
    assert not client.get(f"/players/{keeper['player_id']}/similar").json()["results"]


def test_hard_metric_bounds_and_extreme_minutes_keep_lineage():
    brief = {
        "role_name": "Strict progression",
        "position_groups": ["CM"],
        "min_minutes": 180,
        "requirements": [{"metric": "progressive_passes_per90", "weight": 1, "minimum": 10000}],
    }
    result = client.post("/recruitment/fit", json=brief).json()
    assert result["results"] and all(not r["eligible"] for r in result["results"])
    assert all(r["fit_score"] is not None for r in result["results"])  # Eligibility never changes fit
    brief["min_minutes"] = 20000
    result = client.post("/recruitment/fit", json=brief).json()
    assert result["results"] and result["dataset_id"]
    assert all(not r["eligible"] for r in result["results"])
    brief["requirements"][0]["maximum"] = 1
    assert client.post("/recruitment/fit", json=brief).status_code == 422


def test_openapi_describes_real_nullable_metrics():
    schemas = client.get("/openapi.json").json()["components"]["schemas"]
    assert {"ProfileResponse", "SearchResponse", "SimilarityResponse", "FitResponse"} <= schemas.keys()
    assert "anyOf" in schemas["ProfileMetric"]["properties"]["value"]


def test_corrupt_local_catalog_does_not_silently_fall_back(tmp_path, monkeypatch):
    (tmp_path / "bad").mkdir()
    (tmp_path / "CURRENT.json").write_text(json.dumps({"relative_path": "bad"}))
    (tmp_path / "bad/analysis.json").write_text(
        json.dumps(
            {"players": [{}], "manifest": {"dataset_id": "bad", "players": 1}, "metric_catalog": {"x": {}}}
        )
    )
    monkeypatch.setenv("FRP_DATA_DIR", str(tmp_path))
    assert client.get("/data/catalog").status_code == 503


def test_catalog_detects_semantic_tampering_and_export_pins_a_single_run(tmp_path, monkeypatch):
    import copy
    from apps.api.app.services.catalog import using_catalog

    dataset, mode = get_catalog()
    altered = copy.deepcopy(dataset)
    altered["players"][0]["minutes"] += 1
    path = tmp_path / "altered.json"
    path.write_text(json.dumps(altered))
    monkeypatch.setenv("FRP_DATA_DIR", str(tmp_path))
    monkeypatch.setenv("FRP_SNAPSHOT", str(path))
    assert client.get("/data/catalog").status_code == 503
    with using_catalog(dataset, mode):
        assert get_catalog()[0] is dataset
    assert client.get("/data/catalog").status_code == 503


def test_archetypes_and_advanced_search_use_real_fixed_cohorts():
    catalog = client.get("/data/catalog").json()
    assert len(catalog["archetypes"]) == 11
    assert len(catalog["scouting_index"]) == 493
    result = client.post(
        "/players/search",
        json={
            "position": "W",
            "percentile_floors": {"npxg_per90": 75},
            "benchmark_only": True,
            "min_confidence": 40,
        },
    ).json()
    assert result["results"]
    assert any(p["player_id"] == "statsbomb:player:316046" for p in result["results"])
    for p in result["results"]:
        summary = catalog["scouting_index"][p["player_id"]]
        assert p["position_group"] == "W" and p["minutes"] >= 180
        assert summary["percentiles"]["npxg_per90"] >= 75 and summary["confidence"] >= 40
    assert (
        client.post("/players/search", json={"percentile_floors": {"invented_speed": 80}}).status_code == 422
    )
    assert client.post("/players/search", json={"percentile_floors": {"npxg_per90": 101}}).status_code == 422


def test_published_spatial_summaries_reconcile_and_are_not_event_records():
    dataset, _ = get_catalog()
    for p in dataset["players"]:
        view = dataset["visual_profiles"][p["player_id"]]
        for kind, metric in [
            ("shots", "shots"),
            ("passes", "passes"),
            ("progressive_passes", "progressive_passes"),
            ("progressive_carries", "progressive_carries"),
            ("pressures", "pressures"),
        ]:
            data = view["maps"][kind]
            if p["totals"][metric] is not None:
                assert data["events"] == p["totals"][metric]
            assert sum(c["count"] for c in data["cells"]) == data["located"] <= data["events"]
            assert sum(m["maps"][kind]["events"] for m in view["matches"]) == data["events"]
            assert all(0 <= c["zone"] < 24 for c in data["cells"])
    response = client.get("/players/statsbomb:player:316046/visuals")
    assert response.status_code == 200
    assert response.json()["maps"]["shots"]["events"] == 18
    assert len(response.json()["matches"]) == 7
    assert "event_key" not in response.text and "end_x" not in response.text


def test_replacement_filters_keep_pairwise_scores_and_reference_cohort():
    all_results = client.get("/players/statsbomb:player:316046/similar?limit=200").json()
    filtered = client.get(
        "/players/statsbomb:player:316046/similar",
        params={"limit": 200, "exclude_team": "Spain", "candidate_min_minutes": 450, "min_confidence": 40},
    ).json()
    dataset, _ = get_catalog()
    identities = {p["player_id"]: p for p in dataset["players"]}
    original = {r["player_id"]: r["similarity"] for r in all_results["results"]}
    assert filtered["cohort_size"] == all_results["cohort_size"] == 30
    assert filtered["results"]
    for result in filtered["results"]:
        p = identities[result["player_id"]]
        assert result["similarity"] == original[result["player_id"]]
        assert p["team_name"] != "Spain" and p["minutes"] >= 450


def test_public_profile_and_similarity_cannot_redefine_shared_benchmarks():
    for endpoint in ("profile", "similar"):
        url = f"/players/statsbomb:player:316046/{endpoint}"
        assert client.get(url).json() == client.get(url, params={"min_minutes": 180}).json()
        for minimum in (90, 450, 20000):
            assert client.get(url, params={"min_minutes": minimum}).status_code == 422


def test_similarity_withholds_sparse_reference_metrics_without_faking_missing_observations(monkeypatch):
    from apps.api.app.routers import players

    dataset = deepcopy(get_catalog()[0])
    peers = [p for p in dataset["players"] if p["position_group"] == "W" and p["minutes"] >= 180]
    target = next(p for p in peers if p["display_name"] == "Lamine Yamal")
    other = next(p for p in peers if p is not target)
    for player in peers:
        if player is not target and player is not other:
            player["metrics"]["npxg_per90"] = None
    monkeypatch.setattr(players, "get_catalog", lambda: (dataset, "test_incomplete"))
    response = client.get(f"/players/{target['player_id']}/similar?limit=200").json()
    result = next(r for r in response["results"] if r["player_id"] == other["player_id"])
    assert result["coverage"] == 100  # Both players have all observations.
    assert result["comparable_metric_count"] == 7  # The reference lacks one dimension.
    component = next(c for c in result["components"] if c["metric"] == "npxg_per90")
    assert component["target_value"] == target["metrics"]["npxg_per90"]
    assert component["candidate_value"] == other["metrics"]["npxg_per90"]
    assert component["status"] == "insufficient_reference"
    assert component["standardized_difference"] is None and component["cohort_std"] is None
    assert "npxg_per90" not in result["closest_dimensions"] + result["largest_differences"]
    for player in peers:
        if player is not target and player is not other:
            player["metrics"] = {key: None for key in player["metrics"]}
    assert not client.get(f"/players/{target['player_id']}/similar").json()["results"]


def test_fit_requires_ten_observations_for_each_metric(monkeypatch):
    import copy
    from apps.api.app.routers import recruitment

    data = copy.deepcopy(get_catalog()[0])
    rows = [p for p in data["players"] if p["position_group"] == "CM" and p["minutes"] >= 180]
    for p in rows[2:]:
        p["metrics"]["progressive_passes_per90"] = None
    monkeypatch.setattr(recruitment, "get_catalog", lambda: (data, "test_incomplete"))
    result = client.post(
        "/recruitment/fit",
        json={
            "role_name": "Incomplete fixture",
            "position_groups": ["CM"],
            "min_minutes": 180,
            "requirements": [{"metric": "progressive_passes_per90", "weight": 1}],
        },
    ).json()
    assert result["population_size"] >= 10
    assert result["metric_observations"]["progressive_passes_per90"] == 2
    assert all(r["fit_score"] is None and r["confidence_score"] == 0 for r in result["results"])
    with_value = next(r for r in result["results"] if r["player_id"] == rows[0]["player_id"])
    assert with_value["components"][0]["observed"] == rows[0]["metrics"]["progressive_passes_per90"]


def test_fit_minutes_constraint_changes_eligibility_not_scores_or_reference():
    brief = {
        "role_name": "Same reference",
        "position_groups": ["W"],
        "min_minutes": 180,
        "requirements": [{"metric": "npxg_per90", "weight": 1}],
    }
    baseline = client.post("/recruitment/fit", json=brief).json()
    brief["min_minutes"] = 450
    constrained = client.post("/recruitment/fit", json=brief).json()
    assert baseline["population_size"] == constrained["population_size"] == 30
    original = {p["player_id"]: p for p in baseline["results"]}
    assert any(not p["eligible"] for p in constrained["results"])
    for p in constrained["results"]:
        assert p["fit_score"] == original[p["player_id"]]["fit_score"]
        assert p["confidence_score"] == original[p["player_id"]]["confidence_score"]

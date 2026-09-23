from fastapi.testclient import TestClient
from apps.api.app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_demo_recruitment_endpoint():
    payload = {
        "role_name": "Progressive 8",
        "position_groups": ["CM"],
        "age_max": 24,
        "min_minutes": 600,
        "requirements": [
            {"metric": "progressive_passes_per90", "weight": 3, "direction": "higher"},
            {"metric": "pressures_per90", "weight": 2, "direction": "higher"},
            {"metric": "turnovers_per90", "weight": 1, "direction": "lower"},
        ],
    }
    r = client.post("/recruitment/fit/demo", json=payload)
    assert r.status_code == 200
    body = r.json()
    assert len(body["results"]) > 0
    assert "fit_score" in body["results"][0]

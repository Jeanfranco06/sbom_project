"""Pruebas de integracion de usabilidad y experimentos via API."""
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@pytest.fixture
def sample_project(tmp_path):
    (tmp_path / "requirements.txt").write_text("Flask==2.2.3\nrequests==2.20.0\n", encoding="utf-8")
    return tmp_path


def test_usability_trial_lifecycle():
    r = client.post("/api/usability/trials", json={"participant_id": "P1", "condition": "D", "triage_seconds": 45.5, "decision_correct": True})
    assert r.status_code == 201
    assert r.json()["condition"] == "D"

    r = client.get("/api/usability/trials")
    assert r.status_code == 200
    assert len(r.json()) == 1

    r = client.get("/api/usability/trials/summary")
    assert r.status_code == 200
    assert r.json()["n_trials"] == 1

    r = client.delete("/api/usability/trials")
    assert r.status_code == 204


def test_usability_trial_validation():
    r = client.post("/api/usability/trials", json={"participant_id": "P1", "condition": "X", "triage_seconds": 10})
    assert r.status_code == 422


def test_statistics_empty():
    r = client.get("/api/experiment/statistics?metric=ndcg_at_k")
    assert r.status_code == 200
    assert r.json()["comparison"] is None


def test_statistics_triage_seconds_pairs_a_d():
    # Limpiar trials previos para aislar el test
    client.delete("/api/usability/trials")
    client.post("/api/usability/trials", json={"participant_id": "P1", "condition": "A", "triage_seconds": 120.0})
    client.post("/api/usability/trials", json={"participant_id": "P2", "condition": "D", "triage_seconds": 45.0})

    r = client.get("/api/experiment/statistics?metric=triage_seconds")
    assert r.status_code == 200
    cmp = r.json()["comparison"]
    assert cmp is not None, "Debe comparar A vs D para triage_seconds"
    assert cmp["baseline_mean"] == 120.0
    assert cmp["contextual_mean"] == 45.0
    assert cmp["improvement"] < 0  # D (menor tiempo) es mejor que A


def test_run_all_benchmarks():
    r = client.post("/api/experiment/run-benchmarks")
    assert r.status_code == 200
    data = r.json()
    assert "projects_evaluated" in data
    assert "metrics" in data
    assert "ndcg_at_k" in data["metrics"]
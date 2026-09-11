"""Pruebas de integracion de la API (modo offline, sin red)."""
import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@pytest.fixture
def sample_project(tmp_path):
    (tmp_path / "requirements.txt").write_text(
        "Flask==2.2.3\nrequests==2.20.0\n# comentario\npytest>=7.0\n", encoding="utf-8"
    )
    return tmp_path


def test_health_version():
    r = client.get("/api/version")
    assert r.status_code == 200
    assert r.json()["name"] == "secsbom"


def test_projects_lifecycle(sample_project):
    r = client.post("/api/projects", json={"name": "demo", "path": str(sample_project), "environment": "staging", "data_criticality": "medium"})
    assert r.status_code == 201
    project_id = r.json()["id"]

    r = client.get("/api/projects")
    assert r.status_code == 200
    assert len(r.json()) == 1

    r = client.get(f"/api/projects/{project_id}/analysis")
    assert r.status_code == 200
    assert r.json()["analysis"] is None

    r = client.post(f"/api/projects/{project_id}/analyze")
    assert r.status_code == 200
    assert r.json()["status"] in ("running", "done", "error")

    r = client.get(f"/api/projects/{project_id}/analysis")
    assert r.status_code == 200
    data = r.json()
    assert data["analysis"]["status"] == "done"
    assert data["dependency_count"] == 3
    assert data["direct_count"] == 3
    assert "kev_finding_count" in data
    assert "patch_available_count" in data

    r = client.get(f"/api/projects/{project_id}/dependencies")
    deps = r.json()
    names = {d["name"] for d in deps}
    assert names == {"flask", "requests", "pytest"}

    r = client.get(f"/api/projects/{project_id}/sbom")
    assert r.status_code == 200
    bom = r.json()
    assert bom["bomFormat"] == "CycloneDX"
    assert len(bom["components"]) == 3

    r = client.get(f"/api/projects/{project_id}/findings")
    assert r.status_code == 200
    assert isinstance(r.json(), list)

    r = client.get(f"/api/projects/{project_id}/export?format=csv")
    assert r.status_code == 200
    assert "priority_label" in r.text

    r = client.delete(f"/api/projects/{project_id}")
    assert r.status_code == 204


def test_create_git_project_persists_repository_metadata():
    r = client.post(
        "/api/projects",
        json={
            "name": "github-project",
            "source_type": "git",
            "git_url": "https://github.com/acme/project.git",
            "git_ref": "main",
        },
    )
    assert r.status_code == 201
    data = r.json()
    assert data["source_type"] == "git"
    assert data["git_url"] == "https://github.com/acme/project.git"
    assert data["git_ref"] == "main"
    assert Path(data["path"]).name == str(data["id"])


def test_weights_validation():
    # Pesos que suman 100 -> ok
    r = client.put(
        "/api/settings/weights",
        json={"cvss": 20, "kev": 20, "epss": 15, "exposure": 15, "environment": 10, "dependency": 5, "data_criticality": 5, "remediation": 10},
    )
    assert r.status_code == 200
    # Pesos que no suman 100 -> 422
    r = client.put(
        "/api/settings/weights",
        json={"cvss": 10, "kev": 10, "epss": 10, "exposure": 10, "environment": 10, "dependency": 10, "data_criticality": 10, "remediation": 1},
    )
    assert r.status_code == 422


def test_snapshots_status():
    r = client.get("/api/snapshots/status")
    assert r.status_code == 200
    assert "mode" in r.json()

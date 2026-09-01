"""Pruebas del motor de priorizacion contextual."""
from app.config import Settings
from app.models import Dependency, Project
from app.services.prioritization import PrioritizationEngine

from app.services.cvss import cvss3_base_score


def _project(**kw) -> Project:
    base = dict(environment="production", internet_exposed=True, data_criticality="high")
    base.update(kw)
    return Project(name="p", path="/tmp", **base)


def _dep(is_direct=True, is_dev=False, **kw) -> Dependency:
    return Dependency(name="lib", version="1.0.0", is_direct=is_direct, is_dev=is_dev, depth=0, purl="pkg:pypi/lib@1.0.0", **kw)


def _candidate(**kw) -> dict:
    base = {
        "vuln_id": "CVE-2020-9999",
        "aliases": ["CVE-2020-9999"],
        "cvss_score": 9.8,
        "cvss_severity": "critical",
        "epss_score": 0.9,
        "is_kev": True,
        "patch_available": True,
    }
    base.update(kw)
    return base


def test_cvss3_base_score_known():
    assert cvss3_base_score("CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H") == 9.8
    assert cvss3_base_score("CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:L/I:N/A:N") == 4.3


def test_score_formula():
    settings = Settings()
    engine = PrioritizationEngine(settings)
    values = {
        "cvss": 0.98,
        "kev": 1.0,
        "epss": 0.9,
        "exposure": 1.0,
        "environment": 1.0,
        "dependency": 1.0,
        "data_criticality": 1.0,
        "remediation": 1.0,
    }
    score = engine.score(values)
    assert abs(score - 98.1) < 1e-6


def test_label_thresholds():
    engine = PrioritizationEngine(Settings())
    assert engine.label_for(90) == "critical"
    assert engine.label_for(65) == "high"
    assert engine.label_for(45) == "medium"
    assert engine.label_for(25) == "low"
    assert engine.label_for(5) == "info"


def test_kev_override_rule():
    engine = PrioritizationEngine(Settings())
    project = _project(environment="production", internet_exposed=True)
    dep = _dep()
    candidate = _candidate(cvss_score=5.0, is_kev=True, patch_available=False, epss_score=0.2)
    values = engine.factor_values(project, dep, candidate)
    score = engine.score(values)
    # Sin override estaria por debajo de critico (cvss bajo, epss bajo y sin parche)
    assert score < 80
    final_score, label, rules = engine.apply_exceptions(project, dep, candidate, score, engine.label_for(score))
    assert final_score >= 90
    assert label == "critical"
    assert any(r.startswith("R1") for r in rules)


def test_dev_penalty_and_reduction():
    engine = PrioritizationEngine(Settings())
    project = _project(environment="production")
    dep = _dep(is_dev=True)
    candidate = _candidate(is_kev=True, patch_available=True)
    values = engine.factor_values(project, dep, candidate)
    score = engine.score(values)
    label = engine.label_for(score)
    _, final_label, rules = engine.apply_exceptions(project, dep, candidate, score, label)
    assert final_label != label or any(r.startswith("R2") for r in rules)


def test_dependency_scope_factor():
    engine = PrioritizationEngine(Settings())
    project = _project()
    direct = engine.factor_values(project, _dep(is_direct=True), _candidate())
    transitive = engine.factor_values(project, _dep(is_direct=False), _candidate())
    assert direct["dependency"] > transitive["dependency"]
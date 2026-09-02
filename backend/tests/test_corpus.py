"""Validacion estatica del corpus experimental (Fase A).

Comprueba, sin red ni servidor, que:
  - existen exactamente los 12 casos del diseno experimental
  - cada ground_truth.json es valido (proyecto + items segun el esquema de la API)
  - cada caso es analizable por el motor de dependencias
  - cada paquete fijado tiene su fixture OSV offline
  - cada vuln_id etiquetado existe en los fixtures del caso
  - los fixtures KEV/EPSS existen y cubren los CVEs del corpus (incluidos mocks)
"""
import gzip
import json
import re
from pathlib import Path

import pytest

from app.schemas import GroundTruthItem
from app.services.dependency_analyzer import analyze_project_dir

CORPUS_DIR = Path(__file__).resolve().parents[2] / "corpus"
FIXTURES_DIR = CORPUS_DIR / "fixtures"

VALID_ENV = {"production", "staging", "development"}
VALID_CRIT = {"high", "medium", "low"}
N_CASES = 12


def _case_dirs() -> list[Path]:
    return sorted(p for p in CORPUS_DIR.glob("caso_*") if p.is_dir())


def _safe_fixture_name(name: str, version: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_.\-]", "_", f"{name}__{version}") + ".json"


def _load_ground_truth(case_dir: Path) -> dict:
    gt_file = case_dir / "ground_truth.json"
    assert gt_file.exists(), f"Falta {gt_file}"
    return json.loads(gt_file.read_text(encoding="utf-8"))


def _fixture_vuln_ids(name: str, version: str) -> set[str]:
    path = FIXTURES_DIR / "osv" / _safe_fixture_name(name, version)
    assert path.exists(), f"Falta fixture OSV para {name}=={version}"
    payload = json.loads(path.read_text(encoding="utf-8"))
    return {v.get("id", "") for v in payload.get("vulns", []) or []}


def test_corpus_tiene_12_casos():
    cases = _case_dirs()
    assert len(cases) == N_CASES, f"Se esperaban {N_CASES} casos, hay {len(cases)}"


@pytest.mark.parametrize("case_dir", _case_dirs(), ids=lambda p: p.name)
def test_ground_truth_valido(case_dir):
    payload = _load_ground_truth(case_dir)
    project = payload.get("project") or {}
    assert project.get("name"), "project.name requerido"
    assert project.get("environment") in VALID_ENV
    assert project.get("data_criticality") in VALID_CRIT
    assert isinstance(project.get("internet_exposed"), bool)
    items = payload.get("ground_truth") or []
    assert items, "ground_truth no puede estar vacio"
    for item in items:
        GroundTruthItem(**item)  # valida contra el esquema de la API


@pytest.mark.parametrize("case_dir", _case_dirs(), ids=lambda p: p.name)
def test_caso_es_analizable(case_dir):
    packages, _edges = analyze_project_dir(str(case_dir))
    assert packages, f"{case_dir.name} no produjo paquetes"
    assert all(p.version for p in packages), "Todo paquete del corpus debe tener version fijada"


@pytest.mark.parametrize("case_dir", _case_dirs(), ids=lambda p: p.name)
def test_fixtures_cubren_paquetes_y_etiquetas(case_dir):
    packages, _edges = analyze_project_dir(str(case_dir))
    case_vuln_ids: set[str] = set()
    for pkg in packages:
        case_vuln_ids |= _fixture_vuln_ids(pkg.name, pkg.version)
    payload = _load_ground_truth(case_dir)
    for item in payload["ground_truth"]:
        assert item["vuln_id"] in case_vuln_ids, (
            f"{case_dir.name}: {item['vuln_id']} no aparece en los fixtures OSV del caso"
        )


def test_fixtures_kev_y_epss():
    kev_files = sorted((FIXTURES_DIR / "kev").glob("kev_*.json"))
    epss_files = sorted((FIXTURES_DIR / "epss").glob("epss_*.csv.gz"))
    assert kev_files, "Falta fixture KEV (ejecuta scripts/build_corpus_fixtures.py)"
    assert epss_files, "Falta fixture EPSS (ejecuta scripts/build_corpus_fixtures.py)"

    kev = json.loads(kev_files[-1].read_text(encoding="utf-8"))
    kev_ids = {i.get("cveID", "") for i in kev.get("vulnerabilities", [])}
    # El caso 01 (KEV real) y los mocks (casos 02 y 06) deben estar cubiertos
    assert "CVE-2023-4863" in kev_ids
    assert "CVE-2026-99001" in kev_ids
    assert "CVE-2026-99002" in kev_ids

    with gzip.open(epss_files[-1], "rt", encoding="utf-8") as fh:
        epss_text = fh.read()
    for cve in ("CVE-2023-4863", "CVE-2023-48795", "CVE-2013-7459", "CVE-2026-99001"):
        assert cve in epss_text, f"{cve} sin score EPSS en el fixture"


def test_prioridades_esperadas_en_rango():
    for case_dir in _case_dirs():
        payload = _load_ground_truth(case_dir)
        for item in payload["ground_truth"]:
            assert item["expected_priority"] in {"critical", "high", "medium", "low", "info"}

"""Construye los fixtures offline del corpus experimental (Fase A).

Captura snapshots fechados y reproducibles de las fuentes publicas:
  - OSV  -> corpus/fixtures/osv/{paquete}__{version}.json (respuesta cruda)
  - KEV  -> corpus/fixtures/kev/kev_YYYYMMDD.json (reducido a CVEs del corpus + mocks)
  - EPSS -> corpus/fixtures/epss/epss_YYYYMMDD.csv.gz (reducido a CVEs del corpus + mocks)

Los paquetes sinteticos (mock) se documentan aqui mismo y sus entradas OSV/KEV/EPSS
se generan de forma determinista (casos 02 y 06: KEV sin parche, inexistente en PyPI real).

Uso:
    python scripts/build_corpus_fixtures.py

Re-ejecutar el script regenera los fixtures con la fecha del dia (nuevo snapshot).
"""
from __future__ import annotations

import gzip
import json
import re
import sys
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "corpus" / "fixtures"
SNAPSHOT_DATE = date.today().isoformat().replace("-", "")

# ---------------------------------------------------------------------------
# Paquetes del corpus (verdad de terreno, Fase A.1/A.2)
# ---------------------------------------------------------------------------
# Paquetes reales con vulnerabilidades objetivo
REAL_VULNERABLE = {
    "pillow": "10.0.0",        # Caso 01: CVE-2023-4863 (KEV, EPSS~1.0, parche 10.0.1)
    "werkzeug": "2.2.2",       # Casos 03/04: CVE-2023-25577 (transitiva, parche 2.2.3)
    "black": "23.1.0",         # Caso 05: CVE-2024-21503 (dev, parche 24.3.0)
    "pycrypto": "2.6.1",       # Caso 07: CVE-2013-7459 (9.8 critico, sin parche, EPSS<0.1)
    "ecdsa": "0.18.0",         # Casos 08/11: CVE-2024-23342 (7.4, sin parche)
    "urllib3": "2.0.4",        # Casos 09/12: CVE-2023-43804 (parche 2.0.6)
    "paramiko": "2.10.3",      # Caso 10: CVE-2023-48795 (5.9 medio, EPSS~0.93, parche 3.4.0)
}

# Paquetes reales sin vulnerabilidades conocidas (casos negativos / ruido controlado)
REAL_NEGATIVE = {
    "six": "1.16.0",
    "colorama": "0.4.6",
    "packaging": "24.1",
    "typing-extensions": "4.12.2",
    "platformdirs": "4.2.2",
    "zipp": "3.19.2",
    "atomicwrites": "1.4.1",
}

# Paquetes sinteticos (mock). No existen en PyPI; sus entradas se generan aqui.
# Justificacion (Fase A.1): en PyPI no existe un CVE en CISA KEV sin parche
# disponible; los casos 02 y 06 son casos limite que requieren esa combinacion.
MOCK_OSV = {
    "corpus-filexplorer": {
        "version": "1.0.0",
        "vuln": {
            "id": "MOCK-KEV-0001",
            "summary": "Ejecucion remota de codigo en corpus-filexplorer (entrada sintetica del corpus SecSBOM)",
            "details": (
                "Vulnerabilidad sintetica para el caso 02 del corpus SecSBOM: CVE en CISA KEV "
                "sin parche disponible, componente directo expuesto en produccion. "
                "No corresponde a un paquete real de PyPI."
            ),
            "aliases": ["CVE-2026-99001"],
            "modified": "2026-08-15T00:00:00Z",
            "published": "2026-08-01T00:00:00Z",
            "severity": [
                {"type": "CVSS_V3", "score": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H"}
            ],
            "affected": [
                {
                    "package": {"ecosystem": "PyPI", "name": "corpus-filexplorer"},
                    "ranges": [{"type": "ECOSYSTEM", "events": [{"introduced": "0"}]}],
                }
            ],
            "database_specific": {"synthetic": True, "corpus_case": "caso_02"},
        },
    },
    "corpus-devkit": {
        "version": "2.0.0",
        "vuln": {
            "id": "MOCK-KEV-0002",
            "summary": "Divulgacion de informacion en corpus-devkit (entrada sintetica del corpus SecSBOM)",
            "details": (
                "Vulnerabilidad sintetica para el caso 06 del corpus SecSBOM: CVE en CISA KEV "
                "sin parche, pero en dependencia exclusivamente de desarrollo (is_dev=True) "
                "en proyecto de produccion no expuesto. No corresponde a un paquete real de PyPI."
            ),
            "aliases": ["CVE-2026-99002"],
            "modified": "2026-08-15T00:00:00Z",
            "published": "2026-08-01T00:00:00Z",
            "severity": [
                {"type": "CVSS_V3", "score": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N"}
            ],
            "affected": [
                {
                    "package": {"ecosystem": "PyPI", "name": "corpus-devkit"},
                    "ranges": [{"type": "ECOSYSTEM", "events": [{"introduced": "0"}]}],
                }
            ],
            "database_specific": {"synthetic": True, "corpus_case": "caso_06"},
        },
    },
}

# Paquetes directos ficticios usados para aislar el alcance transitivo
# (casos 03, 04, 09 y 11). No existen en PyPI: su fixture es una respuesta
# vacia para que el modo offline no intente consultas en vivo.
FICTIONAL_EMPTY = {
    "corpus-webapp": "1.0.0",
    "corpus-authclient": "1.0.0",
}

# EPSS sintetico para los mocks (probabilidad alta, coherente con estar en KEV)
MOCK_EPSS = {
    "CVE-2026-99001": ("0.62000", "0.99500"),
    "CVE-2026-99002": ("0.41000", "0.98500"),
}

MOCK_KEV_ENTRIES = [
    {
        "cveID": "CVE-2026-99001",
        "vendorProject": "CorpusLab",
        "product": "filexplorer",
        "vulnerabilityName": "CorpusLab filexplorer Remote Code Execution Vulnerability",
        "dateAdded": "2026-08-15",
        "shortDescription": "Entrada sintetica del corpus SecSBOM (caso 02): KEV sin parche disponible.",
        "requiredAction": "Aplicar mitigaciones compensatorias; no existe parche del proveedor.",
        "dueDate": "2026-09-05",
        "knownRansomwareCampaignUse": "Unknown",
        "notes": "Entrada sintetica; no corresponde a un producto real.",
    },
    {
        "cveID": "CVE-2026-99002",
        "vendorProject": "CorpusLab",
        "product": "devkit",
        "vulnerabilityName": "CorpusLab devkit Information Disclosure Vulnerability",
        "dateAdded": "2026-08-15",
        "shortDescription": "Entrada sintetica del corpus SecSBOM (caso 06): KEV en dependencia de desarrollo.",
        "requiredAction": "Aplicar mitigaciones compensatorias; no existe parche del proveedor.",
        "dueDate": "2026-09-05",
        "knownRansomwareCampaignUse": "Unknown",
        "notes": "Entrada sintetica; no corresponde a un producto real.",
    },
]

OSV_QUERY_URL = "https://api.osv.dev/v1/query"
KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
EPSS_API_URL = "https://api.first.org/data/v1/epss"


def _post_json(url: str, body: dict) -> dict:
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.loads(resp.read())


def _get_json(url: str) -> dict:
    with urllib.request.urlopen(url, timeout=120) as resp:
        return json.loads(resp.read())


def _safe_name(name: str, version: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_.\-]", "_", f"{name}__{version}")


def fetch_osv(fixtures_dir: Path, packages: dict[str, str]) -> dict[str, dict]:
    """Descarga respuestas OSV crudas y las guarda como snapshot local."""
    saved: dict[str, dict] = {}
    for name, version in sorted(packages.items()):
        payload = _post_json(
            OSV_QUERY_URL,
            {"package": {"ecosystem": "PyPI", "name": name}, "version": version},
        )
        path = fixtures_dir / f"{_safe_name(name, version)}.json"
        path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        saved[f"{name}=={version}"] = payload
        print(f"  OSV {name}=={version}: {len(payload.get('vulns', []))} vulns")
    return saved


def write_mock_osv(fixtures_dir: Path) -> None:
    for name, spec in MOCK_OSV.items():
        payload = {"vulns": [spec["vuln"]]}
        path = fixtures_dir / f"{_safe_name(name, spec['version'])}.json"
        path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        print(f"  OSV (mock) {name}=={spec['version']}: 1 vuln ({spec['vuln']['id']})")
    for name, version in FICTIONAL_EMPTY.items():
        path = fixtures_dir / f"{_safe_name(name, version)}.json"
        path.write_text(json.dumps({"vulns": []}, indent=2), encoding="utf-8")
        print(f"  OSV (ficticio, vacio) {name}=={version}")


def collect_cves(osv_dir: Path) -> set[str]:
    cves: set[str] = set()
    for path in sorted(osv_dir.glob("*.json")):
        payload = json.loads(path.read_text(encoding="utf-8"))
        for vuln in payload.get("vulns", []) or []:
            for ident in [vuln.get("id", "")] + (vuln.get("aliases") or []):
                if ident.startswith("CVE-"):
                    cves.add(ident)
    return cves


def build_kev_fixture(kev_dir: Path, corpus_cves: set[str]) -> None:
    source = _get_json(KEV_URL)
    selected = [
        item for item in source.get("vulnerabilities", [])
        if (item.get("cveID") or "").upper() in corpus_cves
    ]
    selected.extend(MOCK_KEV_ENTRIES)
    payload = {
        "title": source.get("title", "CISA Known Exploited Vulnerabilities Catalog"),
        "catalogVersion": source.get("catalogVersion"),
        "dateReleased": source.get("dateReleased"),
        "count": len(selected),
        "vulnerabilities": selected,
        "corpus_note": (
            "Snapshot reducido del corpus SecSBOM: solo CVEs presentes en el corpus "
            "mas entradas sinteticas (casos 02 y 06)."
        ),
    }
    path = kev_dir / f"kev_{SNAPSHOT_DATE}.json"
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"  KEV fixture: {len(selected)} entradas -> {path.name}")


def build_epss_fixture(epss_dir: Path, corpus_cves: set[str]) -> None:
    scores: dict[str, tuple[str, str]] = {}
    cve_list = sorted(corpus_cves - set(MOCK_EPSS))
    for i in range(0, len(cve_list), 30):
        chunk = ",".join(cve_list[i:i + 30])
        data = _get_json(f"{EPSS_API_URL}?cve={chunk}")
        for item in data.get("data", []):
            scores[item["cve"]] = (item.get("epss", "0"), item.get("percentile", "0"))
    scores.update(MOCK_EPSS)

    path = epss_dir / f"epss_{SNAPSHOT_DATE}.csv.gz"
    with gzip.open(path, "wt", encoding="utf-8") as fh:
        fh.write(f"#model_version:corpus-secsbom,score_date:{date.today().isoformat()}T00:00:00Z\n")
        fh.write("cve,epss,percentile\n")
        for cve in sorted(scores):
            fh.write(f"{cve},{scores[cve][0]},{scores[cve][1]}\n")
    print(f"  EPSS fixture: {len(scores)} scores -> {path.name}")


def main() -> int:
    osv_dir = FIXTURES / "osv"
    kev_dir = FIXTURES / "kev"
    epss_dir = FIXTURES / "epss"
    for d in (osv_dir, kev_dir, epss_dir):
        d.mkdir(parents=True, exist_ok=True)

    print(f"Snapshot date: {SNAPSHOT_DATE}")
    print("[1/4] Descargando respuestas OSV (paquetes reales)...")
    fetch_osv(osv_dir, {**REAL_VULNERABLE, **REAL_NEGATIVE})

    print("[2/4] Escribiendo entradas OSV sinteticas (mock)...")
    write_mock_osv(osv_dir)

    print("[3/4] Construyendo fixture KEV reducido...")
    corpus_cves = collect_cves(osv_dir)
    build_kev_fixture(kev_dir, corpus_cves)

    print("[4/4] Construyendo fixture EPSS reducido...")
    build_epss_fixture(epss_dir, corpus_cves)

    print(f"\nFixtures listos en {FIXTURES}")
    print(f"CVEs cubiertos: {len(corpus_cves)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

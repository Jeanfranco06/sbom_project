"""Enriquecimiento de inteligencia de riesgo.

Convierte vulnerabilidades OSV crudas en candidatos de hallazgo enriquecidos con:
  - CVSS   (severidad tecnica; desde OSV o NVD)
  - EPSS   (probabilidad de explotacion, via snapshots FIRST)
  - KEV    (explotacion activa conocida, via snapshots CISA)
  - parche (disponibilidad de version fijada desde los rangos OSV)
"""
from __future__ import annotations

import re
from typing import Iterable

from .cvss import parse_cvss_score, parse_cvss_vector
from .snapshot_manager import SnapshotManager
from .vulnerability_correlator import VulnerabilityCorrelator

CVE_RE = re.compile(r"CVE-\d{4}-\d{4,}", re.IGNORECASE)


def _cve_aliases(vuln: dict) -> list[str]:
    """Identificadores de la vulnerabilidad que son CVE."""
    result = []
    for ident in [vuln.get("id", "")] + (vuln.get("aliases", []) or []):
        m = CVE_RE.search(ident)
        if m:
            cve = m.group(0).upper()
            if cve not in result:
                result.append(cve)
    return result


def _versions_from_affected(vuln: dict) -> tuple[list[str], list[str]]:
    """Extrae (versiones_fijadas, versiones_introducidas) de los rangos afectados."""
    fixed: list[str] = []
    introduced: list[str] = []
    for affected in vuln.get("affected", []) or []:
        for rng in affected.get("ranges", []) or []:
            for event in rng.get("events", []) or []:
                if "fixed" in event and event["fixed"]:
                    fixed.append(str(event["fixed"]))
                if "introduced" in event and event["introduced"]:
                    introduced.append(str(event["introduced"]))
    return sorted(set(fixed)), sorted(set(introduced))


class EnrichmentService:
    def __init__(
        self,
        snapshots: SnapshotManager,
        correlator: VulnerabilityCorrelator,
    ) -> None:
        self.snapshots = snapshots
        self.correlator = correlator
        self._kev: set[str] | None = None
        self._epss: dict[str, float] | None = None

    def _load_kev(self) -> set[str]:
        if self._kev is None:
            self._kev = self.snapshots.load_kev()
        return self._kev

    def _load_epss(self) -> dict[str, float]:
        if self._epss is None:
            self._epss = self.snapshots.load_epss()
        return self._epss

    def enrich(self, vuln: dict, mode: str | None = None) -> dict:
        """Devuelve un candidato de hallazgo enriquecido."""
        cves = _cve_aliases(vuln)
        primary = cves[0] if cves else vuln.get("id", "")

        # Severidad CVSS: primero desde OSV, luego desde NVD
        cvss_score, cvss_severity = parse_cvss_score(vuln.get("severity", []) or [])
        cvss_vector = parse_cvss_vector(vuln.get("severity", []) or [])
        if cvss_score is None and primary.startswith("CVE-"):
            cvss_score, cvss_severity = self.correlator.nvd_cvss_for(primary, mode=mode)
        if cvss_severity:
            cvss_severity = cvss_severity.lower()

        kev = self._load_kev()
        epss = self._load_epss()

        fixed, introduced = _versions_from_affected(vuln)

        candidate = {
            "vuln_id": vuln.get("id", ""),
            "aliases": vuln.get("aliases", []) or [],
            "cves": cves,
            "summary": vuln.get("summary"),
            "details": (vuln.get("details") or "").strip()[:2000] or None,
            "cvss_score": cvss_score,
            "cvss_severity": cvss_severity,
            "cvss_vector": cvss_vector,
            "epss_score": max((epss.get(c, 0.0) for c in cves), default=None),
            "is_kev": any(c in kev for c in cves),
            "patch_available": bool(fixed),
            "fixed_versions": fixed,
            "introduced_versions": introduced,
        }
        if candidate["epss_score"] is None and primary in epss:
            candidate["epss_score"] = epss[primary]
        return candidate

    def enrich_all(self, vulns: Iterable[dict]) -> list[dict]:
        return [self.enrich(v) for v in vulns]
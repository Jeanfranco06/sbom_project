"""Gestion de snapshots fechados de fuentes publicas de vulnerabilidades.

Permite el modo offline y la reproducibilidad del experimento:
  - CISA KEV   -> JSON fechado en data/snapshots/kev/kev_YYYYMMDD.json
  - FIRST EPSS -> CSV.gz fechado en data/snapshots/epss/epss_YYYYMMDD.csv.gz
  - OSV/NVD    -> cache de respuestas por paquete o CVE (data/cache)

Descarga puntual y uso local posterior (modo hibrido/offline).
"""
from __future__ import annotations

import gzip
import json
import re
from datetime import date
from pathlib import Path

import httpx

from ..config import Settings

KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
EPSS_URL = "https://epss.cyentia.com/epss_scores-current.csv.gz"


class SnapshotError(Exception):
    pass


class SnapshotManager:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.kev_dir = settings.data_dir / "snapshots" / "kev"
        self.epss_dir = settings.data_dir / "snapshots" / "epss"
        self.kev_dir.mkdir(parents=True, exist_ok=True)
        self.epss_dir.mkdir(parents=True, exist_ok=True)

    # ---------- CISA KEV ----------
    def download_kev(self) -> str:
        """Descarga el feed KEV de CISA y lo guarda con fecha de snapshot."""
        with httpx.Client(timeout=self.settings.http_timeout) as client:
            resp = client.get(KEV_URL, follow_redirects=True)
            resp.raise_for_status()
        payload = resp.json()
        stamp = date.today().isoformat().replace("-", "")
        path = self.kev_dir / f"kev_{stamp}.json"
        path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        return str(path)

    def load_kev(self) -> set[str]:
        """Carga el snapshot KEV mas reciente. Devuelve conjunto de CVE."""
        files = sorted(self.kev_dir.glob("kev_*.json"))
        if not files:
            return set()
        payload = json.loads(files[-1].read_text(encoding="utf-8"))
        cves: set[str] = set()
        for item in payload.get("vulnerabilities", []) or []:
            cve = (item.get("cveID") or "").strip().upper()
            if cve:
                cves.add(cve)
        return cves

    # ---------- FIRST EPSS ----------
    def download_epss(self) -> str:
        """Descarga el CSV.gz de EPSS y lo guarda con fecha de snapshot."""
        with httpx.Client(timeout=self.settings.http_timeout, follow_redirects=True) as client:
            resp = client.get(EPSS_URL)
            resp.raise_for_status()
        stamp = date.today().isoformat().replace("-", "")
        path = self.epss_dir / f"epss_{stamp}.csv.gz"
        path.write_bytes(resp.content)
        return str(path)

    def load_epss(self) -> dict[str, float]:
        """Carga el snapshot EPSS mas reciente. Devuelve {CVE: prob_0_1}."""
        files = sorted(self.epss_dir.glob("epss_*.csv.gz"))
        if not files:
            return {}
        result: dict[str, float] = {}
        with gzip.open(files[-1], "rt", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line or line.startswith("#") or line.lower().startswith("cve,"):
                    continue
                parts = line.split(",")
                if len(parts) >= 2:
                    cve = parts[0].upper()
                    try:
                        result[cve] = float(parts[1])
                    except ValueError:
                        continue
        return result

    # ---------- Caché OSV por paquete/version ----------
    def _osv_cache_path(self, name: str, version: str) -> Path:
        safe = re.sub(r"[^a-zA-Z0-9_.\-]", "_", f"{name}__{version}")
        return self.settings.data_dir / "cache" / "osv" / f"{safe}.json"

    def osv_cached(self, name: str, version: str) -> dict | None:
        path = self._osv_cache_path(name, version)
        if not path.exists():
            return None
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return None

    def osv_store(self, name: str, version: str, payload: dict) -> None:
        self._osv_cache_path(name, version).write_text(json.dumps(payload), encoding="utf-8")

    # ---------- Caché NVD por CVE ----------
    def _nvd_cache_path(self, cve: str) -> Path:
        return self.settings.data_dir / "cache" / "nvd" / f"{cve}.json"

    def nvd_cached(self, cve: str) -> dict | None:
        path = self._nvd_cache_path(cve)
        if not path.exists():
            return None
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            return None

    def nvd_store(self, cve: str, payload: dict) -> None:
        self._nvd_cache_path(cve).write_text(json.dumps(payload), encoding="utf-8")
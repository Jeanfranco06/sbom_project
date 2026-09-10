"""Gestion de snapshots fechados de fuentes publicas de vulnerabilidades.

Permite el modo offline y la reproducibilidad del experimento:
  - CISA KEV   -> JSON fechado en data/snapshots/kev/kev_YYYYMMDD.json
  - FIRST EPSS -> CSV.gz fechado en data/snapshots/epss/epss_YYYYMMDD.csv.gz
  - OSV/NVD    -> cache de respuestas por paquete o CVE (data/cache)

Descarga puntual y uso local posterior (modo hibrido/offline).
"""
from __future__ import annotations

import gzip
import io
import json
import logging
import re
import time
from datetime import date
from pathlib import Path
from typing import Callable

import httpx

from ..config import Settings

logger = logging.getLogger(__name__)

KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
EPSS_URL = "https://epss.cyentia.com/epss_scores-current.csv.gz"

USER_AGENT = "SecSBOM/1.0 (github.com/secsbom; research-project)"
MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 2  # segundos base para exponential backoff

ProgressCallback = Callable[[str, int, str], None]


class SnapshotError(Exception):
    pass


class SnapshotManager:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.kev_dir = settings.data_dir / "snapshots" / "kev"
        self.epss_dir = settings.data_dir / "snapshots" / "epss"
        self.kev_dir.mkdir(parents=True, exist_ok=True)
        self.epss_dir.mkdir(parents=True, exist_ok=True)

    def _make_client(self) -> httpx.Client:
        timeout = max(self.settings.http_timeout, 60.0)
        return httpx.Client(
            timeout=timeout,
            follow_redirects=True,
            headers={"User-Agent": USER_AGENT},
        )

    def _request_with_retry(
        self, client: httpx.Client, method: str, url: str,
        on_progress: ProgressCallback | None = None, **kwargs
    ) -> httpx.Response:
        last_error: Exception | None = None
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                if on_progress:
                    on_progress("downloading", 0, f"Conectando a {url}...")
                resp = client.request(method, url, **kwargs)
                if resp.status_code == 429:
                    retry_after = int(resp.headers.get("Retry-After", RETRY_BACKOFF_BASE * attempt))
                    logger.warning(
                        "Rate limited (429) en %s, reintento %d/%d en %ds",
                        url, attempt, MAX_RETRIES, retry_after,
                    )
                    if on_progress:
                        on_progress("retrying", 0, f"Rate limit, reintento {attempt}/{MAX_RETRIES}...")
                    time.sleep(retry_after)
                    continue
                resp.raise_for_status()
                return resp
            except httpx.TimeoutException as exc:
                last_error = exc
                wait = RETRY_BACKOFF_BASE ** attempt
                logger.warning(
                    "Timeout en %s, reintento %d/%d en %ds",
                    url, attempt, MAX_RETRIES, wait,
                )
                if on_progress:
                    on_progress("retrying", 0, f"Timeout, reintento {attempt}/{MAX_RETRIES}...")
                time.sleep(wait)
            except httpx.HTTPStatusError as exc:
                if exc.response.status_code >= 500:
                    last_error = exc
                    wait = RETRY_BACKOFF_BASE ** attempt
                    logger.warning(
                        "Error servidor %d en %s, reintento %d/%d en %ds",
                        exc.response.status_code, url, attempt, MAX_RETRIES, wait,
                    )
                    if on_progress:
                        on_progress("retrying", 0, f"Error {exc.response.status_code}, reintento {attempt}/{MAX_RETRIES}...")
                    time.sleep(wait)
                else:
                    raise SnapshotError(
                        f"Error HTTP {exc.response.status_code} descargando {url}: "
                        f"{exc.response.text[:200]}"
                    ) from exc
        raise SnapshotError(
            f"Fallo tras {MAX_RETRIES} reintentos descargando {url}: {last_error}"
        )

    def active_snapshots(self) -> dict[str, str | None]:
        kev_files = sorted(self.kev_dir.glob("kev_*.json"))
        epss_files = sorted(self.epss_dir.glob("epss_*.csv.gz"))
        return {
            "kev": kev_files[-1].name if kev_files else None,
            "epss": epss_files[-1].name if epss_files else None,
        }

    # ---------- CISA KEV ----------
    def download_kev(self, on_progress: ProgressCallback | None = None) -> str:
        """Descarga el feed KEV de CISA y lo guarda con fecha de snapshot."""
        logger.info("Descargando CISA KEV desde %s", KEV_URL)
        if on_progress:
            on_progress("downloading", 10, "Descargando CISA KEV...")
        with self._make_client() as client:
            resp = self._request_with_retry(client, "GET", KEV_URL, on_progress=on_progress)

        if on_progress:
            on_progress("processing", 60, "Procesando respuesta JSON...")
        try:
            payload = resp.json()
        except ValueError as exc:
            raise SnapshotError("Respuesta de CISA KEV no es JSON valido") from exc

        vulnerabilities = payload.get("vulnerabilities")
        if not isinstance(vulnerabilities, list):
            raise SnapshotError(
                "Formato KEV inesperado: campo 'vulnerabilities' no es lista"
            )

        if on_progress:
            on_progress("saving", 80, f"Guardando {len(vulnerabilities)} vulnerabilidades...")
        stamp = date.today().isoformat().replace("-", "")
        path = self.kev_dir / f"kev_{stamp}.json"
        path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        logger.info("KEV guardado: %s (%d vulnerabilidades)", path, len(vulnerabilities))
        if on_progress:
            on_progress("completed", 100, f"KEV guardado: {len(vulnerabilities)} vulnerabilidades")
        return str(path)

    def load_kev(self) -> set[str]:
        """Carga el snapshot KEV mas reciente. Devuelve conjunto de CVE."""
        files = sorted(self.kev_dir.glob("kev_*.json"))
        if not files:
            logger.debug("No hay snapshots KEV disponibles")
            return set()
        try:
            payload = json.loads(files[-1].read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as exc:
            logger.error("Error leyendo KEV %s: %s", files[-1], exc)
            return set()
        cves: set[str] = set()
        for item in payload.get("vulnerabilities", []) or []:
            cve = (item.get("cveID") or "").strip().upper()
            if cve:
                cves.add(cve)
        logger.debug("KEV cargado: %d CVEs desde %s", len(cves), files[-1].name)
        return cves

    # ---------- FIRST EPSS ----------
    def download_epss(self, on_progress: ProgressCallback | None = None) -> str:
        """Descarga el CSV.gz de EPSS y lo guarda con fecha de snapshot."""
        logger.info("Descargando FIRST EPSS desde %s", EPSS_URL)
        if on_progress:
            on_progress("downloading", 10, "Descargando FIRST EPSS...")
        with self._make_client() as client:
            resp = self._request_with_retry(client, "GET", EPSS_URL, on_progress=on_progress)

        if not resp.content:
            raise SnapshotError("Respuesta EPSS vacia")

        if on_progress:
            on_progress("processing", 60, "Validando archivo gzip...")
        try:
            with gzip.open(io.BytesIO(resp.content), "rt", encoding="utf-8") as fh:
                lines = [line.strip() for line in fh if line.strip()]
                data_lines = [l for l in lines if not l.startswith("#") and not l.lower().startswith("cve,")]
                if not data_lines:
                    raise SnapshotError("CSV.gz de EPSS no contiene datos de vulnerabilidades")
        except gzip.BadGzipFile as exc:
            raise SnapshotError("Respuesta EPSS no es un gzip valido") from exc

        if on_progress:
            on_progress("saving", 80, f"Guardando {len(data_lines)} entradas...")
        stamp = date.today().isoformat().replace("-", "")
        path = self.epss_dir / f"epss_{stamp}.csv.gz"
        path.write_bytes(resp.content)
        logger.info("EPSS guardado: %s (%d entradas)", path, len(data_lines))
        if on_progress:
            on_progress("completed", 100, f"EPSS guardado: {len(data_lines)} entradas")
        return str(path)

    def load_epss(self) -> dict[str, float]:
        """Carga el snapshot EPSS mas reciente. Devuelve {CVE: prob_0_1}."""
        files = sorted(self.epss_dir.glob("epss_*.csv.gz"))
        if not files:
            logger.debug("No hay snapshots EPSS disponibles")
            return {}
        result: dict[str, float] = {}
        try:
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
        except (gzip.BadGzipFile, OSError) as exc:
            logger.error("Error leyendo EPSS %s: %s", files[-1], exc)
            return {}
        logger.debug("EPSS cargado: %d CVEs desde %s", len(result), files[-1].name)
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

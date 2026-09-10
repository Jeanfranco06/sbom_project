"""Configuracion global de la plataforma.

Todas las rutas y parametros relevantes del sistema se concentran aqui.
Los valores sensibles o de entorno se pueden sobreescribir via variables de entorno.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

BASE_DIR = Path(os.environ.get("SECSBOM_BASE_DIR", str(Path(__file__).resolve().parents[2])))


@dataclass
class Settings:
    # Directorio raiz de datos (snapshots, base de datos, cache OSV)
    data_dir: Path = BASE_DIR / "data"
    # SQLite por defecto para evitar errores de PostgreSQL (psycopg) en Windows sin Docker.
    database_url: str = os.environ.get(
        "DATABASE_URL", "sqlite:///./secsbom.db"
    )
    # Modo de operacion: connected | hybrid | offline
    mode: str = os.environ.get("SECSBOM_MODE", "connected")
    # Timeout HTTP para consultas a OSV / NVD
    http_timeout: float = float(os.environ.get("SECSBOM_HTTP_TIMEOUT", "60"))
    # Auto-descarga de snapshots KEV/EPSS al iniciar el servidor
    auto_download_snapshots: bool = os.environ.get(
        "SECSBOM_AUTO_DOWNLOAD", "true"
    ).lower() in ("true", "1", "yes")

    # Pesos iniciales del modelo de priorizacion (suman 100). Se pueden calibrar y guardar via API.
    weights: dict = field(
        default_factory=lambda: {
            "cvss": 20,
            "kev": 25,
            "epss": 15,
            "exposure": 15,
            "environment": 10,
            "dependency": 5,
            "data_criticality": 5,
            "remediation": 5,
        }
    )
    # Umbrales para asignar la etiqueta de prioridad sobre el score 0-100.
    thresholds: dict = field(
        default_factory=lambda: {
            "critical": 80,
            "high": 60,
            "medium": 40,
            "low": 20,
        }
    )
    # Configuracion de puntajes por nivel (normalizados 0-1)
    environment_values: dict = field(
        default_factory=lambda: {
            "production": 1.0,
            "staging": 0.6,
            "development": 0.2,
        }
    )
    exposure_values: dict = field(default_factory=lambda: {"exposed": 1.0, "internal": 0.3})
    data_values: dict = field(
        default_factory=lambda: {"high": 1.0, "medium": 0.6, "low": 0.2}
    )
    dependency_values: dict = field(
        default_factory=lambda: {
            "direct": 1.0,
            "transitive": 0.5,
        }
    )
    dev_penalty: float = 0.6  # factor aplicado cuando la dependencia es solo de desarrollo
    no_patch_remediation_value: float = 0.4  # valor R cuando no hay parche disponible

    def ensure_dirs(self) -> None:
        for sub in ("snapshots", "cache/osv", "cache/nvd", "db", "uploads", "repos"):
            (self.data_dir / sub).mkdir(parents=True, exist_ok=True)


settings = Settings()

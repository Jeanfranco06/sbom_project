"""Entrypoint de la API FastAPI y del dashboard local."""
from __future__ import annotations

import logging
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from .api.routes import router
from .config import settings
from .database import init_db
from .services.snapshot_manager import SnapshotManager, SnapshotError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

APP_DIR = Path(__file__).resolve().parent
STATIC_DIR = APP_DIR / "static"
FRONTEND_BUILD_DIR = APP_DIR.parent.parent / "frontend" / "out"
settings.ensure_dirs()
init_db()

IS_DEV = os.environ.get("SECSBOM_DEV", "false").lower() in ("true", "1", "yes")
NEXTJS_PORT = int(os.environ.get("SECSBOM_NEXTJS_PORT", "3000"))


def _download_snapshots_on_startup() -> None:
    """Descarga KEV y EPSS si no existen snapshots locales."""
    if not settings.auto_download_snapshots:
        logger.info("Auto-descarga de snapshots deshabilitada (SECSBOM_AUTO_DOWNLOAD=false)")
        return

    mgr = SnapshotManager(settings)
    active = mgr.active_snapshots()

    if active["kev"] and active["epss"]:
        logger.info("Snapshots ya disponibles: KEV=%s, EPSS=%s", active["kev"], active["epss"])
        return

    if settings.mode == "offline":
        logger.info("Modo offline: omitiendo descarga de snapshots")
        return

    if not active["kev"]:
        try:
            path = mgr.download_kev()
            logger.info("KEV descargado al iniciar: %s", path)
        except SnapshotError as exc:
            logger.warning("No se pudo descargar KEV al iniciar: %s", exc)

    if not active["epss"]:
        try:
            path = mgr.download_epss()
            logger.info("EPSS descargado al iniciar: %s", path)
        except SnapshotError as exc:
            logger.warning("No se pudo descargar EPSS al iniciar: %s", exc)


_download_snapshots_on_startup()

app = FastAPI(
    title="SecSBOM - Priorizacion contextual de vulnerabilidades basada en SBOM",
    version="1.0.0",
    description=(
        "Plataforma local que transforma el inventario tecnico (SBOM) en un ranking "
        "contextual y explicable de vulnerabilidades para proyectos de software academico."
    ),
)

app.include_router(router)


if IS_DEV:
    @app.get("/", include_in_schema=False)
    def index_dev():
        return RedirectResponse(url=f"http://localhost:{NEXTJS_PORT}")

    logger.info("Modo desarrollo: redirigiendo frontend a Next.js en puerto %d", NEXTJS_PORT)
else:
    if FRONTEND_BUILD_DIR.exists():
        @app.get("/", include_in_schema=False)
        def index():
            return FileResponse(FRONTEND_BUILD_DIR / "index.html")

        app.mount("/_next", StaticFiles(directory=str(FRONTEND_BUILD_DIR / "_next")), name="nextjs-static")

        @app.get("/{full_path:path}", include_in_schema=False)
        def serve_spa(full_path: str):
            file_path = FRONTEND_BUILD_DIR / full_path
            if file_path.is_file():
                return FileResponse(file_path)
            return FileResponse(FRONTEND_BUILD_DIR / "index.html")

        logger.info("Sirviendo frontend Next.js desde %s", FRONTEND_BUILD_DIR)
    else:
        @app.get("/", include_in_schema=False)
        def index_fallback():
            return JSONResponse(
                {
                    "message": "Backend activo, pero no hay un build del frontend disponible.",
                    "development": f"Ejecuta el frontend con Next.js en http://localhost:{NEXTJS_PORT}",
                }
            )

        if STATIC_DIR.exists():
            app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
            logger.warning("Build de Next.js no encontrado en %s, usando frontend legacy", FRONTEND_BUILD_DIR)
        else:
            logger.warning(
                "No hay build de frontend ni directorio legacy en %s; se servira solo la API",
                FRONTEND_BUILD_DIR,
            )

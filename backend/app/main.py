"""Entrypoint de la API FastAPI y del dashboard local."""
from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .api.routes import router
from .config import settings
from .database import init_db

APP_DIR = Path(__file__).resolve().parent
STATIC_DIR = APP_DIR / "static"
settings.ensure_dirs()
init_db()

app = FastAPI(
    title="SecSBOM - Priorizacion contextual de vulnerabilidades basada en SBOM",
    version="1.0.0",
    description=(
        "Plataforma local que transforma el inventario tecnico (SBOM) en un ranking "
        "contextual y explicable de vulnerabilidades para proyectos de software academico."
    ),
)

app.include_router(router)


@app.get("/", include_in_schema=False)
def index():
    return FileResponse(STATIC_DIR / "index.html")


app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
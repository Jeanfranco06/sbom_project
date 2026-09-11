"""Conexion y sesion con la base de datos (SQLAlchemy 2.x)."""
from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings


class Base(DeclarativeBase):
    pass


engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {},
    pool_pre_ping=True,
    **({"pool_size": 10, "max_overflow": 20} if not settings.database_url.startswith("sqlite") else {}),
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    # Importar modelos para registrar tablas antes de create_all
    from . import models  # noqa: F401

    settings.ensure_dirs()
    Base.metadata.create_all(bind=engine)
    _migrate_schema()
    _recover_interrupted_analyses()


def _recover_interrupted_analyses() -> None:
    """Libera análisis que quedaron en running tras reiniciar el servidor."""
    from .models import Analysis

    with SessionLocal.begin() as session:
        session.query(Analysis).filter(Analysis.status == "running").update(
            {
                Analysis.status: "error",
                Analysis.error: "Análisis interrumpido al reiniciar el servidor; ejecuta un nuevo análisis.",
            },
            synchronize_session=False,
        )


def _migrate_schema() -> None:
    """Add columns introduced after an existing database was created.

    ``create_all`` does not alter existing tables, so a local database created
    by an earlier version can otherwise fail as soon as SQLAlchemy selects a
    newly added ORM column.
    """
    if settings.database_url.startswith("sqlite"):
        _migrate_sqlite_schema()
    else:
        with engine.begin() as connection:
            connection.execute(text("ALTER TABLE projects ADD COLUMN IF NOT EXISTS git_ref VARCHAR(255)"))
            connection.execute(text("ALTER TABLE analyses ADD COLUMN IF NOT EXISTS source_commit VARCHAR(40)"))


def _migrate_sqlite_schema() -> None:
    """Add columns introduced after an existing SQLite database was created."""

    inspector = inspect(engine)
    if "projects" not in inspector.get_table_names():
        return

    existing = {column["name"] for column in inspector.get_columns("projects")}
    missing_columns = {
        "source_type": "VARCHAR(32) NOT NULL DEFAULT 'local'",
        "git_url": "VARCHAR(1024)",
        "git_ref": "VARCHAR(255)",
        "environment": "VARCHAR(32) NOT NULL DEFAULT 'production'",
        "internet_exposed": "BOOLEAN NOT NULL DEFAULT 1",
        "data_criticality": "VARCHAR(16) NOT NULL DEFAULT 'medium'",
    }

    with engine.begin() as connection:
        for name, definition in missing_columns.items():
            if name not in existing:
                connection.execute(text(f"ALTER TABLE projects ADD COLUMN {name} {definition}"))

    if "analyses" in inspector.get_table_names():
        existing_analysis = {column["name"] for column in inspector.get_columns("analyses")}
        if "source_commit" not in existing_analysis:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE analyses ADD COLUMN source_commit VARCHAR(40)"))

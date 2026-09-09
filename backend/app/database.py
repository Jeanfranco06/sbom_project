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
    _migrate_sqlite_schema()


def _migrate_sqlite_schema() -> None:
    """Add columns introduced after an existing SQLite database was created.

    ``create_all`` does not alter existing tables, so a local database created
    by an earlier version can otherwise fail as soon as SQLAlchemy selects a
    newly added ORM column.
    """
    if not settings.database_url.startswith("sqlite"):
        return

    inspector = inspect(engine)
    if "projects" not in inspector.get_table_names():
        return

    existing = {column["name"] for column in inspector.get_columns("projects")}
    missing_columns = {
        "source_type": "VARCHAR(32) NOT NULL DEFAULT 'local'",
        "git_url": "VARCHAR(1024)",
        "environment": "VARCHAR(32) NOT NULL DEFAULT 'production'",
        "internet_exposed": "BOOLEAN NOT NULL DEFAULT 1",
        "data_criticality": "VARCHAR(16) NOT NULL DEFAULT 'medium'",
    }

    with engine.begin() as connection:
        for name, definition in missing_columns.items():
            if name not in existing:
                connection.execute(text(f"ALTER TABLE projects ADD COLUMN {name} {definition}"))

"""Modelos ORM de la plataforma.

Persistencia local de proyectos, analisis, dependencias, hallazgos y
explicaciones generadas por el motor de priorizacion.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship


def _now() -> datetime:
    return datetime.now(timezone.utc)


from .database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    path: Mapped[str] = mapped_column(String(1024))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Perfil de contexto definido por el usuario
    environment: Mapped[str] = mapped_column(String(32), default="production")  # production|staging|development
    internet_exposed: Mapped[bool] = mapped_column(Boolean, default=True)
    data_criticality: Mapped[str] = mapped_column(String(16), default="medium")  # high|medium|low

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    last_analysis_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    dependencies: Mapped[list["Dependency"]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )
    analyses: Mapped[list["Analysis"]] = relationship(back_populates="project", cascade="all, delete-orphan")


class Analysis(Base):
    __tablename__ = "analyses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    mode: Mapped[str] = mapped_column(String(32), default="connected")
    status: Mapped[str] = mapped_column(String(32), default="pending")  # pending|running|done|error
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    manifest_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    snapshot_metadata: Mapped[str] = mapped_column(Text, default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    project: Mapped[Project] = relationship(back_populates="analyses")


class Dependency(Base):
    __tablename__ = "dependencies"
    __table_args__ = (UniqueConstraint("project_id", "name", "version", name="uq_dep"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255), index=True)
    version: Mapped[str] = mapped_column(String(128))
    # True si es dependencia directa declarada; False si es transitiva
    is_direct: Mapped[bool] = mapped_column(Boolean, default=False)
    # True si pertenece a un grupo de desarrollo (dev)
    is_dev: Mapped[bool] = mapped_column(Boolean, default=False)
    # Categoria segun el lockfile: main|dev|optional
    category: Mapped[str] = mapped_column(String(32), default="main")
    # Profundidad en el grafo de dependencias (0 = directa)
    depth: Mapped[int] = mapped_column(Integer, default=0)
    purl: Mapped[str] = mapped_column(String(512))
    requirement_type: Mapped[str] = mapped_column(String(16), default="prod")  # prod|dev
    # Origen: requirements.txt | poetry.lock | Pipfile.lock
    source: Mapped[str] = mapped_column(String(64), default="manifest")
    ecosystem: Mapped[str] = mapped_column(String(32), default="PyPI")

    project: Mapped[Project] = relationship(back_populates="dependencies")
    findings: Mapped[list["Finding"]] = relationship(back_populates="dependency", cascade="all, delete-orphan")
    edges_from: Mapped[list["DependencyEdge"]] = relationship(
        back_populates="source", cascade="all, delete-orphan", foreign_keys="DependencyEdge.source_id"
    )
    edges_to: Mapped[list["DependencyEdge"]] = relationship(
        back_populates="target", cascade="all, delete-orphan", foreign_keys="DependencyEdge.target_id"
    )


class DependencyEdge(Base):
    __tablename__ = "dependency_edges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    source_id: Mapped[int] = mapped_column(ForeignKey("dependencies.id", ondelete="CASCADE"))
    target_id: Mapped[int] = mapped_column(ForeignKey("dependencies.id", ondelete="CASCADE"))

    source: Mapped[Dependency] = relationship(back_populates="edges_from", foreign_keys=[source_id])
    target: Mapped[Dependency] = relationship(back_populates="edges_to", foreign_keys=[target_id])


class Finding(Base):
    __tablename__ = "findings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    dependency_id: Mapped[int] = mapped_column(ForeignKey("dependencies.id", ondelete="CASCADE"), index=True)
    vuln_id: Mapped[str] = mapped_column(String(128), index=True)  # OSV id o CVE
    source: Mapped[str] = mapped_column(String(64), default="osv")  # osv|nvd
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    aliases: Mapped[str] = mapped_column(Text, default="[]")  # JSON list

    # Enriquecimiento
    cvss_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    cvss_severity: Mapped[str | None] = mapped_column(String(32), nullable=True)
    epss_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_kev: Mapped[bool] = mapped_column(Boolean, default=False)
    patch_available: Mapped[bool] = mapped_column(Boolean, default=False)
    fixed_versions: Mapped[str] = mapped_column(Text, default="[]")  # JSON list
    introduced_versions: Mapped[str] = mapped_column(Text, default="[]")  # JSON list

    # Priorizacion y explicabilidad
    priority_score: Mapped[float] = mapped_column(Float, default=0.0)
    priority_label: Mapped[str] = mapped_column(String(16), default="info")  # critical|high|medium|low|info
    factors: Mapped[str] = mapped_column(Text, default="{}")  # JSON detalle por factor
    explanation: Mapped[str] = mapped_column(Text, default="{}")  # JSON explicacion trazable
    rules_applied: Mapped[str] = mapped_column(Text, default="[]")  # JSON reglas de excepcion aplicadas

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    dependency: Mapped[Dependency] = relationship(back_populates="findings")


class GroundTruth(Base):
    """Verdad de terreno (etiquetado de expertos) para evaluar el ranking."""

    __tablename__ = "ground_truth"
    __table_args__ = (UniqueConstraint("project_id", "vuln_id", name="uq_ground_truth"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    vuln_id: Mapped[str] = mapped_column(String(128))
    component: Mapped[str] = mapped_column(String(255), default="")
    installed_version: Mapped[str] = mapped_column(String(128), default="")
    is_direct_dependency: Mapped[bool] = mapped_column(Boolean, default=False)
    environment: Mapped[str] = mapped_column(String(32), default="production")
    internet_exposed: Mapped[bool] = mapped_column(Boolean, default=True)
    data_criticality: Mapped[str] = mapped_column(String(16), default="medium")
    patch_available: Mapped[bool] = mapped_column(Boolean, default=True)
    expected_priority: Mapped[str] = mapped_column(String(16), default="medium")
    justification: Mapped[str | None] = mapped_column(Text, nullable=True)


class UsabilityTrial(Base):
    """Resultado de una prueba de usabilidad (participante + condicion).

    Condiciones del diseno experimental (seccion 14.1):
      A - Baseline        : CVE, paquete, version, CVSS
      D - Propuesta explicable : + evidencia, justificacion y recomendacion

    Registra tiempo de triage, exactitud de decision y usabilidad percibida.
    """

    __tablename__ = "usability_trials"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    participant_id: Mapped[str] = mapped_column(String(128), index=True)
    condition: Mapped[str] = mapped_column(String(4))  # A | B | C | D
    scenario: Mapped[str] = mapped_column(String(128), default="")
    project_id: Mapped[int | None] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True
    )
    # Tiempo de triage en segundos (medido por cronometraje)
    triage_seconds: Mapped[float] = mapped_column(Float)
    # Exactitud de la decision elegida (1 = coincide con la rubrica de expertos)
    decision_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    # Usabilidad percibida por la tarea de la condicion (crucial para condicion D)
    sus_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Utilidad percibida (escala Likert 1-5)
    usefulness_rating: Mapped[float | None] = mapped_column(Float, nullable=True)
    # Cuestionario Likert + comprension post-tarea (JSON)
    comprehension_answers: Mapped[str] = mapped_column(Text, default="{}")
    # Respuesta breve: accion de remediacion elegida
    chosen_action: Mapped[str | None] = mapped_column(Text, nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class ExperimentRun(Base):
    """Ejecucion de una condicion del experimento sobre un proyecto.

    Permite reanalizar el mismo proyecto bajo distintas condiciones
    (A, B, C, D) para comparar metricas de ranking sobre el mismo corpus.
    """

    __tablename__ = "experiment_runs"
    __table_args__ = (UniqueConstraint("project_id", "condition", name="uq_experiment_run"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), index=True)
    condition: Mapped[str] = mapped_column(String(4))  # A | B | C | D
    mode: Mapped[str] = mapped_column(String(32), default="offline")
    analysis_id: Mapped[int | None] = mapped_column(ForeignKey("analyses.id", ondelete="CASCADE"), nullable=True)
    metrics_snapshot: Mapped[str] = mapped_column(Text, default="{}")  # JSON metricas
    findings_snapshot: Mapped[str] = mapped_column(Text, default="[]")  # JSON lista de hallazgos
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Setting(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str] = mapped_column(Text, default="{}")

    @classmethod
    def get(cls, db, key: str, default=None):
        row = db.get(cls, key)
        if row is None:
            return default
        try:
            return json.loads(row.value)
        except json.JSONDecodeError:
            return row.value

    @classmethod
    def set(cls, db, key: str, value) -> None:
        row = db.get(cls, key)
        payload = json.dumps(value)
        if row is None:
            db.add(cls(key=key, value=payload))
        else:
            row.value = payload
        db.commit()
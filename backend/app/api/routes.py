"""Rutas de la API REST."""
from __future__ import annotations

import json
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session, selectinload

from ..config import settings
from ..database import get_db
from ..models import Analysis, Dependency, DependencyEdge, ExperimentRun, Finding, GroundTruth, Project, Setting, UsabilityTrial
from ..schemas import (
    AnalysisOut,
    DependencyOut,
    ExperimentRunCreate,
    FindingOut,
    GroundTruthItem,
    ProjectCreate,
    ProjectOut,
    ProjectUpdate,
    SettingsOut,
    SnapshotDownloadResult,
    StatisticsRequest,
    UsabilityTrialCreate,
    WeightsUpdate,
    ThresholdsUpdate,
)
from ..services.analysis_service import AnalysisService, summary_for, to_finding_dict
from ..services.dependency_analyzer import DependencyAnalysisError
from ..services.metrics import metrics_for
from ..services.report_generator import export_csv, export_json, export_pdf
from ..services.sbom_generator import generate_cyclonedx_json
from ..services.snapshot_manager import SnapshotManager
from ..services.statistics import aggregate_experiment, compare_metrics_pairs, wilcoxon_signed_rank, cohen_d
from ..services.usability import build_triage_scenario, experience_summary

router = APIRouter(prefix="/api")
DbDep = Annotated[Session, Depends(get_db)]


def _get_project_or_404(db: DbDep, project_id: int) -> Project:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Proyecto no encontrado")
    return project


# ---------------- Proyectos ----------------
@router.post("/projects", response_model=ProjectOut, status_code=201)
def create_project(payload: ProjectCreate, db: DbDep):
    if payload.environment not in ("production", "staging", "development"):
        raise HTTPException(status_code=422, detail="environment invalido")
    if payload.data_criticality not in ("high", "medium", "low"):
        raise HTTPException(status_code=422, detail="data_criticality invalido")
    exists = db.query(Project).filter_by(name=payload.name).first()
    if exists:
        raise HTTPException(status_code=409, detail="Ya existe un proyecto con ese nombre")
    project = Project(**payload.model_dump())
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/projects", response_model=list[ProjectOut])
def list_projects(db: DbDep):
    return db.query(Project).order_by(Project.id.desc()).all()


@router.get("/projects/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, db: DbDep):
    return _get_project_or_404(db, project_id)


@router.patch("/projects/{project_id}", response_model=ProjectOut)
def update_project(project_id: int, payload: ProjectUpdate, db: DbDep):
    project = _get_project_or_404(db, project_id)
    data = payload.model_dump(exclude_unset=True)
    if "environment" in data and data["environment"] not in ("production", "staging", "development"):
        raise HTTPException(status_code=422, detail="environment invalido")
    if "data_criticality" in data and data["data_criticality"] not in ("high", "medium", "low"):
        raise HTTPException(status_code=422, detail="data_criticality invalido")
    for key, value in data.items():
        setattr(project, key, value)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/projects/{project_id}", status_code=204)
def delete_project(project_id: int, db: DbDep):
    project = _get_project_or_404(db, project_id)
    db.delete(project)
    db.commit()
    return Response(status_code=204)


# ---------------- Analisis ----------------
@router.post("/projects/{project_id}/analyze", response_model=AnalysisOut)
def analyze_project(project_id: int, db: DbDep, mode: Optional[str] = Query(default=None)):
    _get_project_or_404(db, project_id)
    if mode not in (None, "connected", "hybrid", "offline"):
        raise HTTPException(status_code=422, detail="modo invalido")
    service = AnalysisService(db)
    try:
        analysis = service.analyze(project_id, mode)
    except DependencyAnalysisError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    return analysis


@router.get("/projects/{project_id}/analysis")
def project_analysis(project_id: int, db: DbDep):
    _get_project_or_404(db, project_id)
    analysis = (
        db.query(Analysis).filter_by(project_id=project_id).order_by(Analysis.id.desc()).first()
    )
    project = db.get(Project, project_id)
    if analysis is None:
        raise HTTPException(status_code=404, detail="El proyecto aun no fue analizado")
    return summary_for(db, project, analysis)


@router.get("/projects/{project_id}/dependencies", response_model=list[DependencyOut])
def list_dependencies(project_id: int, db: DbDep):
    _get_project_or_404(db, project_id)
    return db.query(Dependency).filter_by(project_id=project_id).order_by(Dependency.depth, Dependency.name).all()


# ---------------- Hallazgos ----------------
@router.get("/projects/{project_id}/findings")
def list_findings(
    project_id: int,
    db: DbDep,
    priority: Optional[str] = Query(default=None),
    kev: Optional[bool] = Query(default=None),
    direct: Optional[bool] = Query(default=None),
    q: Optional[str] = Query(default=None),
    limit: int = Query(default=500, ge=1, le=2000),
):
    _get_project_or_404(db, project_id)
    query = db.query(Finding).filter_by(project_id=project_id)
    if priority:
        query = query.filter(Finding.priority_label == priority)
    if kev is not None:
        query = query.filter(Finding.is_kev == kev)
    if direct is not None:
        query = query.join(Dependency).filter(Dependency.is_direct == direct)
    if q:
        query = query.filter(Finding.vuln_id.ilike(f"%{q}%"))
    query = query.order_by(Finding.priority_score.desc()).limit(limit)
    rows = []
    for f in query.all():
        rows.append(to_finding_dict(db, f))
    return rows


@router.get("/projects/{project_id}/findings/{finding_id}")
def get_finding(project_id: int, finding_id: int, db: DbDep):
    finding = (
        db.query(Finding)
        .options(selectinload(Finding.dependency))
        .filter(Finding.id == finding_id, Finding.project_id == project_id)
        .first()
    )
    if finding is None:
        raise HTTPException(status_code=404, detail="Hallazgo no encontrado")
    return to_finding_dict(db, finding)


# ---------------- SBOM ----------------
@router.get("/projects/{project_id}/sbom")
def project_sbom(project_id: int, db: DbDep):
    project = _get_project_or_404(db, project_id)
    deps = (
        db.query(Dependency)
        .filter_by(project_id=project_id)
        .options(
            selectinload(Dependency.edges_from).selectinload(DependencyEdge.source),
            selectinload(Dependency.edges_from).selectinload(DependencyEdge.target),
        )
        .all()
    )
    payload = generate_cyclonedx_json(project, deps)
    return Response(content=payload, media_type="application/json")


# ---------------- Exportacion ----------------
@router.get("/projects/{project_id}/export")
def export_report(
    project_id: int,
    db: DbDep,
    format: str = Query(default="json", pattern="^(json|csv|pdf)$"),
):
    project = _get_project_or_404(db, project_id)
    findings = (
        db.query(Finding)
        .options(selectinload(Finding.dependency))
        .filter_by(project_id=project_id)
        .order_by(Finding.priority_score.desc())
        .all()
    )
    if format == "json":
        return Response(content=export_json(project, findings), media_type="application/json")
    if format == "csv":
        return Response(
            content=export_csv(findings),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="report_{project.name}.csv"'},
        )
    pdf = export_pdf(project, findings)
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="report_{project.name}.pdf"'},
    )


# ---------------- Grafo ----------------
@router.get("/projects/{project_id}/graph")
def dependency_graph(project_id: int, db: DbDep):
    _get_project_or_404(db, project_id)
    deps = db.query(Dependency).filter_by(project_id=project_id).options(
        selectinload(Dependency.edges_from)
    ).all()
    nodes = [{"id": d.id, "name": d.name, "version": d.version, "is_direct": d.is_direct, "depth": d.depth} for d in deps]
    edges = []
    for d in deps:
        for edge in d.edges_from:
            edges.append({"source": edge.source_id, "target": edge.target_id})
    return {"nodes": nodes, "edges": edges}


# ---------------- Verdad de terreno y metricas de ranking ----------------
@router.get("/projects/{project_id}/ground-truth")
def list_ground_truth(project_id: int, db: DbDep):
    _get_project_or_404(db, project_id)
    rows = db.query(GroundTruth).filter_by(project_id=project_id).all()
    return [
        {
            "id": r.id,
            "vuln_id": r.vuln_id,
            "component": r.component,
            "installed_version": r.installed_version,
            "is_direct_dependency": r.is_direct_dependency,
            "environment": r.environment,
            "internet_exposed": r.internet_exposed,
            "data_criticality": r.data_criticality,
            "patch_available": r.patch_available,
            "expected_priority": r.expected_priority,
            "justification": r.justification,
        }
        for r in rows
    ]


@router.put("/projects/{project_id}/ground-truth", status_code=201)
def upsert_ground_truth(project_id: int, payload: list[GroundTruthItem], db: DbDep):
    _get_project_or_404(db, project_id)
    for item in payload:
        if item.expected_priority not in ("critical", "high", "medium", "low", "info"):
            raise HTTPException(status_code=422, detail=f"Prioridad invalida: {item.expected_priority}")
        row = db.query(GroundTruth).filter_by(project_id=project_id, vuln_id=item.vuln_id).first()
        if row is None:
            row = GroundTruth(project_id=project_id, **item.model_dump())
            db.add(row)
        else:
            for key, value in item.model_dump().items():
                setattr(row, key, value)
    db.commit()
    return {"count": len(payload)}


@router.delete("/projects/{project_id}/ground-truth", status_code=204)
def clear_ground_truth(project_id: int, db: DbDep):
    _get_project_or_404(db, project_id)
    db.query(GroundTruth).filter_by(project_id=project_id).delete()
    db.commit()
    return Response(status_code=204)


@router.get("/projects/{project_id}/metrics")
def ranking_metrics(project_id: int, db: DbDep, k: int = Query(default=10, ge=1, le=50)):
    _get_project_or_404(db, project_id)
    findings = list(db.query(Finding).filter_by(project_id=project_id).all())
    truth_rows = db.query(GroundTruth).filter_by(project_id=project_id).all()
    if not truth_rows:
        raise HTTPException(status_code=409, detail="No hay verdad de terreno. Registra casos etiquetados primero.")
    ground_truth = {r.vuln_id: r.expected_priority for r in truth_rows}
    return metrics_for(findings, ground_truth, k=k)


# ---------------- Pruebas de usabilidad (condiciones A y D) ----------------
@router.get("/projects/{project_id}/triage/{condition}")
def triage_scenario(project_id: int, condition: str, db: DbDep, limit: int = Query(default=10, ge=1, le=50)):
    if condition not in ("A", "D"):
        raise HTTPException(status_code=422, detail="La condicion debe ser A o D para usabilidad")
    _get_project_or_404(db, project_id)
    findings = (
        db.query(Finding)
        .options(selectinload(Finding.dependency))
        .filter_by(project_id=project_id)
        .order_by(Finding.priority_score.desc())
        .all()
    )
    if not findings:
        raise HTTPException(status_code=409, detail="El proyecto aun no tiene hallazgos. Ejecuta un analisis primero.")
    return {"condition": condition, "project_id": project_id, "cards": build_triage_scenario(findings, condition, limit)}


@router.post("/usability/trials", status_code=201)
def create_usability_trial(payload: UsabilityTrialCreate, db: DbDep):
    if payload.condition not in ("A", "B", "C", "D"):
        raise HTTPException(status_code=422, detail="La condicion debe ser A, B, C o D")
    if payload.project_id is not None:
        _get_project_or_404(db, payload.project_id)
    trial = UsabilityTrial(**payload.model_dump(exclude={"comprehension_answers"}))
    trial.comprehension_answers = json.dumps(payload.comprehension_answers or {})
    db.add(trial)
    db.commit()
    db.refresh(trial)
    return {"id": trial.id, "participant_id": trial.participant_id, "condition": trial.condition, "triage_seconds": trial.triage_seconds}


@router.get("/usability/trials")
def list_usability_trials(db: DbDep, condition: Optional[str] = Query(default=None)):
    query = db.query(UsabilityTrial).order_by(UsabilityTrial.created_at.desc())
    if condition:
        if condition not in ("A", "B", "C", "D"):
            raise HTTPException(status_code=422, detail="Condicion invalida")
        query = query.filter_by(condition=condition)
    trials = query.all()
    return [
        {
            "id": t.id,
            "participant_id": t.participant_id,
            "condition": t.condition,
            "scenario": t.scenario,
            "project_id": t.project_id,
            "triage_seconds": t.triage_seconds,
            "decision_correct": t.decision_correct,
            "sus_score": t.sus_score,
            "usefulness_rating": t.usefulness_rating,
            "comprehension_answers": json.loads(t.comprehension_answers or "{}"),
            "chosen_action": t.chosen_action,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in trials
    ]


@router.get("/usability/trials/summary")
def usability_trials_summary(db: DbDep):
    trials = list(db.query(UsabilityTrial).all())
    return experience_summary(trials)


@router.delete("/usability/trials", status_code=204)
def clear_usability_trials(db: DbDep):
    db.query(UsabilityTrial).delete()
    db.commit()
    return Response(status_code=204)


# ---------------- Ejecuciones experimentales y prueba de Wilcoxon ----------------
@router.get("/projects/{project_id}/runs")
def list_experiment_runs(project_id: int, db: DbDep):
    _get_project_or_404(db, project_id)
    runs = db.query(ExperimentRun).filter_by(project_id=project_id).all()
    return [
        {
            "id": r.id,
            "condition": r.condition,
            "mode": r.mode,
            "analysis_id": r.analysis_id,
            "metrics_snapshot": json.loads(r.metrics_snapshot or "{}"),
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in runs
    ]


@router.post("/projects/{project_id}/runs", status_code=201)
def create_experiment_run(project_id: int, payload: ExperimentRunCreate, db: DbDep):
    if payload.condition not in ("A", "B", "C", "D"):
        raise HTTPException(status_code=422, detail="La condicion debe ser A, B, C o D")
    _get_project_or_404(db, project_id)
    run = ExperimentRun(
        project_id=project_id,
        condition=payload.condition,
        mode=payload.mode,
        metrics_snapshot=json.dumps(payload.metrics_snapshot or {}),
        findings_snapshot=json.dumps(payload.findings_snapshot or []),
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return {"id": run.id, "condition": run.condition}


@router.delete("/projects/{project_id}/runs", status_code=204)
def clear_experiment_runs(project_id: int, db: DbDep):
    _get_project_or_404(db, project_id)
    db.query(ExperimentRun).filter_by(project_id=project_id).delete()
    db.commit()
    return Response(status_code=204)


@router.get("/experiment/statistics")
def experiment_statistics(db: DbDep, metric: str = Query(default="ndcg_at_k")):
    runs = list(db.query(ExperimentRun).all())
    run_dicts = [
        {"condition": r.condition, "metrics_snapshot": json.loads(r.metrics_snapshot or "{}")}
        for r in runs
    ]
    if metric == "triage_seconds":
        trials = list(db.query(UsabilityTrial).all())
        paired = [t for t in trials if t.condition in ("A", "D")]
        if len({t.condition for t in paired}) < 2:
            return {
                "metric": metric,
                "comparison": None,
                "note": "Se requieren pruebas de usabilidad en ambas condiciones A y D.",
            }
        baseline = [t.triage_seconds for t in paired if t.condition == "A"]
        contextual = [t.triage_seconds for t in paired if t.condition == "D"]
        return {"metric": metric, "comparison": compare_metrics_pairs(metric, baseline, contextual)}
    return aggregate_experiment(run_dicts, metric=metric)


# ---------------- Configuracion / snapshots ----------------
@router.get("/settings", response_model=SettingsOut)
def get_settings(db: DbDep):
    weights = Setting.get(db, "weights") or settings.weights
    thresholds = Setting.get(db, "thresholds") or settings.thresholds
    return SettingsOut(mode=settings.mode, weights=weights, thresholds=thresholds)


@router.put("/settings/weights")
def set_weights(payload: WeightsUpdate, db: DbDep):
    weights = payload.model_dump()
    total = sum(weights.values())
    if abs(total - 100.0) > 1e-6:
        raise HTTPException(status_code=422, detail=f"Los pesos deben sumar 100 (actual: {total})")
    Setting.set(db, "weights", weights)
    return weights


@router.put("/settings/thresholds")
def set_thresholds(payload: ThresholdsUpdate, db: DbDep):
    thresholds = payload.model_dump()
    Setting.set(db, "thresholds", thresholds)
    return thresholds


@router.get("/snapshots/status")
def snapshots_status():
    sm = SnapshotManager(settings)
    kev_files = sorted(sm.kev_dir.glob("kev_*.json"))
    epss_files = sorted(sm.epss_dir.glob("epss_*.csv.gz"))
    return {
        "mode": settings.mode,
        "kev_last_snapshot": kev_files[-1].name if kev_files else None,
        "epss_last_snapshot": epss_files[-1].name if epss_files else None,
    }


@router.post("/snapshots/download", response_model=SnapshotDownloadResult)
def download_snapshots(db: DbDep, kev: bool = True, epss: bool = True):
    sm = SnapshotManager(settings)
    result: dict = {"kev": None, "epss": None, "mode": settings.mode}
    try:
        if kev:
            result["kev"] = sm.download_kev()
        if epss:
            result["epss"] = sm.download_epss()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Error descargando snapshots: {exc}")
    return SnapshotDownloadResult(**result)


@router.get("/version")
def version():
    return {"name": "secsbom", "version": "1.0.0"}
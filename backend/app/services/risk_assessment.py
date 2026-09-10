"""Risk assessment service - provides project-level risk scoring and recommendations."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

from ..models import Finding, Project, Dependency


@dataclass
class RiskDimension:
    name: str
    label: str
    score: float  # 0-100
    weight: float
    findings_count: int
    critical_count: int
    description: str


@dataclass
class RemediationAction:
    priority: int  # 1 = do first
    title: str
    description: str
    effort: str  # 'low', 'medium', 'high'
    affected_packages: list[str]
    risk_reduction: float  # estimated % reduction
    finding_ids: list[int]


@dataclass
class ProjectRiskAssessment:
    project_id: int
    overall_risk_score: float  # 0-100 (higher = more risk)
    risk_level: str  # 'critical', 'high', 'medium', 'low'
    dimensions: list[RiskDimension]
    top_actions: list[RemediationAction]
    summary: str
    stats: dict = field(default_factory=dict)


def _risk_level(score: float) -> str:
    if score >= 80:
        return "critical"
    if score >= 60:
        return "high"
    if score >= 40:
        return "medium"
    return "low"


def assess_project(db: Session, project_id: int) -> ProjectRiskAssessment:
    project = db.get(Project, project_id)
    if project is None:
        raise ValueError("Project not found")

    findings = db.query(Finding).filter_by(project_id=project_id).all()
    deps = db.query(Dependency).filter_by(project_id=project_id).all()

    if not findings:
        return ProjectRiskAssessment(
            project_id=project_id,
            overall_risk_score=0.0,
            risk_level="low",
            dimensions=[],
            top_actions=[],
            summary="No hay hallazgos registrados para este proyecto. No se ha detectado riesgo.",
            stats={"total_findings": 0, "total_dependencies": len(deps)},
        )

    dimensions = _compute_dimensions(findings, project, deps)
    overall = sum(d.score * d.weight for d in dimensions)
    risk_level = _risk_level(overall)
    actions = _build_actions(findings, deps, overall)
    summary = _build_summary(project, findings, dimensions, overall, risk_level)

    direct_deps = [d for d in deps if d.is_direct]
    stats = {
        "total_findings": len(findings),
        "critical_findings": sum(1 for f in findings if f.priority_label == "critical"),
        "high_findings": sum(1 for f in findings if f.priority_label == "high"),
        "total_dependencies": len(deps),
        "direct_dependencies": len(direct_deps),
        "transitive_dependencies": len(deps) - len(direct_deps),
        "kev_findings": sum(1 for f in findings if f.is_kev),
        "no_patch_findings": sum(1 for f in findings if not f.patch_available),
    }

    return ProjectRiskAssessment(
        project_id=project_id,
        overall_risk_score=round(overall, 2),
        risk_level=risk_level,
        dimensions=dimensions,
        top_actions=actions,
        summary=summary,
        stats=stats,
    )


def _compute_dimensions(findings: list[Finding], project: Project, deps: list[Dependency]) -> list[RiskDimension]:
    technical = _technical_risk(findings)
    exploitation = _exploitation_risk(findings)
    exposure = _exposure_risk(findings, project, deps)
    maintenance = _maintenance_risk(findings)

    return [
        RiskDimension(
            name="technical",
            label="Riesgo Técnico",
            score=technical["score"],
            weight=0.35,
            findings_count=technical["count"],
            critical_count=technical["critical"],
            description="Severidad de las vulnerabilidades basada en CVSS.",
        ),
        RiskDimension(
            name="exploitation",
            label="Riesgo de Explotación",
            score=exploitation["score"],
            weight=0.30,
            findings_count=exploitation["count"],
            critical_count=exploitation["critical"],
            description="Probabilidad de explotación activa (EPSS + KEV).",
        ),
        RiskDimension(
            name="exposure",
            label="Riesgo de Exposición",
            score=exposure["score"],
            weight=0.20,
            findings_count=exposure["count"],
            critical_count=exposure["critical"],
            description="Exposición del proyecto y cercanía en la cadena de dependencias.",
        ),
        RiskDimension(
            name="maintenance",
            label="Riesgo de Mantenimiento",
            score=maintenance["score"],
            weight=0.15,
            findings_count=maintenance["count"],
            critical_count=maintenance["critical"],
            description="Disponibilidad de parches y capacidad de remediación.",
        ),
    ]


def _technical_risk(findings: list[Finding]) -> dict:
    if not findings:
        return {"score": 0.0, "count": 0, "critical": 0}
    cvss_values = [f.cvss_score for f in findings if f.cvss_score is not None]
    avg_cvss = sum(cvss_values) / len(cvss_values) if cvss_values else 0.0
    max_cvss = max(cvss_values) if cvss_values else 0.0
    critical = sum(1 for f in findings if f.cvss_score is not None and f.cvss_score >= 9.0)
    high = sum(1 for f in findings if f.cvss_score is not None and 7.0 <= f.cvss_score < 9.0)
    score = (avg_cvss / 10.0 * 50) + (max_cvss / 10.0 * 30) + (min(critical / max(len(findings), 1), 1.0) * 20)
    return {"score": min(score * 100 / 100, 100.0), "count": len(findings), "critical": critical + high}


def _exploitation_risk(findings: list[Finding]) -> dict:
    if not findings:
        return {"score": 0.0, "count": 0, "critical": 0}
    kev_count = sum(1 for f in findings if f.is_kev)
    high_epss = sum(1 for f in findings if f.epss_score is not None and f.epss_score >= 0.1)
    avg_epss = 0.0
    epss_vals = [f.epss_score for f in findings if f.epss_score is not None]
    if epss_vals:
        avg_epss = sum(epss_vals) / len(epss_vals)
    kev_ratio = kev_count / len(findings)
    epss_component = avg_epss * 60
    kev_component = min(kev_ratio * 100, 100.0) * 0.4
    score = epss_component + kev_component
    return {"score": min(score, 100.0), "count": len(findings), "critical": kev_count + high_epss}


def _exposure_risk(findings: list[Finding], project: Project, deps: list[Dependency]) -> dict:
    if not findings:
        return {"score": 0.0, "count": 0, "critical": 0}
    exposure_base = 70.0 if project.internet_exposed else 30.0
    env_mult = {"production": 1.0, "staging": 0.7, "development": 0.4}.get(project.environment, 0.5)
    direct_deps = {d.id for d in deps if d.is_direct}
    direct_findings = sum(1 for f in findings if f.dependency_id in direct_deps)
    direct_ratio = direct_findings / len(findings) if findings else 0.0
    score = exposure_base * env_mult * 0.5 + direct_ratio * 100 * 0.3 + (direct_findings / max(len(findings), 1)) * 100 * 0.2
    critical = sum(1 for f in findings if f.dependency_id in direct_deps and f.priority_label in ("critical", "high"))
    return {"score": min(score, 100.0), "count": len(findings), "critical": critical}


def _maintenance_risk(findings: list[Finding]) -> dict:
    if not findings:
        return {"score": 0.0, "count": 0, "critical": 0}
    no_patch = sum(1 for f in findings if not f.patch_available)
    ratio = no_patch / len(findings)
    score = ratio * 100.0
    return {"score": min(score, 100.0), "count": no_patch, "critical": no_patch}


def _build_actions(findings: list[Finding], deps: list[Dependency], overall: float) -> list[RemediationAction]:
    dep_map = {d.id: d for d in deps}
    actions: list[RemediationAction] = []
    priority = 1

    kev_findings = [f for f in findings if f.is_kev]
    if kev_findings:
        pkgs = list({dep_map[f.dependency_id].name for f in kev_findings if f.dependency_id in dep_map})
        actions.append(RemediationAction(
            priority=priority,
            title="Remediar vulnerabilidades en lista KEV de CISA",
            description=f"{len(kev_findings)} vulnerabilidades están en la lista de explotación conocida. Estas deben tratarse con la máxima urgencia.",
            effort="high",
            affected_packages=pkgs,
            risk_reduction=round(min(len(kev_findings) * 15, 40), 1),
            finding_ids=[f.id for f in kev_findings],
        ))
        priority += 1

    no_patch = [f for f in findings if not f.patch_available and f.priority_label in ("critical", "high")]
    if no_patch:
        pkgs = list({dep_map[f.dependency_id].name for f in no_patch if f.dependency_id in dep_map})
        actions.append(RemediationAction(
            priority=priority,
            title="Evaluar mitigaciones para vulnerabilidades sin parche",
            description=f"{len(no_patch)} vulnerabilidades de alta/crítica severidad no tienen parche disponible. Considerar mitigaciones compensatorias o sustitución del paquete.",
            effort="medium",
            affected_packages=pkgs,
            risk_reduction=round(min(len(no_patch) * 10, 25), 1),
            finding_ids=[f.id for f in no_patch],
        ))
        priority += 1

    critical_findings = [f for f in findings if f.priority_label == "critical" and f.id not in {fid for a in actions for fid in a.finding_ids}]
    if critical_findings:
        pkgs = list({dep_map[f.dependency_id].name for f in critical_findings if f.dependency_id in dep_map})
        actions.append(RemediationAction(
            priority=priority,
            title="Actualizar dependencias con vulnerabilidades críticas",
            description=f"{len(critical_findings)} hallazgos críticos requieren actualización inmediata de los paquetes afectados.",
            effort="medium",
            affected_packages=pkgs,
            risk_reduction=round(min(len(critical_findings) * 8, 20), 1),
            finding_ids=[f.id for f in critical_findings],
        ))
        priority += 1

    high_epss = [f for f in findings if f.epss_score is not None and f.epss_score >= 0.1 and f.id not in {fid for a in actions for fid in a.finding_ids}]
    if high_epss:
        pkgs = list({dep_map[f.dependency_id].name for f in high_epss if f.dependency_id in dep_map})
        actions.append(RemediationAction(
            priority=priority,
            title="Reducir superficie de ataque con alta probabilidad de explotación",
            description=f"{len(high_epss)} vulnerabilidades tienen EPSS >= 10%, indicando alta probabilidad de explotación en el corto plazo.",
            effort="low",
            affected_packages=pkgs,
            risk_reduction=round(min(len(high_epss) * 5, 15), 1),
            finding_ids=[f.id for f in high_epss],
        ))
        priority += 1

    direct_high = [f for f in findings if f.priority_label in ("high", "medium") and f.id not in {fid for a in actions for fid in a.finding_ids} and dep_map.get(f.dependency_id, Dependency(is_direct=False)).is_direct]
    if direct_high:
        pkgs = list({dep_map[f.dependency_id].name for f in direct_high if f.dependency_id in dep_map})
        actions.append(RemediationAction(
            priority=priority,
            title="Actualizar dependencias directas de alta prioridad",
            description=f"{len(direct_high)} vulnerabilidades en dependencias directas deben ser revisadas para mantener la higiene del proyecto.",
            effort="low",
            affected_packages=pkgs[:10],
            risk_reduction=round(min(len(direct_high) * 3, 10), 1),
            finding_ids=[f.id for f in direct_high],
        ))
        priority += 1

    return actions[:5]


def _build_summary(
    project: Project,
    findings: list[Finding],
    dimensions: list[RiskDimension],
    overall: float,
    risk_level: str,
) -> str:
    level_es = {"critical": "crítico", "high": "alto", "medium": "moderado", "low": "bajo"}
    kev = sum(1 for f in findings if f.is_kev)
    no_patch = sum(1 for f in findings if not f.patch_available)
    critical = sum(1 for f in findings if f.priority_label == "critical")
    high = sum(1 for f in findings if f.priority_label == "high")

    exposure_ctx = "expuesto a internet" if project.internet_exposed else "interno"
    env_ctx = {"production": "producción", "staging": "staging", "development": "desarrollo"}.get(project.environment, project.environment)

    dim_text = max(dimensions, key=lambda d: d.score) if dimensions else None
    dim_text_label = f"El mayor factor de riesgo es {dim_text.label.lower()} ({dim_text.score:.0f}/100)." if dim_text and dim_text.score > 50 else ""

    parts = [
        f"El proyecto «{project.name}» tiene un nivel de riesgo {level_es.get(risk_level, risk_level)} con una puntuación global de {overall:.0f}/100.",
        f"Se identificaron {len(findings)} hallazgos en total: {critical} críticos, {high} altos.",
    ]
    if kev:
        parts.append(f"{kev} vulnerabilidades están en la lista KEV de CISA.")
    if no_patch:
        parts.append(f"{no_patch} hallazgos no tienen parche disponible.")
    if dim_text_label:
        parts.append(dim_text_label)
    parts.append(f"El proyecto está configurado como {exposure_ctx} en entorno de {env_ctx}.")

    return " ".join(parts)

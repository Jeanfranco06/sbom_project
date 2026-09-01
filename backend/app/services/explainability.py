"""Motor de explicabilidad y remediacion.

Genera una explicacion trazable para cada hallazgo: evidencia por factor,
contribucion al puntaje, reglas de excepcion aplicadas y accion recomendada.
"""
from __future__ import annotations

from ..models import Dependency, Project
from .prioritization import build_explanation_annotations

FACTOR_LABELS = {
    "cvss": "Severidad tecnica (CVSS)",
    "kev": "Explotacion activa conocida (CISA KEV)",
    "epss": "Probabilidad de explotacion (EPSS)",
    "exposure": "Exposicion del componente",
    "environment": "Entorno de despliegue",
    "dependency": "Alcance de la dependencia",
    "data_criticality": "Criticidad de datos tratados",
    "remediation": "Disponibilidad de remediacion",
}

FACTOR_SOURCES = {
    "cvss": "NVD/OSV",
    "kev": "CISA KEV",
    "epss": "FIRST EPSS",
    "exposure": "Perfil del proyecto",
    "environment": "Perfil del proyecto",
    "dependency": "Grafo SBOM",
    "data_criticality": "Perfil del proyecto",
    "remediation": "Metadata de version",
}


def build_explanation(
    project: Project,
    dep: Dependency,
    candidate: dict,
    values: dict,
    score: float,
    label: str,
    rules: list[str],
    weights: dict,
) -> dict:
    """Construye el JSON de explicacion trazable del hallazgo."""
    total_weight = sum(weights.values()) or 1.0
    factors = []
    for key in FACTOR_LABELS:
        raw = values.get(key, 0.0)
        weight = weights.get(key, 0)
        contribution = round((weight / total_weight) * raw * 100.0, 2)
        internal_value = {
            "cvss": candidate.get("cvss_score"),
            "kev": candidate.get("is_kev"),
            "epss": candidate.get("epss_score"),
            "exposure": project.internet_exposed,
            "environment": project.environment,
            "dependency": {"is_direct": dep.is_direct, "is_dev": dep.is_dev, "depth": dep.depth},
            "data_criticality": project.data_criticality,
            "remediation": candidate.get("patch_available"),
        }[key]
        factors.append(
            {
                "factor": key,
                "label": FACTOR_LABELS[key],
                "source": FACTOR_SOURCES[key],
                "value_normalized": round(raw, 4),
                "internal_value": internal_value,
                "weight_pct": weight,
                "contribution_pct": contribution,
                "note": _factor_note(key, raw, internal_value),
            }
        )

    notes = build_explanation_annotations(None, project, dep, candidate, values)

    recommendation = _recommendation(dep, candidate, label)

    return {
        "component": {"name": dep.name, "version": dep.version or "desconocida"},
        "vulnerability": candidate.get("vuln_id"),
        "aliases": candidate.get("aliases", []),
        "priority": {"score": score, "label": label},
        "profile": {
            "environment": project.environment,
            "internet_exposed": project.internet_exposed,
            "data_criticality": project.data_criticality,
        },
        "factors": factors,
        "rules_applied": rules,
        "remediation": recommendation,
        "evidence": _evidence(candidate),
    }


def _factor_note(key: str, value: float, internal) -> str:
    if key == "cvss":
        return f"CVSS base score {internal if internal is not None else 'no reportado'} -> {value:.2f}."
    if key == "kev":
        return "La CVE pertenece al catalogo CISA KEV (explotacion activa)." if internal else "Sin evidencia de explotacion activa en KEV."
    if key == "epss":
        return f"Probabilidad EPSS {internal if internal is not None else 0.0:.4f} -> {value:.2f}." if internal else "Sin puntaje EPSS registrado."
    if key == "exposure":
        return "Componente con acceso expuesto a Internet." if internal else "Componente en red interna (exposicion menor)."
    if key == "environment":
        return f"Entorno de despliegue: {internal}."
    if key == "dependency":
        kind = "directa" if internal.get("is_direct") else "transitiva"
        dev = " (solo desarrollo)" if internal.get("is_dev") else ""
        return f"Dependencia {kind}{dev}; profundidad {internal.get('depth')}."
    if key == "data_criticality":
        return f"Criticidad de datos del proyecto: {internal}."
    if key == "remediation":
        return "Existe version corregida disponible." if internal else "Sin parche publicado (remediabilidad baja)."
    return ""


def _evidence(candidate: dict) -> list[dict]:
    ev: list[dict] = []
    if candidate.get("cvss_score") is not None:
        ev.append({"source": "CVSS", "value": candidate.get("cvss_score"), "severity": candidate.get("cvss_severity")})
    if candidate.get("epss_score") is not None:
        ev.append({"source": "EPSS", "value": candidate.get("epss_score")})
    if candidate.get("is_kev"):
        ev.append({"source": "CISA KEV", "value": "known_exploited"})
    if candidate.get("fixed_versions"):
        ev.append({"source": "OSV ranges", "fixed_versions": candidate.get("fixed_versions")})
    if candidate.get("details"):
        ev.append({"source": "OSV", "details": candidate.get("details")})
    return ev


def _recommendation(dep: Dependency, candidate: dict, label: str) -> str:
    if candidate.get("patch_available") and candidate.get("fixed_versions"):
        fixed = ", ".join(candidate["fixed_versions"][:3])
        return f"Actualizar {dep.name} a una version segura ({fixed}). Verificar compatibilidad con el resto del proyecto."
    if label in ("critical", "high"):
        return f"Sin parche publicado para {dep.name}. Evaluar mitigaciones compensatorias (aislar, restringir accesos) o sustituir el componente."
    return f"Riesgo menor en {dep.name}. Documentar y monitorear; actualizar cuando haya version corregida."
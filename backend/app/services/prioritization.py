"""Motor de priorizacion contextual.

Implementa la formula P_v = wC*C + wK*K + wE*E + wX*X + wA*A + wD*D + wI*I + wR*R
con pesos configurables, mas reglas de excepcion que complementan el modelo.
"""
from __future__ import annotations

from ..config import Settings
from ..models import Dependency, Project
from .cvss import normalize_severity

LABEL_ORDER = ["critical", "high", "medium", "low", "info"]


class PrioritizationEngine:
    def __init__(self, settings: Settings, weights: dict | None = None, thresholds: dict | None = None) -> None:
        self.settings = settings
        self.weights = weights or dict(settings.weights)
        self.thresholds = thresholds or dict(settings.thresholds)

    # ---------- valores de los factores ----------
    def factor_values(self, project: Project, dep: Dependency, candidate: dict) -> dict:
        """Calcula el valor normalizado (0-1) de cada factor."""
        cvss = candidate.get("cvss_score") or 0.0
        kev = 1.0 if candidate.get("is_kev") else 0.0
        epss = candidate.get("epss_score") or 0.0
        exposure = self.settings.exposure_values.get(
            "exposed" if project.internet_exposed else "internal", 0.3
        )
        environment = self.settings.environment_values.get(project.environment, 0.2)
        dep_base = self.settings.dependency_values.get("direct" if dep.is_direct else "transitive", 0.5)
        if dep.is_dev:
            dep_base *= self.settings.dev_penalty
        data_crit = self.settings.data_values.get(project.data_criticality, 0.5)
        remediation = 1.0 if candidate.get("patch_available") else self.settings.no_patch_remediation_value

        return {
            "cvss": min(max(cvss / 10.0, 0.0), 1.0),
            "kev": kev,
            "epss": min(max(epss, 0.0), 1.0),
            "exposure": exposure,
            "environment": environment,
            "dependency": dep_base,
            "data_criticality": data_crit,
            "remediation": remediation,
        }

    def score(self, values: dict) -> float:
        """Ponderacion lineal de los factores: 0-100."""
        total = sum(v for v in self.weights.values())
        if total <= 0:
            return 0.0
        score = sum(self.weights.get(key, 0) * value for key, value in values.items())
        return round((score / total) * 100.0, 2)

    def label_for(self, score: float) -> str:
        for label in ("critical", "high", "medium", "low"):
            if score >= self.thresholds.get(label, 0):
                return label
        return "info"

    @staticmethod
    def lower_label(label: str, steps: int = 1) -> str:
        idx = LABEL_ORDER.index(label)
        return LABEL_ORDER[min(idx + steps, len(LABEL_ORDER) - 1)]

    # ---------- reglas de excepcion ----------
    def apply_exceptions(
        self, project: Project, dep: Dependency, candidate: dict, score: float, label: str
    ) -> tuple[float, str, list[str]]:
        rules: list[str] = []

        # R1: KEV + componente expuesto en produccion => critico sin importar CVSS
        if candidate.get("is_kev") and project.internet_exposed and project.environment == "production":
            score = max(score, 90.0)
            label = "critical"
            rules.append("R1: en la lista CISA KEV y expuesto en produccion -> prioridad critica.")

        # R2: solo desarrollo, no incluido en el artefacto desplegado => reducir un nivel, conservar alerta
        if dep.is_dev and rule2_condition(dep, project):
            if label != "info":
                label = self.lower_label(label)
                rules.append(
                    "R2: dependencia exclusivamente de desarrollo, sin impacto en el artefacto "
                    "desplegado -> prioridad reducida un nivel."
                )

        return score, label, rules


def rule2_condition(dep: Dependency, project: Project) -> bool:
    """La dependencia de desarrollo no forma parte del artefacto desplegado."""
    if not dep.is_dev:
        return False
    if project.environment == "development":
        return False
    return True


def build_explanation_annotations(
    settings: Settings, project: Project, dep: Dependency, candidate: dict, values: dict
) -> list[str]:
    """Notas adicionales para la seccion de remediacion (reglas R3/R4)."""
    notes: list[str] = []
    if candidate.get("patch_available") and candidate.get("fixed_versions"):
        fixed = ", ".join(candidate["fixed_versions"][:3])
        notes.append(f"R3: existe actualizacion segura disponible ({fixed}). Se recomienda actualizar.")
    if not candidate.get("patch_available"):
        notes.append("R4: no hay parche publicado. Proponer mitigacion compensatoria o sustitucion.")
    return notes


def make_severity_display(candidate: dict) -> str | None:
    return normalize_severity(candidate.get("cvss_severity")) or "info"
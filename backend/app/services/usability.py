"""Pruebas de usabilidad (fase 4 del documento).

Implementa los escenarios de las condiciones A (baseline) y D (propuesta
explicable) para medir tiempo de triage, exactitud de decision y usabilidad
percibida, segun la seccion 14.1 del documento.

Los hallazgos se presentan de forma controlada:
  - Condicion A: solo CVE, paquete, version y CVSS.
  - Condicion D: ademas evidencia, justificacion y recomendacion de accion.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Iterable

from sqlalchemy.orm import Session

from ..models import ExperimentRun, Finding, UsabilityTrial
from .analysis_service import to_finding_dict


def median(values: list[float]) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    n = len(ordered)
    mid = n // 2
    if n % 2 == 1:
        return ordered[mid]
    return (ordered[mid - 1] + ordered[mid]) / 2


def mean(values: list[float]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)


def _baseline_card(f: Finding) -> dict:
    """Tarjeta de alerta para la condicion A (solo datos tradicionales)."""
    return {
        "id": f.id,
        "vuln_id": f.vuln_id,
        "alert_type": "condition_A",
        "cve_id": f.vuln_id,
        "package": f.dependency.name if f.dependency else "",
        "version": f.dependency.version if f.dependency else "",
        "cvss_score": f.cvss_score,
        "cvss_severity": f.cvss_severity,
        "priority_score": f.priority_score,
        "priority_label": f.priority_label,
        "is_direct": f.dependency.is_direct if f.dependency else True,
        "summary": f.summary,
        "details": f.details,
        "source": f.source,
        "is_kev": f.is_kev,
        "patch_available": f.patch_available,
        "dependency": {
            "name": f.dependency.name,
            "version": f.dependency.version,
            "is_direct": f.dependency.is_direct,
        } if f.dependency else None,
    }


def _explicable_card(f: Finding) -> dict:
    """Tarjeta de alerta para la condicion D (propuesta explicable)."""
    expl = json.loads(f.explanation or "{}")
    rules = json.loads(f.rules_applied or "[]")
    return {
        "id": f.id,
        "vuln_id": f.vuln_id,
        "alert_type": "condition_D",
        "cve_id": f.vuln_id,
        "package": f.dependency.name if f.dependency else "",
        "version": f.dependency.version if f.dependency else "",
        "cvss_score": f.cvss_score,
        "cvss_severity": f.cvss_severity,
        "priority_score": f.priority_score,
        "priority_label": f.priority_label,
        "is_direct": f.dependency.is_direct if f.dependency else True,
        "summary": f.summary,
        "details": f.details,
        "source": f.source,
        "is_kev": f.is_kev,
        "patch_available": f.patch_available,
        "explanation": f.explanation,
        "rules_applied": f.rules_applied,
        "dependency": {
            "name": f.dependency.name,
            "version": f.dependency.version,
            "is_direct": f.dependency.is_direct,
        } if f.dependency else None,
        "elements": {
            "evidence": expl.get("evidence", []),
            "factors": expl.get("factors", []),
            "rules_applied": rules,
            "remediation": expl.get("remediation"),
            "profile": expl.get("profile"),
        },
    }


def build_triage_scenario(findings: Iterable[Finding], condition: str, limit: int = 10) -> list[dict]:
    """Construye el escenario de triage para una condicion dada."""
    ranked = list(findings)
    if condition == "D":
        return [_explicable_card(f) for f in ranked[:limit]]
    return [_baseline_card(f) for f in ranked[:limit]]


def experience_summary(trials: list[UsabilityTrial]) -> dict:
    """Agrega las metricas de usabilidad por condicion (seccion 13.4)."""
    by_condition: dict[str, list[float]] = {}
    correctness: dict[str, dict] = {}
    sus: dict[str, list[float]] = {}
    use: dict[str, list[float]] = {}

    for t in trials:
        by_condition.setdefault(t.condition, []).append(t.triage_seconds)
        correctness.setdefault(t.condition, {"correct": 0, "total": 0})
        correctness[t.condition]["total"] += 1
        if t.decision_correct:
            correctness[t.condition]["correct"] += 1
        if t.sus_score is not None:
            sus.setdefault(t.condition, []).append(t.sus_score)
        if t.usefulness_rating is not None:
            use.setdefault(t.condition, []).append(t.usefulness_rating)

    result: dict = {"conditions": {}, "n_trials": len(trials), "conclusion_h2": None}
    for cond in sorted(by_condition):
        times = by_condition[cond]
        cc = correctness[cond]
        correct_rate = cc["correct"] / cc["total"] if cc["total"] else 0.0
        result["conditions"][cond] = {
            "n_trials": len(times),
            "median": median(times),
            "min": min(times),
            "max": max(times),
            "triage_seconds": {
                "mean": mean(times),
                "median": median(times),
                "min": min(times),
                "max": max(times),
            },
            "decision_correct_rate": correct_rate,
            "decisions": cc,
            "sus_score_mean": mean(sus.get(cond, [])),
            "usefulness_mean": mean(use.get(cond, [])),
        }

    cond_a = result["conditions"].get("A")
    cond_d = result["conditions"].get("D")
    result["condition_a"] = {
        "avg_time": cond_a["triage_seconds"]["mean"],
        "accuracy": cond_a["decision_correct_rate"],
        "count": cond_a["n_trials"],
    } if cond_a else {
        "avg_time": 0.0,
        "accuracy": 0.0,
        "count": 0,
    }
    result["condition_d"] = {
        "avg_time": cond_d["triage_seconds"]["mean"],
        "accuracy": cond_d["decision_correct_rate"],
        "count": cond_d["n_trials"],
    } if cond_d else {
        "avg_time": 0.0,
        "accuracy": 0.0,
        "count": 0,
    }

    if "A" in result["conditions"] and "D" in result["conditions"]:
        t_a = mean(by_condition["A"])
        t_d = mean(by_condition["D"])
        result["conclusion_h2"] = t_d < t_a
    return result
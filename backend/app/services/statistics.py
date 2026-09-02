"""Prueba estadistica de Wilcoxon (seccion 14.3 del documento).

Compara metricas de ranking pareadas entre condiciones (p. ej. NDCG@k del
baseline vs la propuesta contextual) y tiempos de triage pareados entre
condiciones A y D, usando la prueba de rangos con signo de Wilcoxon
(sign-ranked test), apropiada para datos pareados no normales.

Tambien calcula el tamano del efecto de Cohen para reportar la magnitud
del beneficio del modelo contextual.
"""
from __future__ import annotations

import functools
import math
import random
from statistics import mean, pstdev
from typing import Iterable, Sequence


def _paired_diffs(a: Sequence[float], b: Sequence[float]) -> list[float]:
    """Diferencias por pares. Solo se incluyen pares no empatados."""
    if len(a) != len(b):
        # Acomodar a la longitud comun mas corta (datos pareados con faltantes)
        n = min(len(a), len(b))
        a, b = list(a[:n]), list(b[:n])
    return [y - x for x, y in zip(a, b) if abs(y - x) > 1e-12]


def wilcoxon_signed_rank(a: Sequence[float], b: Sequence[float]) -> dict:
    """Prueba de Wilcoxon (Sistemas iguales / diferente direccion de cambio).

    Devuelve: estadistico, numero de pares, valor exacto de la probabilidad
    de la suma de rangos W, media y desviacion de la suma de rangos simulada.
    """
    diffs = _paired_diffs(a, b)
    n = len(diffs)
    if n == 0:
        return {"statistic": 0.0, "n_pairs": 0, "p_value": 0.0, "notes": []}

    signs = [1 if d > 0 else -1 for d in diffs]
    # Suma de rangos con signo: W = sum(sign_i * rank_i).
    # Asignamos rangos de 1..n por el valor absoluto de cada diferencia. En caso
    # de empate (mismo valor absoluto), usamos el rango promedio (ties handle)
    # para no depender del orden de los items y evitar colisiones de clave.
    absolutes = [abs(d) for d in diffs]
    order = sorted(range(n), key=lambda i: absolutes[i])
    ranks: list[float] = [0.0] * n
    rank = 1
    while order:
        block = [i for i in order if abs(absolutes[i] - absolutes[order[0]]) <= 1e-12]
        avg = rank + (len(block) - 1) / 2.0
        for i in block:
            ranks[i] = avg
        rank += len(block)
        order = order[len(block):]
    w = sum(signs[i] * ranks[i] for i in range(n))

    # Valor exacto: probabilidad de que W sea al menos tan extremo bajo permutacion
    all_signs = _all_sign_patterns(n)
    w_sim = [sum(s_i * (i + 1) for i, s_i in enumerate(pattern)) for pattern in all_signs]
    p_value = mean(1.0 for wv in w_sim if abs(wv) >= abs(w)) if w_sim else 0.0

    return {
        "statistic": float(w),
        "n_pairs": n,
        "p_value": p_value,
        "notes": ["prueba de rangos con signo de Wilcoxon, datos pareados no normales"],
    }


def _all_sign_patterns(n: int) -> list[tuple[int, ...]]:
    """Genera todas las 2**n combinaciones de signos para la suma de rangos."""
    return [tuple(1 if (mask >> i) & 1 else -1 for i in range(n)) for mask in range(1 << n)]


def cohen_d(a: Sequence[float], b: Sequence[float]) -> float:
    """Tamano del efecto (d de Cohen) entre dos grupos pareados (M1 vs M2)."""
    if not a or not b:
        return 0.0
    diff = mean(a) - mean(b)
    pool = list(a) + list(b)
    sd = pstdev(pool) if len(pool) > 1 else 1.0
    if sd == 0:
        return 0.0
    return diff / sd


def compare_metrics_pairs(metric_name: str, baseline_values: Sequence[float], contextual_values: Sequence[float]) -> dict:
    """Ejecuta Wilcoxon + d de Cohen sobre una metrica pareada por proyecto."""
    wil = wilcoxon_signed_rank(baseline_values, contextual_values)
    d = cohen_d(baseline_values, contextual_values)
    return {
        "metric_name": metric_name,
        "baseline_mean": mean(baseline_values) if baseline_values else 0.0,
        "contextual_mean": mean(contextual_values) if contextual_values else 0.0,
        "improvement": (mean(contextual_values) - mean(baseline_values)) if baseline_values else 0.0,
        "wilcoxon": wil,
        "cohen_d": d,
    }


def aggregate_experiment(runs: Iterable[dict], metric: str = "ndcg_at_k") -> dict:
    """Agrega metricas pareadas (condicion A vs C) de multiples ejecuciones.

    runs: lista de dicts con forma {"condition", "metrics_snapshot"} donde
    metrics_snapshot proviene de /api/projects/{id}/metrics.
    """
    baseline: list[float] = []
    contextual: list[float] = []
    used = 0
    skipped = 0

    for run in runs:
        metrics = run.get("metrics_snapshot") or {}
        
        if metric in ("kendall_tau", "spearman_rho", "contextual_vs_expert_tau", "baseline_vs_expert_tau", "contextual_vs_expert_spearman", "baseline_vs_expert_spearman"):
            concordance = metrics.get("concordance") or {}
            if run.get("condition") == "A":
                baseline_metric = metric.replace("contextual_", "baseline_") if "contextual_" in metric else metric
                baseline.append(concordance.get(baseline_metric, 0.0))
                used += 1
            elif run.get("condition") == "C":
                contextual.append(concordance.get(metric, 0.0))
                used += 1
            else:
                skipped += 1
        else:
            if run.get("condition") == "A":
                baseline.append((metrics.get("baseline_cvss") or {}).get(metric, 0.0))
                used += 1
            elif run.get("condition") == "C":
                contextual.append((metrics.get("contextual") or {}).get(metric, 0.0))
                used += 1
            else:
                skipped += 1

    return {
        "metric": metric,
        "n_runs_used": used,
        "n_runs_skipped": skipped,
        "comparison": compare_metrics_pairs(metric, baseline, contextual) if baseline and contextual else None,
    }
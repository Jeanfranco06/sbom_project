"""Metricas de evaluacion de la calidad de ranking.

Implementa las metricas de la seccion 13 del documento:
  - Precision@k, Recall@k, NDCG@k
  - Kendall's tau y Spearman (concordancia con juicio experto)

Compara el ranking contextual del motor contra el baseline solo-CVSS
(condicion A del diseno experimental).
"""
from __future__ import annotations

import math
from typing import Iterable

from ..models import Finding

RELEVANT = {"critical", "high"}


def _ranked(items: list[tuple[str, float]], trim: int | None = None) -> list[str]:
    """Ordena ids por score descendente; devuelve la lista de ids."""
    ordered = [i for i, _ in sorted(items, key=lambda x: x[1], reverse=True)]
    return ordered[:trim] if trim else ordered


def _expert_ranking(ground_truth: dict[str, str]) -> list[str]:
    """Ordena los casos por prioridad esperada (de mayor a menor severidad)."""
    order = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}
    return [
        vid
        for vid, _ in sorted(ground_truth.items(), key=lambda kv: order.get(kv[1], 9))
    ]


def _relevant_ids(ground_truth: dict[str, str]) -> set[str]:
    return {vid for vid, prio in ground_truth.items() if prio in RELEVANT}


def precision_at_k(ranking: list[str], relevant: set[str], k: int) -> float:
    top = ranking[:k]
    if not top:
        return 0.0
    return sum(1 for v in top if v in relevant) / len(top)


def recall_at_k(ranking: list[str], relevant: set[str], k: int) -> float:
    if not relevant:
        return 0.0
    top = ranking[:k]
    return sum(1 for v in top if v in relevant) / len(relevant)


def dcg(ranking: list[str], relevant: set[str], k: int) -> float:
    acc = 0.0
    for i, vid in enumerate(ranking[:k], start=1):
        if vid in relevant:
            acc += 1.0 / math.log2(i + 1)
    return acc


def ndcg_at_k(ranking: list[str], relevant: set[str], k: int) -> float:
    ideal = sorted(ranking, key=lambda v: v in relevant, reverse=True)
    idcg = dcg(ideal, relevant, k)
    if idcg == 0:
        return 0.0
    return dcg(ranking, relevant, k) / idcg


def kendall_tau(ranking_a: list[str], ranking_b: list[str]) -> float:
    """Kendall's tau-b para pares comparables (vulnerabilidades en ambos rankings)."""
    pos_a = {v: i for i, v in enumerate(ranking_a)}
    pos_b = {v: i for i, v in enumerate(ranking_b)}
    common = [v for v in ranking_a if v in pos_b]
    n = len(common)
    if n < 2:
        return 0.0

    concordant = 0
    discordant = 0
    ties_a = 0
    ties_b = 0
    for i in range(n):
        for j in range(i + 1, n):
            va, vb = common[i], common[j]
            d1 = pos_a[va] - pos_a[vb]
            d2 = pos_b[va] - pos_b[vb]
            if d1 == 0 or d2 == 0:
                if d1 == 0 and d2 == 0:
                    ties_a += 1
                    ties_b += 1
                elif d1 == 0:
                    ties_a += 1
                else:
                    ties_b += 1
                continue
            if d1 * d2 > 0:
                concordant += 1
            else:
                discordant += 1
    denom = math.sqrt((concordant + discordant + ties_a) * (concordant + discordant + ties_b))
    if denom == 0:
        return 0.0
    return (concordant - discordant) / denom


def spearman_rho(ranking_a: list[str], ranking_b: list[str]) -> float:
    """Correlacion de Spearman (rangos promedio con empates) sobre la interseccion."""
    pos_a = {v: i for i, v in enumerate(ranking_a)}
    pos_b = {v: i for i, v in enumerate(ranking_b)}
    common = [v for v in ranking_a if v in pos_b]
    n = len(common)
    if n < 2:
        return 0.0
    ranks_a = [_rank_of(a, ranking_a, pos_a) for a in common]
    ranks_b = [_rank_of(b, ranking_b, pos_b) for b in common]
    ma, mb = sum(ranks_a) / n, sum(ranks_b) / n
    num = sum((ra - ma) * (rb - mb) for ra, rb in zip(ranks_a, ranks_b))
    denom = math.sqrt(sum((ra - ma) ** 2 for ra in ranks_a)) * math.sqrt(sum((rb - mb) ** 2 for rb in ranks_b))
    if denom == 0:
        return 0.0
    return num / denom


def _rank_of(v: str, ranking: list[str], pos: dict[str, int]) -> float:
    """Rango promedio de un elemento considerando empates en el score."""
    same = [i for i, x in enumerate(ranking) if x == v]
    if len(same) <= 1:
        return pos[v] + 1
    return (min(same) + max(same)) / 2 + 1


def metrics_for(
    findings: Iterable[Finding],
    ground_truth: dict[str, str],
    k: int = 10,
) -> dict:
    """Calcula metricas de ranking para los rankings contextual y solo-CVSS.

    ground_truth: {vuln_id: priority_label} con prioridad esperada por expertos.
    """
    finds = list(findings)
    relevant = _relevant_ids(ground_truth)

    cvss_items = [
        (f.vuln_id, f.cvss_score if f.cvss_score is not None else 0.0) for f in finds
    ]
    contextual_items = [(f.vuln_id, f.priority_score) for f in finds]

    ranking_cvss = _ranked(cvss_items)
    ranking_ctx = _ranked(contextual_items)
    expert = _expert_ranking(ground_truth)

    return {
        "k": k,
        "n_findings": len(finds),
        "n_ground_truth": len(ground_truth),
        "n_relevant": len(relevant),
        "baseline_cvss": {
            "ranking": ranking_cvss,
            "precision_at_k": precision_at_k(ranking_cvss, relevant, k),
            "recall_at_k": recall_at_k(ranking_cvss, relevant, k),
            "ndcg_at_k": ndcg_at_k(ranking_cvss, relevant, k),
        },
        "contextual": {
            "ranking": ranking_ctx,
            "precision_at_k": precision_at_k(ranking_ctx, relevant, k),
            "recall_at_k": recall_at_k(ranking_ctx, relevant, k),
            "ndcg_at_k": ndcg_at_k(ranking_ctx, relevant, k),
        },
        "concordance": {
            "kendall_tau": kendall_tau(ranking_ctx, ranking_cvss),
            "spearman_rho": spearman_rho(ranking_ctx, ranking_cvss),
            "expert_ranking": expert,
            "contextual_vs_expert_tau": kendall_tau(ranking_ctx, expert),
            "baseline_vs_expert_tau": kendall_tau(ranking_cvss, expert),
            "contextual_vs_expert_spearman": spearman_rho(ranking_ctx, expert),
            "baseline_vs_expert_spearman": spearman_rho(ranking_cvss, expert),
        },
        "hypothesis_h1": {
            "ndcg_contextual_gt_baseline": ndcg_at_k(ranking_ctx, relevant, k) >= ndcg_at_k(ranking_cvss, relevant, k),
            "recall_improved": recall_at_k(ranking_ctx, relevant, k) >= recall_at_k(ranking_cvss, relevant, k),
        },
    }
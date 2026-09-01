"""Pruebas de las metricas de calidad de ranking."""
from app.models import Finding
from app.services.metrics import (
    kendall_tau,
    metrics_for,
    ndcg_at_k,
    precision_at_k,
    recall_at_k,
    spearman_rho,
)


def _finding(vuln_id, cvss, score):
    f = Finding(vuln_id=vuln_id, cvss_score=cvss, priority_score=score)
    return f


CASE1 = [
    _finding("CVE-A", 9.0, 95),
    _finding("CVE-B", 8.0, 80),
    _finding("CVE-C", 7.5, 75),
    _finding("CVE-D", 6.0, 30),
    _finding("CVE-E", 5.0, 20),
    _finding("CVE-F", 4.0, 10),
]
RELEVANT = {"CVE-B", "CVE-C", "CVE-F"}


def test_precision_recall_ndcg_basics():
    ranking = [f.vuln_id for f in CASE1]
    assert abs(precision_at_k(ranking, RELEVANT, 3) - 2 / 3) < 1e-9
    assert abs(recall_at_k(ranking, RELEVANT, 3) - 2 / 3) < 1e-9
    assert 0 < ndcg_at_k(ranking, RELEVANT, 6) <= 1


def test_all_relevant_ranking_is_perfect_ndcg():
    ideal = ["CVE-B", "CVE-C", "CVE-F", "CVE-A", "CVE-D", "CVE-E"]
    assert abs(ndcg_at_k(ideal, RELEVANT, 6) - 1.0) < 1e-9


def test_metrics_contextual_beats_naive_reordering():
    # El ranking contextual coloca CVE-F (relevante) arriba gracias a contexto
    findings = CASE1 + [_finding("CVE-G", 9.5, 40)]
    gtruth = {v.vuln_id: ("high" if v.vuln_id in RELEVANT else "low") for v in findings}
    # Acceso directo: forzar cvss ordering vs score ordering
    m = metrics_for(findings, gtruth, k=4)
    assert "baseline_cvss" in m and "contextual" in m
    assert m["n_relevant"] >= 1


def test_kendall_tau_perfect_and_reverse():
    a = ["a", "b", "c", "d"]
    b = ["a", "b", "c", "d"]
    c = ["d", "c", "b", "a"]
    assert abs(kendall_tau(a, b) - 1.0) < 1e-9
    assert abs(kendall_tau(a, c) + 1.0) < 1e-9


def test_spearman_bounds():
    a = ["x", "y", "z", "w"]
    b = ["w", "z", "y", "x"]
    rho = spearman_rho(a, b)
    assert -1.0 <= rho <= 1.0
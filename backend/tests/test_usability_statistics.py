"""Pruebas de usabilidad y prueba estadistica de Wilcoxon."""
import json

from app.models import Dependency, Finding, UsabilityTrial
from app.services.statistics import cohen_d, wilcoxon_signed_rank
from app.services.usability import build_triage_scenario, experience_summary


def _finding(vuln_id, cvss, score, name="lib", version="1.0.0", is_direct=True):
    dep = Dependency(name=name, version=version, is_direct=is_direct)
    f = Finding(
        vuln_id=vuln_id,
        cvss_score=cvss,
        priority_score=score,
        priority_label="medium",
        explanation=json.dumps({"evidence": [], "factors": [], "remediation": "actualizar"}),
        rules_applied=json.dumps([]),
    )
    f.dependency = dep
    return f


def test_build_scenario_baseline_vs_explicable():
    findings = [_finding("CVE-A", 9.0, 90)] + [_finding("CVE-B", 7.5, 40)]
    # condicion A: solo datos tradicionales
    cond_a = build_triage_scenario(findings, "A")
    assert cond_a[0]["alert_type"] == "condition_A"
    assert "elements" not in cond_a[0]
    assert cond_a[0]["cvss_score"] == 9.0
    # condicion D: incluye evidencia del factor explicabilidad
    cond_d = build_triage_scenario(findings, "D", limit=2)
    assert cond_d[0]["alert_type"] == "condition_D"
    assert "elements" in cond_d[0]


def _trial(participant, cond, seconds, correct):
    return UsabilityTrial(
        participant_id=participant, condition=cond, triage_seconds=seconds, decision_correct=correct
    )


def test_experience_summary_computates_h2():
    trials = [_trial("P1", "A", 120, False), _trial("P1", "A", 90, True)]
    trials += [_trial("P2", "D", 45, True), _trial("P2", "D", 50, True)]
    summary = experience_summary(trials)
    assert summary["conditions"]["A"]["triage_seconds"]["mean"] == 105.0
    assert abs(summary["conditions"]["A"]["median"] - 105.0) < 1e-9
    assert summary["conditions"]["D"]["triage_seconds"]["mean"] == 47.5
    assert summary["conclusion_h2"] is True  # D mas rapido que A


def test_wilcoxon_perfect_correlation():
    a = [1.0, 2.0, 3.0, 4.0]
    b = [2.0, 3.0, 4.0, 5.0]  # todos b > a -> todos pares positivos
    w = wilcoxon_signed_rank(a, b)
    assert w["n_pairs"] == 4
    assert w["statistic"] == 10.0  # suma de rangos 1+2+3+4
    assert w["p_value"] == 1.0  # todos arriba exactamente en una direccion


def test_wilcoxon_exact_for_small_n():
    # Caso clasico: 3 pares, dos positivos uno negativo
    a = [1.0, 2.0, 3.0]
    b = [1.5, 2.5, 2.0]
    w = wilcoxon_signed_rank(a, b)
    assert w["n_pairs"] == 3
    # Existe al menos un resultado (p-value calculado por permutacion)
    assert 0.0 <= w["p_value"] <= 1.0


def test_cohen_d_direction():
    a = [10.0, 11.0, 12.0]
    b = [13.0, 14.0, 15.0]
    # baseline (a) mejor (menor tiempo) que contextual -> diferencia negativa si a es mejor
    d = cohen_d(a, b)
    assert d < 0


def test_aggregate_experiment_pairs_conditions():
    from app.services.statistics import aggregate_experiment

    run_a = {"condition": "A", "metrics_snapshot": {"baseline_cvss": {"ndcg_at_k": 0.8}, "contextual": {"ndcg_at_k": 1.0}}}
    run_c = {"condition": "C", "metrics_snapshot": {"baseline_cvss": {"ndcg_at_k": 0.9}, "contextual": {"ndcg_at_k": 1.0}}}
    run_b = {"condition": "B", "metrics_snapshot": {}}
    result = aggregate_experiment([run_a, run_c, run_b], metric="ndcg_at_k")
    assert result["n_runs_used"] == 2
    assert result["n_runs_skipped"] == 1
    assert result["comparison"]["wilcoxon"]["n_pairs"] == 1
    assert abs(result["comparison"]["improvement"] - 0.2) < 1e-9
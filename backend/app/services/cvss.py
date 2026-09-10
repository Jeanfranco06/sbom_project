"""Utilidades para normalizar puntajes CVSS v2/v3 a 0-10 y 0-1."""
from __future__ import annotations

import math
import re


def cvss3_base_score(vector: str) -> float | None:
    """Calcula el Base Score CVSS v3.x a partir de un vector.

    Vector de ejemplo: CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H
    """
    if not vector:
        return None
    parts = {}
    for piece in vector.replace("CVSS:3.0", "").replace("CVSS:3.1", "").split("/"):
        piece = piece.strip().lstrip("/")
        if not piece:
            continue
        if ":" in piece:
            k, v = piece.split(":", 1)
            parts[k.strip()] = v.strip()

    av = {"N": 0.85, "A": 0.62, "L": 0.55, "P": 0.2}.get(parts.get("AV"), 0.0)
    ac = {"L": 0.77, "H": 0.44}.get(parts.get("AC"), 0.0)
    scope = parts.get("S", "U")
    pr = {"N": 0.85}.get(parts.get("PR"), 0.0)
    if parts.get("PR") in ("L", "H"):
        pr = {"L": 0.27, "H": 0.5}[parts["PR"]] if scope == "C" else {"L": 0.62, "H": 0.27}[parts["PR"]]
    ui = {"N": 0.85, "R": 0.62}.get(parts.get("UI"), 0.0)
    conf = {"H": 0.56, "L": 0.22, "N": 0.0}.get(parts.get("C"), 0.0)
    integ = {"H": 0.56, "L": 0.22, "N": 0.0}.get(parts.get("I"), 0.0)
    avail = {"H": 0.56, "L": 0.22, "N": 0.0}.get(parts.get("A"), 0.0)

    iss = 1.0 - (1.0 - conf) * (1.0 - integ) * (1.0 - avail)
    if scope == "C":
        impact = 7.52 * (iss - 0.029) - 3.25 * (iss - 0.02) ** 15
    else:
        impact = 6.42 * iss
    exploitability = 8.22 * av * ac * pr * ui
    if impact <= 0:
        return 0.0
    raw = min(impact + exploitability, 10.0)
    return math.ceil(raw * 10) / 10.0


def cvss2_base_score(vector: str) -> float | None:
    """Calcula el Base Score CVSSv2 a partir de un vector."""
    if not vector:
        return None
    text = vector.replace("AV", "").replace("CVSS2#", "")
    if "AV:N" in vector:
        av = 1.0
    elif "AV:A" in vector:
        av = 0.646
    elif "AV:L" in vector:
        av = 0.395
    else:
        av = 0.0
    ac = 0.71 if "AC:L" in vector else 0.35
    au = {"N": 0.704, "S": 0.56, "M": 0.45}.get(
        re.search(r"AU:([NSM])", text).group(1) if re.search(r"AU:([NSM])", text) else "N", 0.704
    )
    c = {"N": 0.0, "P": 0.275, "C": 0.660}.get(
        (re.search(r"C:([NPC])", text).group(1) if re.search(r"C:([NPC])", text) else "N"), 0.0
    )
    i = {"N": 0.0, "P": 0.275, "C": 0.660}.get(
        (re.search(r"I:([NPC])", text).group(1) if re.search(r"I:([NPC])", text) else "N"), 0.0
    )
    a = {"N": 0.0, "P": 0.275, "C": 0.660}.get(
        (re.search(r"A:([NPC])", text).group(1) if re.search(r"A:([NPC])", text) else "N"), 0.0
    )
    impact = 10.41 * (1 - (1 - c) * (1 - i) * (1 - a))
    exploitability = 20 * av * ac * au
    fimpact = 0 if impact == 0 else 1.176
    raw = ((0.6 * impact) + (0.4 * exploitability) - 1.5) * fimpact
    return max(0.0, round(min(raw, 10.0), 1))


def parse_cvss_score(severity_entries: list[dict]) -> tuple[float | None, str | None]:
    """Extrae (base_score, severidad) de la lista 'severity' de OSV."""
    for entry in severity_entries or []:
        score = entry.get("score") or ""
        etype = (entry.get("type") or "").upper()
        if "CVSS_V3" in etype or "CVSS3" in score:
            base = cvss3_base_score(score)
            if base is not None:
                return base, _severity_label(base)
        elif "CVSS_V2" in etype:
            base = cvss2_base_score(score)
            if base is not None:
                return base, _severity_label(base)
    return None, None


def parse_cvss_vector(severity_entries: list[dict]) -> dict | None:
    """Extrae componentes del vector CVSS (CIA impact, attack vector, etc.)."""
    for entry in severity_entries or []:
        score = entry.get("score") or ""
        etype = (entry.get("type") or "").upper()
        if "CVSS_V3" in etype or "CVSS3" in score:
            return _parse_cvss3_vector(score)
        elif "CVSS_V2" in etype:
            return _parse_cvss2_vector(score)
    return None


def _parse_cvss3_vector(vector: str) -> dict | None:
    if not vector:
        return None
    parts = {}
    for piece in vector.replace("CVSS:3.0", "").replace("CVSS:3.1", "").split("/"):
        piece = piece.strip().lstrip("/")
        if not piece or ":" not in piece:
            continue
        k, v = piece.split(":", 1)
        parts[k.strip()] = v.strip()

    impact_labels = {"H": "alto", "L": "bajo", "N": "ninguno"}
    av_labels = {"N": "red", "A": "local", "L": "local", "P": "fisico"}
    pr_labels = {"N": "ninguna", "L": "baja", "H": "alta"}
    ui_labels = {"N": "ninguna", "R": "reԛuerida"}

    return {
        "vector": vector,
        "confidentiality": impact_labels.get(parts.get("C", "N"), "desconocido"),
        "integrity": impact_labels.get(parts.get("I", "N"), "desconocido"),
        "availability": impact_labels.get(parts.get("A", "N"), "desconocido"),
        "attack_vector": av_labels.get(parts.get("AV", "N"), "desconocido"),
        "attack_complexity": "baja" if parts.get("AC") == "L" else "alta",
        "privileges_required": pr_labels.get(parts.get("PR", "N"), "desconocido"),
        "user_interaction": ui_labels.get(parts.get("UI", "N"), "desconocido"),
        "scope": "cambiado" if parts.get("S") == "C" else "sin cambio",
    }


def _parse_cvss2_vector(vector: str) -> dict | None:
    if not vector:
        return None
    impact_labels = {"C": "completo", "P": "parcial", "N": "ninguno"}
    av_labels = {"N": "red", "A": "local", "L": "local"}

    c_match = re.search(r"C:([NPC])", vector)
    i_match = re.search(r"I:([NPC])", vector)
    a_match = re.search(r"A:([NPC])", vector)
    av_match = re.search(r"AV:([NAL])", vector)

    return {
        "vector": vector,
        "confidentiality": impact_labels.get(c_match.group(1) if c_match else "N", "desconocido"),
        "integrity": impact_labels.get(i_match.group(1) if i_match else "N", "desconocido"),
        "availability": impact_labels.get(a_match.group(1) if a_match else "N", "desconocido"),
        "attack_vector": av_labels.get(av_match.group(1) if av_match else "N", "desconocido"),
        "attack_complexity": "baja",
        "privileges_required": "desconocido",
        "user_interaction": "desconocido",
        "scope": "sin cambio",
    }


def _severity_label(score: float) -> str:
    if score >= 9.0:
        return "CRITICAL"
    if score >= 7.0:
        return "HIGH"
    if score >= 4.0:
        return "MEDIUM"
    if score > 0.0:
        return "LOW"
    return "NONE"


def normalize_severity(label: str | None) -> str | None:
    if not label:
        return None
    label = label.upper()
    mapping = {
        "CRITICAL": "critical",
        "HIGH": "high",
        "MEDIUM": "medium",
        "LOW": "low",
        "NONE": "info",
    }
    return mapping.get(label, label.lower())
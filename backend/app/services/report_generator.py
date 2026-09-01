"""Exportacion de reportes: JSON, CSV y PDF (ReportLab) offline."""
from __future__ import annotations

import csv
import io
import json
from datetime import datetime, timezone
from typing import Iterable

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from ..models import Finding, Project
from .analysis_service import to_finding_dict

PRIORITY_COLORS = {
    "critical": "#DC2626",
    "high": "#EA580C",
    "medium": "#EAB308",
    "low": "#3B82F6",
    "info": "#6B7280",
}


def export_json(project: Project, findings: Iterable[Finding]) -> str:
    rows = [to_finding_dict(None, f) for f in findings]
    payload = {
        "metadata": {
            "project": {
                "id": project.id,
                "name": project.name,
                "path": project.path,
                "environment": project.environment,
                "internet_exposed": project.internet_exposed,
                "data_criticality": project.data_criticality,
            },
            "generator": "secsbom",
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
        "findings": rows,
    }
    return json.dumps(payload, indent=2, ensure_ascii=False)


def export_csv(findings: Iterable[Finding]) -> str:
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "priority_label",
            "priority_score",
            "cve_id",
            "package",
            "version",
            "is_direct",
            "is_dev",
            "depth",
            "cvss_score",
            "cvss_severity",
            "epss_score",
            "is_kev",
            "patch_available",
            "fixed_versions",
            "summary",
        ]
    )
    for f in findings:
        fixed = "/".join(json.loads(f.fixed_versions or "[]"))
        writer.writerow(
            [
                f.priority_label,
                f.priority_score,
                f.vuln_id,
                f.dependency.name,
                f.dependency.version,
                f.dependency.is_direct,
                f.dependency.is_dev,
                f.dependency.depth,
                f.cvss_score if f.cvss_score is not None else "",
                f.cvss_severity or "",
                f.epss_score if f.epss_score is not None else "",
                f.is_kev,
                f.patch_available,
                fixed,
                (f.summary or "").replace("\n", " ").strip(),
            ]
        )
    return output.getvalue()


def export_pdf(project: Project, findings: Iterable[Finding]) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        rightMargin=12 * mm,
        leftMargin=12 * mm,
        topMargin=12 * mm,
        bottomMargin=12 * mm,
        title=f"Reporte vulnerabilidades - {project.name}",
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("TitleSec", parent=styles["Title"], fontSize=16)
    small = ParagraphStyle("Small", parent=styles["BodyText"], fontSize=8)

    elements = [Paragraph(f"Reporte de priorizacion contextual - {project.name}", title_style)]
    elements.append(
        Paragraph(
            f"Entorno: {project.environment} | Expuesto: {project.internet_exposed} | "
            f"Criticidad datos: {project.data_criticality}",
            small,
        )
    )
    elements.append(Spacer(1, 6 * mm))

    data = [
        [
            Paragraph("<b>Prioridad</b>", small),
            Paragraph("<b>CVE</b>", small),
            Paragraph("<b>Paquete</b>", small),
            Paragraph("<b>Version</b>", small),
            Paragraph("<b>Tipo</b>", small),
            Paragraph("<b>CVSS</b>", small),
            Paragraph("<b>EPSS</b>", small),
            Paragraph("<b>KEV</b>", small),
            Paragraph("<b>Parche</b>", small),
            Paragraph("<b>Resumen</b>", small),
        ]
    ]
    for f in findings:
        dep = f.dependency
        kind = "directa" if dep.is_direct else "transitiva"
        if dep.is_dev:
            kind += "/dev"
        data.append(
            [
                Paragraph(f"<b>{f.priority_label.upper()}</b><br/>{f.priority_score}", small),
                Paragraph(f.vuln_id, small),
                Paragraph(dep.name, small),
                Paragraph(dep.version, small),
                Paragraph(kind, small),
                Paragraph(str(f.cvss_score if f.cvss_score is not None else "-"), small),
                Paragraph(
                    f"{f.epss_score:.4f}" if f.epss_score is not None else "-", small
                ),
                Paragraph("SI" if f.is_kev else "no", small),
                Paragraph("SI" if f.patch_available else "no", small),
                Paragraph((f.summary or "")[:120], small),
            ]
        )

    table = Table(data, repeatRows=1, colWidths=[18 * mm, 28 * mm, 30 * mm, 20 * mm, 22 * mm, 16 * mm, 18 * mm, 12 * mm, 18 * mm, 60 * mm])
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1F2937")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]
    table.setStyle(TableStyle(style))
    elements.append(table)
    doc.build(elements)
    return buffer.getvalue()
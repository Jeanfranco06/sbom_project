"""Generador de SBOM en formato CycloneDX JSON (spec 1.4).

Genera un documento CycloneDX valido con la lista de componentes (dependencias
directas y transitivas) y la seccion de dependencias (grafo directo->transitivo).
"""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Iterable

from ..models import Dependency, Project


def _component_dict(d: Dependency) -> dict:
    comp = {
        "type": "library",
        "bom-ref": d.purl,
        "name": d.name,
        "purl": d.purl,
    }
    if d.version:
        comp["version"] = d.version
    properties = [
        {"name": "secsbom:is_direct", "value": str(d.is_direct).lower()},
        {"name": "secsbom:depth", "value": str(d.depth)},
        {"name": "secsbom:is_dev", "value": str(d.is_dev).lower()},
        {"name": "secsbom:category", "value": d.category},
        {"name": "secsbom:source", "value": d.source},
    ]
    comp["properties"] = properties
    return comp


def generate_cyclonedx_json(project: Project, dependencies: Iterable[Dependency]) -> str:
    """Construye la SBOM CycloneDX JSON del analisis del proyecto."""
    deps = list(dependencies)

    bom = {
        "bomFormat": "CycloneDX",
        "specVersion": "1.4",
        "serialNumber": "urn:uuid:" + str(uuid.uuid4()),
        "version": 1,
        "metadata": {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "tools": [
                {
                    "vendor": "sec_sbom",
                    "name": "secsbom-sbom-generator",
                    "version": "1.0.0",
                }
            ],
            "component": {
                "type": "application",
                "bom-ref": f"application-{project.id}",
                "name": project.name,
                "version": "1.0.0",
                "properties": [
                    {"name": "secsbom:environment", "value": project.environment},
                    {"name": "secsbom:internet_exposed", "value": str(project.internet_exposed).lower()},
                    {"name": "secsbom:data_criticality", "value": project.data_criticality},
                ],
            },
        },
        "components": [_component_dict(d) for d in deps],
        "dependencies": [],
    }

    dep_refs: dict[str, list[str]] = {d.purl: [] for d in deps}
    for d in deps:
        for edge in d.edges_from:
            target_ref = edge.target.purl
            if target_ref in dep_refs:
                dep_refs.setdefault(d.purl, [])
                if target_ref not in dep_refs[d.purl]:
                    dep_refs[d.purl].append(target_ref)

    # La raiz (aplicacion) depende de las dependencias directas
    direct_refs = [d.purl for d in deps if d.is_direct]
    dependencies_section = [{"ref": f"application-{project.id}", "dependsOn": direct_refs}]
    dependencies_section += [
        {"ref": ref, "dependsOn": sorted(children)} for ref, children in sorted(dep_refs.items())
    ]
    bom["dependencies"] = dependencies_section

    return json.dumps(bom, indent=2, ensure_ascii=False)
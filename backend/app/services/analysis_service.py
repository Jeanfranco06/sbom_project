"""Servicio de orquestacion del analisis completo de un proyecto."""
from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy.orm import Session

import hashlib
from pathlib import Path

from ..config import settings
from ..models import Analysis, Dependency, DependencyEdge, Finding, Project, Setting
from .dependency_analyzer import analyze_project_dir
from .enrichment import EnrichmentService
from .explainability import build_explanation
from .prioritization import PrioritizationEngine
from .snapshot_manager import SnapshotManager
from .vulnerability_correlator import VulnerabilityCorrelator


def make_purl(name: str, version: str, ecosystem: str = "PyPI") -> str:
    if ecosystem.lower() == "nuget":
        base = f"pkg:nuget/{name}"
    else:
        base = f"pkg:pypi/{name.lower()}"
    return f"{base}@{version}" if version else base

def _hash_manifest(project_path: str) -> str | None:
    p = Path(project_path)
    for name in ("poetry.lock", "Pipfile.lock", "requirements.txt", "pyproject.toml"):
        f = p / name
        if f.exists():
            return hashlib.sha256(f.read_bytes()).hexdigest()
    return None

class AnalysisService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.snapshots = SnapshotManager(settings)
        self.correlator = VulnerabilityCorrelator(settings, self.snapshots)
        self.enrichment = EnrichmentService(self.snapshots, self.correlator)
        self.weights = Setting.get(self.db, "weights") or dict(settings.weights)
        self.thresholds = Setting.get(self.db, "thresholds") or dict(settings.thresholds)
        self.engine = PrioritizationEngine(settings, self.weights, self.thresholds)

    def _reset_project_dependencies(self, project: Project) -> None:
        for dep in list(project.dependencies):
            self.db.delete(dep)
        self.db.flush()

    def analyze(self, project_id: int, mode: str | None = None) -> Analysis:
        analysis = Analysis(
            project_id=project_id,
            mode=mode or settings.mode,
            status="running",
        )
        self.db.add(analysis)
        self.db.commit()

        try:
            project = self.db.get(Project, project_id)
            if project is None:
                raise ValueError("Proyecto no encontrado")

            analysis.manifest_sha256 = _hash_manifest(project.path)
            
            metadata = self.snapshots.active_snapshots()
            metadata["mode"] = analysis.mode
            analysis.snapshot_metadata = json.dumps(metadata)

            packages, raw_edges = analyze_project_dir(project.path)
            self._reset_project_dependencies(project)

            dep_map: dict[str, Dependency] = {}
            for pkg in packages:
                dep = Dependency(
                    project_id=project.id,
                    name=pkg.name,
                    version=pkg.version,
                    is_direct=pkg.is_direct,
                    is_dev=pkg.is_dev,
                    category=pkg.category,
                    depth=pkg.depth,
                    purl=make_purl(pkg.name, pkg.version, pkg.ecosystem),
                    requirement_type="dev" if pkg.is_dev else "prod",
                    source=pkg.source,
                    ecosystem=pkg.ecosystem,
                )
                self.db.add(dep)
                dep_map[pkg.name] = dep
            self.db.flush()

            for src, dst in raw_edges:
                s = dep_map.get(src)
                t = dep_map.get(dst)
                if s and t:
                    self.db.add(DependencyEdge(project_id=project.id, source_id=s.id, target_id=t.id))
            self.db.flush()

            # Correlacion OSV + enriquecimiento + priorizacion + explicabilidad
            for dep in dep_map.values():
                if not dep.version or dep.version == "0.0":
                    continue
                vulns = self.correlator.correlate(dep.name, dep.version, dep.ecosystem)
                best: dict[str, tuple[Dependency, dict]] = {}
                for raw in vulns:
                    candidate = self.enrichment.enrich(raw)
                    if not candidate.get("vuln_id"):
                        continue
                    key = candidate["cves"][0] if candidate.get("cves") else candidate["vuln_id"]
                    existing = best.get(key)
                    if existing is None:
                        best[key] = (dep, candidate)
                        continue
                    best[key] = (dep, _merge_candidates(existing[1], candidate))
                for dep_c, cand in best.values():
                    finding = self._build_finding(project, dep_c, cand)
                    self.db.add(finding)
            self.db.commit()

            project.last_analysis_at = datetime.now(timezone.utc)
            analysis.status = "done"
            self.db.commit()
            return analysis
        except Exception as exc:  # noqa: BLE001
            self.db.rollback()
            analysis.status = "error"
            analysis.error = str(exc)[:2000]
            self.db.commit()
            raise

    def _build_finding(self, project: Project, dep: Dependency, candidate: dict) -> Finding:
        values = self.engine.factor_values(project, dep, candidate)
        score = self.engine.score(values)
        label = self.engine.label_for(score)
        score, label, rules = self.engine.apply_exceptions(project, dep, candidate, score, label)
        explanation = build_explanation(
            project, dep, candidate, values, score, label, rules, self.weights
        )
        finding = Finding(
            project_id=project.id,
            dependency_id=dep.id,
            vuln_id=candidate["vuln_id"],
            source="osv",
            summary=candidate.get("summary"),
            details=candidate.get("details"),
            aliases=json.dumps(candidate.get("aliases", [])),
            cvss_score=candidate.get("cvss_score"),
            cvss_severity=candidate.get("cvss_severity"),
            epss_score=candidate.get("epss_score"),
            is_kev=candidate.get("is_kev") or False,
            patch_available=candidate.get("patch_available") or False,
            fixed_versions=json.dumps(candidate.get("fixed_versions", [])),
            introduced_versions=json.dumps(candidate.get("introduced_versions", [])),
            priority_score=score,
            priority_label=label,
            factors=json.dumps({k: v for k, v in values.items()}),
            explanation=json.dumps(explanation, ensure_ascii=False),
            rules_applied=json.dumps(rules),
        )
        return finding


def _merge_candidates(a: dict, b: dict) -> dict:
    """Fusiona dos candidatos que referencian el mismo CVE (OSV repite entradas).

    Prefiere el representante con CVSS o resumen disponible y unifica los
    rangos de versiones y aliases.
    """
    def richer(x: dict) -> bool:
        return (x.get("cvss_score") is not None and x.get("cvss_score") > 0) or bool(x.get("summary") or x.get("details"))

    keep, drop = (a, b) if richer(a) else (b, a)
    keep = dict(keep)
    keep["aliases"] = sorted(set(keep.get("aliases", []) + drop.get("aliases", [])))
    keep["fixed_versions"] = sorted(set(keep.get("fixed_versions", []) + drop.get("fixed_versions", [])))
    keep["introduced_versions"] = sorted(set(keep.get("introduced_versions", []) + drop.get("introduced_versions", [])))
    if not keep.get("summary") and drop.get("summary"):
        keep["summary"] = drop["summary"]
    if not keep.get("details") and drop.get("details"):
        keep["details"] = drop["details"]
    if keep.get("cvss_score") is None and drop.get("cvss_score") is not None:
        keep["cvss_score"] = drop["cvss_score"]
        keep["cvss_severity"] = drop["cvss_severity"]
    if keep.get("epss_score") is None and drop.get("epss_score") is not None:
        keep["epss_score"] = drop["epss_score"]
    keep["is_kev"] = keep.get("is_kev") or drop.get("is_kev")
    keep["patch_available"] = keep.get("patch_available") or drop.get("patch_available")
    return keep


def to_finding_dict(db: Session, finding: Finding, extra_weights: dict | None = None) -> dict:
    """Serializa un hallazgo agregando contexto de la dependencia."""
    dep = finding.dependency
    return {
        "id": finding.id,
        "dependency_id": dep.id,
        "dependency_name": dep.name,
        "dependency_version": dep.version,
        "is_direct": dep.is_direct,
        "is_dev": dep.is_dev,
        "depth": dep.depth,
        "purl": dep.purl,
        "vuln_id": finding.vuln_id,
        "source": finding.source,
        "summary": finding.summary,
        "aliases": json.loads(finding.aliases or "[]"),
        "cvss_score": finding.cvss_score,
        "cvss_severity": finding.cvss_severity,
        "epss_score": finding.epss_score,
        "is_kev": finding.is_kev,
        "patch_available": finding.patch_available,
        "fixed_versions": json.loads(finding.fixed_versions or "[]"),
        "priority_score": finding.priority_score,
        "priority_label": finding.priority_label,
        "explanation": json.loads(finding.explanation or "{}"),
        "rules_applied": json.loads(finding.rules_applied or "[]"),
        "created_at": finding.created_at.isoformat() if finding.created_at else None,
    }


def summary_for(db: Session, project: Project, analysis: Analysis) -> dict:
    deps = db.query(Dependency).filter_by(project_id=project.id).all()
    findings = db.query(Finding).filter_by(project_id=project.id).all()
    by_priority: dict[str, int] = {}
    kev_count = 0
    patch_count = 0
    for f in findings:
        by_priority[f.priority_label] = by_priority.get(f.priority_label, 0) + 1
        if f.is_kev:
            kev_count += 1
        if f.patch_available:
            patch_count += 1
    return {
        "project": {
            "id": project.id,
            "name": project.name,
            "path": project.path,
            "environment": project.environment,
            "internet_exposed": project.internet_exposed,
            "data_criticality": project.data_criticality,
            "created_at": project.created_at.isoformat() if project.created_at else None,
            "last_analysis_at": project.last_analysis_at.isoformat() if project.last_analysis_at else None,
        },
        "analysis": {
            "id": analysis.id,
            "mode": analysis.mode,
            "status": analysis.status,
            "error": analysis.error,
            "created_at": analysis.created_at.isoformat() if analysis.created_at else None,
        },
        "dependency_count": len(deps),
        "direct_count": sum(1 for d in deps if d.is_direct),
        "transitive_count": sum(1 for d in deps if not d.is_direct),
        "finding_count": len(findings),
        "kev_finding_count": kev_count,
        "patch_available_count": patch_count,
        "by_priority": by_priority,
    }
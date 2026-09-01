"""Esquemas Pydantic para la API."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

PRIORITY_LABELS = ["critical", "high", "medium", "low", "info"]
ENVIRONMENTS = ["production", "staging", "development"]
CRITICALITIES = ["high", "medium", "low"]


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    path: str
    description: str | None = None
    environment: str = "production"
    internet_exposed: bool = True
    data_criticality: str = "medium"


class ProjectUpdate(BaseModel):
    name: str | None = None
    path: str | None = None
    description: str | None = None
    environment: str | None = None
    internet_exposed: bool | None = None
    data_criticality: str | None = None


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    path: str
    description: str | None
    environment: str
    internet_exposed: bool
    data_criticality: str
    created_at: datetime
    last_analysis_at: datetime | None


class WeightsUpdate(BaseModel):
    cvss: float
    kev: float
    epss: float
    exposure: float
    environment: float
    dependency: float
    data_criticality: float
    remediation: float


class ThresholdsUpdate(BaseModel):
    critical: float = 80
    high: float = 60
    medium: float = 40
    low: float = 20


class SettingsOut(BaseModel):
    mode: str
    weights: dict
    thresholds: dict


class DependencyOut(BaseModel):
    id: int
    name: str
    version: str
    is_direct: bool
    is_dev: bool
    category: str
    depth: int
    purl: str
    requirement_type: str
    source: str


class AnalysisOut(BaseModel):
    id: int
    project_id: int
    mode: str
    status: str
    error: str | None
    created_at: datetime


class FindingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    dependency_id: int
    dependency_name: str
    dependency_version: str
    is_direct: bool
    depth: int
    vuln_id: str
    source: str
    summary: str | None
    aliases: list[str]
    cvss_score: float | None
    cvss_severity: str | None
    epss_score: float | None
    is_kev: bool
    patch_available: bool
    fixed_versions: list[str]
    priority_score: float
    priority_label: str
    explanation: dict


class ExportRequest(BaseModel):
    format: str = "json"  # json|csv|pdf
    include_explanations: bool = True


class ExperimentRunCreate(BaseModel):
    condition: str  # A | B | C | D
    mode: str = "offline"
    metrics_snapshot: dict | None = None
    findings_snapshot: list | None = None


class UsabilityTrialCreate(BaseModel):
    participant_id: str
    condition: str  # A | B | C | D
    scenario: str = ""
    project_id: int | None = None
    triage_seconds: float = Field(gt=0)
    decision_correct: bool = False
    sus_score: float | None = Field(default=None, ge=0, le=100)
    usefulness_rating: float | None = Field(default=None, ge=1, le=5)
    comprehension_answers: dict = {}
    chosen_action: str | None = None
    comment: str | None = None


class StatisticsRequest(BaseModel):
    metric: str = "ndcg_at_k"  # ndcg_at_k | precision_at_k | recall_at_k | triage_seconds


class GroundTruthItem(BaseModel):
    vuln_id: str
    component: str = ""
    installed_version: str = ""
    is_direct_dependency: bool = False
    environment: str = "production"
    internet_exposed: bool = True
    data_criticality: str = "medium"
    patch_available: bool = True
    expected_priority: str = "medium"
    justification: str | None = None


class SnapshotDownloadResult(BaseModel):
    kev: str | None
    epss: str | None
    mode: str


class AnalysisSummary(BaseModel):
    project: ProjectOut
    analysis: AnalysisOut
    dependency_count: int
    direct_count: int
    transitive_count: int
    finding_count: int
    by_priority: dict[str, int]
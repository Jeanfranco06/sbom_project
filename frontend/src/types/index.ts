export interface Project {
  id: number;
  name: string;
  path: string;
  description: string | null;
  source_type: 'local' | 'git' | 'upload';
  git_url: string | null;
  environment: 'production' | 'staging' | 'development';
  internet_exposed: boolean;
  data_criticality: 'high' | 'medium' | 'low';
  created_at: string;
  last_analysis_at: string | null;
}

export interface Dependency {
  id: number;
  project_id: number;
  name: string;
  version: string;
  is_direct: boolean;
  is_dev: boolean;
  category: string | null;
  depth: number;
  purl: string | null;
  requirement_type: string | null;
  source: string | null;
  ecosystem: string;
}

export interface Finding {
  id: number;
  project_id: number;
  dependency_id: number;
  vuln_id: string;
  source: string;
  summary: string | null;
  details: string | null;
  aliases: string | null;
  cvss_score: number | null;
  cvss_severity: string | null;
  epss_score: number | null;
  is_kev: boolean;
  patch_available: boolean;
  fixed_versions: string[] | null;
  introduced_versions: string | null;
  priority_score: number;
  priority_label: string;
  factors: string | null;
  explanation: Explanation | string | null;
  rules_applied: string | null;
  dependency?: Dependency;
}

export interface Analysis {
  id: number;
  project_id: number;
  mode: string;
  status: 'pending' | 'running' | 'done' | 'error';
  error: string | null;
  manifest_sha256: string | null;
  snapshot_metadata: string | null;
  created_at: string;
}

export interface AnalysisSummary {
  project: Project;
  analysis: Analysis | null;
  dependency_count: number;
  direct_count: number;
  transitive_count: number;
  finding_count: number;
  kev_finding_count?: number;
  patch_available_count?: number;
  by_priority: Record<string, number>;
}

export interface GroundTruth {
  id: number;
  project_id: number;
  vuln_id: string;
  component: string;
  installed_version: string;
  is_direct_dependency: boolean;
  environment: string;
  internet_exposed: boolean;
  data_criticality: string;
  patch_available: boolean;
  expected_priority: string;
  justification: string | null;
}

export interface Metrics {
  precision_at_k: number[];
  recall_at_k: number[];
  ndcg_at_k: number[];
  kendall_tau: number;
  spearman_rho: number;
  baseline_metrics: {
    precision_at_k: number[];
    recall_at_k: number[];
    ndcg_at_k: number[];
  };
}

export interface Weights {
  cvss: number;
  kev: number;
  epss: number;
  exposure: number;
  environment: number;
  dependency: number;
  data_criticality: number;
  remediation: number;
}

export interface UsabilityTrial {
  id: number;
  participant_id: string;
  condition: 'A' | 'B' | 'C' | 'D';
  scenario: string;
  project_id: number;
  triage_seconds: number;
  decision_correct: boolean;
  sus_score: number | null;
  usefulness_rating: number | null;
  comprehension_answers: string | null;
  chosen_action: string | null;
  comment: string | null;
}

export interface ExperimentRun {
  id: number;
  project_id: number;
  condition: 'A' | 'B' | 'C' | 'D';
  mode: string;
  analysis_id: number;
  metrics_snapshot: string | null;
  findings_snapshot: string | null;
}

export interface SnapshotStatus {
  mode: string;
  kev: {
    available: boolean;
    last_updated: string | null;
    count: number;
  };
  epss: {
    available: boolean;
    last_updated: string | null;
    count: number;
  };
}

export interface SettingsOut {
  mode: string;
  weights: Weights;
  thresholds: Record<string, number>;
}

export interface GraphData {
  nodes: Array<{
    id: string;
    name: string;
    version: string;
    is_direct: boolean;
    is_vulnerable: boolean;
    depth: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
  }>;
}

export type PriorityLabel = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface ExplanationFactor {
  factor: string;
  label: string;
  source: string;
  value_normalized: number;
  internal_value: unknown;
  weight_pct: number;
  contribution_pct: number;
  note: string;
}

export interface ExplanationEvidence {
  source: string;
  value?: unknown;
  severity?: string;
  fixed_versions?: string[];
  details?: string;
}

export interface RiskImpact {
  cia: {
    confidentiality: string;
    integrity: string;
    availability: string;
  };
  business_impacts: string[];
  exposure_context: string[];
  exploitation: string[];
  risk_level: string;
  impact_summary: string;
}

export interface Explanation {
  component: { name: string; version: string };
  vulnerability: string;
  aliases: string[];
  priority: { score: number; label: string };
  profile: { environment: string; internet_exposed: boolean; data_criticality: string };
  factors: ExplanationFactor[];
  rules_applied: string[];
  remediation: string;
  risk_impact: RiskImpact;
  evidence: ExplanationEvidence[];
}

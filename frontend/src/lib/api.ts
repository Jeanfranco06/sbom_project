import type {
  Project,
  Analysis,
  AnalysisSummary,
  Dependency,
  Finding,
  GroundTruth,
  Metrics,
  Weights,
  UsabilityTrial,
  ExperimentRun,
  SnapshotStatus,
  GraphData,
  SettingsOut,
} from '@/types';

const API_BASE = '/api';

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }

  return response.json();
}

async function fetchBlob(endpoint: string): Promise<Blob> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }
  return response.blob();
}

export const api = {
  // Version
  getVersion: () => fetchApi<{ version: string }>('/version'),

  // Projects
  getProjects: () => fetchApi<Project[]>('/projects'),
  getProject: (id: number) => fetchApi<Project>(`/projects/${id}`),
  createProject: (data: Partial<Project>) =>
    fetchApi<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateProject: (id: number, data: Partial<Project>) =>
    fetchApi<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteProject: (id: number) =>
    fetchApi<void>(`/projects/${id}`, { method: 'DELETE' }),

  // Analysis
  analyzeProject: (id: number, mode: string = 'hybrid') =>
    fetchApi<Analysis>(`/projects/${id}/analyze?mode=${mode}`, {
      method: 'POST',
    }),
  getAnalysis: (id: number) => fetchApi<AnalysisSummary>(`/projects/${id}/analysis`),

  // Dependencies
  getDependencies: (id: number) =>
    fetchApi<Dependency[]>(`/projects/${id}/dependencies`),

  // Findings
  getFindings: (
    id: number,
    filters?: {
      priority?: string;
      kev?: boolean;
      direct?: boolean;
      q?: string;
    }
  ) => {
    const params = new URLSearchParams();
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.kev) params.append('kev', 'true');
    if (filters?.direct) params.append('direct', 'true');
    if (filters?.q) params.append('q', filters.q);
    const query = params.toString();
    return fetchApi<Finding[]>(`/projects/${id}/findings${query ? `?${query}` : ''}`);
  },
  getFinding: (projectId: number, findingId: number) =>
    fetchApi<Finding>(`/projects/${projectId}/findings/${findingId}`),

  // SBOM
  getSBOM: (id: number) => fetchApi<unknown>(`/projects/${id}/sbom`),

  // Graph
  getGraph: (id: number) => fetchApi<GraphData>(`/projects/${id}/graph`),

  // Ground Truth
  getGroundTruth: (id: number) =>
    fetchApi<GroundTruth[]>(`/projects/${id}/ground-truth`),
  setGroundTruth: (id: number, data: Partial<GroundTruth>[]) =>
    fetchApi<{ count: number }>(`/projects/${id}/ground-truth`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteGroundTruth: (id: number) =>
    fetchApi<void>(`/projects/${id}/ground-truth`, { method: 'DELETE' }),

  // Metrics
  getMetrics: (id: number, k: number = 10) =>
    fetchApi<Metrics>(`/projects/${id}/metrics?k=${k}`),

  // Settings
  getSettings: () => fetchApi<SettingsOut>('/settings'),
  updateWeights: (weights: Weights) =>
    fetchApi<Weights>('/settings/weights', {
      method: 'PUT',
      body: JSON.stringify(weights),
    }),

  // Mode
  updateMode: (mode: string) =>
    fetchApi<{ mode: string }>('/settings/mode', {
      method: 'PUT',
      body: JSON.stringify({ mode }),
    }),

  // Snapshots
  getSnapshotStatus: () => fetchApi<SnapshotStatus>('/snapshots/status'),
  downloadSnapshots: () =>
    fetchApi<{ status: string }>('/snapshots/download', { method: 'POST' }),

  // Usability
  getTriageScenario: (projectId: number, condition: 'A' | 'D') =>
    fetchApi<{
      condition: string;
      project_id: number;
      cards: Finding[];
    }>(`/projects/${projectId}/triage/${condition}`),
  createTrial: (trial: Partial<UsabilityTrial>) =>
    fetchApi<UsabilityTrial>('/usability/trials', {
      method: 'POST',
      body: JSON.stringify(trial),
    }),
  getTrials: () => fetchApi<UsabilityTrial[]>('/usability/trials'),
  getTrialsSummary: () =>
    fetchApi<{
      condition_a: { avg_time: number; accuracy: number; count: number };
      condition_d: { avg_time: number; accuracy: number; count: number };
    }>('/usability/trials/summary'),
  deleteTrials: () =>
    fetchApi<void>('/usability/trials', { method: 'DELETE' }),

  // Experiments
  getRuns: (projectId: number) =>
    fetchApi<ExperimentRun[]>(`/projects/${projectId}/runs`),
  createRun: (projectId: number, run: Partial<ExperimentRun>) =>
    fetchApi<ExperimentRun>(`/projects/${projectId}/runs`, {
      method: 'POST',
      body: JSON.stringify(run),
    }),
  deleteRuns: (projectId: number) =>
    fetchApi<void>(`/projects/${projectId}/runs`, { method: 'DELETE' }),
  getStatistics: (metric: string) =>
    fetchApi<{
      statistic: number;
      p_value: number;
      effect_size: number;
      n_pairs: number;
    }>(`/experiment/statistics?metric=${metric}`),

  // Risk Assessment
  getRiskAssessment: (id: number) =>
    fetchApi<{
      project_id: number;
      overall_risk_score: number;
      risk_level: string;
      dimensions: Array<{
        name: string;
        label: string;
        score: number;
        weight: number;
        findings_count: number;
        critical_count: number;
        description: string;
      }>;
      top_actions: Array<{
        priority: number;
        title: string;
        description: string;
        effort: string;
        affected_packages: string[];
        risk_reduction: number;
        finding_ids: number[];
      }>;
      summary: string;
      stats: Record<string, unknown>;
    }>(`/projects/${id}/risk-assessment`),

  // Export
  exportProject: (id: number, format: 'json' | 'csv' | 'pdf') =>
    fetchBlob(`/projects/${id}/export?format=${format}`),
};

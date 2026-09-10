'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Project, Finding, Analysis, AnalysisSummary, GraphData, Metrics, Weights } from '@/types';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getProjects();
      setProjects(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return { projects, loading, error, refetch: fetchProjects };
}

export function useProject(id: number | null) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const fetchProject = async () => {
      try {
        setLoading(true);
        const data = await api.getProject(id);
        setProject(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching project');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id]);

  return { project, loading, error };
}

export function useFindings(
  projectId: number | null,
  filters?: {
    priority?: string;
    kev?: boolean;
    direct?: boolean;
    q?: string;
  }
) {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFindings = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await api.getFindings(projectId, filters);
      setFindings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching findings');
    } finally {
      setLoading(false);
    }
  }, [projectId, filters]);

  useEffect(() => {
    fetchFindings();
  }, [fetchFindings]);

  return { findings, loading, error, refetch: fetchFindings };
}

export function useAnalysis(projectId: number | null) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [summary, setSummary] = useState<AnalysisSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        const data = await api.getAnalysis(projectId);
        if (data && typeof data === 'object' && 'analysis' in data) {
          setSummary(data);
          setAnalysis(data.analysis);
        } else {
          setAnalysis(data as unknown as Analysis);
        }
        setError(null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('404')) {
          setAnalysis(null);
          setSummary(null);
          setError(null);
        } else {
          setError(message || 'Error fetching analysis');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [projectId]);

  const analyze = async (mode: string = 'offline') => {
    if (!projectId) return;
    try {
      setLoading(true);
      const data = await api.analyzeProject(projectId, mode);
      const analysisData = (data as unknown as Record<string, unknown>)?.analysis !== undefined
        ? (data as unknown as { analysis: Analysis | null }).analysis
        : (data as unknown as Analysis);
      setAnalysis(analysisData || null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error analyzing project');
    } finally {
      setLoading(false);
    }
  };

  return { analysis, summary, loading, error, analyze };
}

export function useGraph(projectId: number | null) {
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGraph = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await api.getGraph(projectId);
      setGraph(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching graph');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  return { graph, loading, error, refetch: fetchGraph };
}

export function useMetrics(projectId: number | null, k: number = 10) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const data = await api.getMetrics(projectId, k);
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching metrics');
    } finally {
      setLoading(false);
    }
  }, [projectId, k]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, loading, error, refetch: fetchMetrics };
}

export function useWeights() {
  const [weights, setWeights] = useState<Weights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeights = async () => {
      try {
        setLoading(true);
        const data = await api.getSettings();
        setWeights(data.weights);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error fetching weights');
      } finally {
        setLoading(false);
      }
    };

    fetchWeights();
  }, []);

  const updateWeights = async (newWeights: Weights) => {
    try {
      setLoading(true);
      const data = await api.updateWeights(newWeights);
      setWeights(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating weights');
    } finally {
      setLoading(false);
    }
  };

  return { weights, loading, error, updateWeights };
}

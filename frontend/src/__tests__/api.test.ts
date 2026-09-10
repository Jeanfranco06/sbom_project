import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '@/lib/api';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('API Client', () => {
  describe('getProjects', () => {
    it('fetches projects successfully', async () => {
      const mockProjects = [
        { id: 1, name: 'Test Project', path: '/test' },
        { id: 2, name: 'Another Project', path: '/test2' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects,
      });

      const result = await api.getProjects();

      expect(result).toEqual(mockProjects);
      expect(mockFetch).toHaveBeenCalledWith('/api/projects', {
        headers: { 'Content-Type': 'application/json' },
      });
    });

    it('throws error on failed response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(api.getProjects()).rejects.toThrow('API Error: 500');
    });
  });

  describe('createProject', () => {
    it('creates project with correct data', async () => {
      const newProject = {
        name: 'New Project',
        source_type: 'local' as const,
        path: '/path/to/project',
      };

      const createdProject = { id: 1, ...newProject };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => createdProject,
      });

      const result = await api.createProject(newProject);

      expect(result).toEqual(createdProject);
      expect(mockFetch).toHaveBeenCalledWith('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject),
      });
    });
  });

  describe('getFindings', () => {
    it('fetches findings with filters', async () => {
      const mockFindings = [
        { id: 1, vuln_id: 'CVE-2024-0001', priority_label: 'critical' },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFindings,
      });

      const result = await api.getFindings(1, {
        priority: 'critical',
        kev: true,
      });

      expect(result).toEqual(mockFindings);
    });
  });

  describe('analyzeProject', () => {
    it('triggers analysis with mode', async () => {
      const mockAnalysis = { id: 1, status: 'running' };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAnalysis,
      });

      const result = await api.analyzeProject(1, 'offline');

      expect(result).toEqual(mockAnalysis);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/projects/1/analyze?mode=offline',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('getAnalysis', () => {
    it('fetches project analysis summary', async () => {
      const mockSummary = {
        project: { id: 1, name: 'Test' },
        analysis: { id: 1, status: 'done' },
        dependency_count: 5,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSummary,
      });

      const result = await api.getAnalysis(1);

      expect(result).toEqual(mockSummary);
      expect(mockFetch).toHaveBeenCalledWith('/api/projects/1/analysis', {
        headers: { 'Content-Type': 'application/json' },
      });
    });
  });
});

'use client';

import * as React from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FindingCard } from '@/components/findings/finding-card';
import { DependencyGraph } from '@/components/findings/dependency-graph';
import { StatsCard } from '@/components/dashboard/stats-card';
import {
  useProject,
  useAnalysis,
  useFindings,
  useGraph,
  useMetrics,
} from '@/hooks/useApi';
import { api } from '@/lib/api';
import {
  ArrowLeft,
  Play,
  Download,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield,
} from 'lucide-react';

interface ProjectViewProps {
  projectId: number;
  onBack: () => void;
}

export function ProjectView({ projectId, onBack }: ProjectViewProps) {
  const { project, loading: projectLoading } = useProject(projectId);
  const { analyze, loading: analysisLoading } = useAnalysis(projectId);
  const { findings, loading: findingsLoading, refetch: refetchFindings } = useFindings(projectId);
  const { graph } = useGraph(projectId);
  const { metrics } = useMetrics(projectId);

  const [activeTab, setActiveTab] = React.useState('findings');
  const [filters, setFilters] = React.useState({
    priority: '',
    kev: false,
    direct: false,
    q: '',
  });

  const filteredFindings = React.useMemo(() => {
    return findings.filter((f) => {
      if (filters.priority && f.priority_label !== filters.priority) return false;
      if (filters.kev && !f.is_kev) return false;
      if (filters.direct && !f.dependency?.is_direct) return false;
      if (filters.q) {
        const q = filters.q.toLowerCase();
        return (
          f.vuln_id.toLowerCase().includes(q) ||
          f.summary?.toLowerCase().includes(q) ||
          false
        );
      }
      return true;
    });
  }, [findings, filters]);

  const stats = React.useMemo(() => {
    const critical = findings.filter((f) => f.priority_label === 'critical').length;
    const high = findings.filter((f) => f.priority_label === 'high').length;
    const medium = findings.filter((f) => f.priority_label === 'medium').length;
    const low = findings.filter((f) => f.priority_label === 'low').length;
    const kev = findings.filter((f) => f.is_kev).length;

    return { critical, high, medium, low, kev };
  }, [findings]);

  const handleAnalyze = async () => {
    await analyze('offline');
    refetchFindings();
  };

  const handleExport = async (format: 'json' | 'csv' | 'pdf') => {
    try {
      const blob = await api.exportProject(projectId, format);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `secsbom_${project?.name || 'project'}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground">Proyecto no encontrado</p>
        <Button variant="ghost" onClick={onBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header title={project.name} description={project.path}>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <Button onClick={handleAnalyze} disabled={analysisLoading}>
          <Play className="w-4 h-4 mr-2" />
          {analysisLoading ? 'Analizando...' : 'Analizar ahora'}
        </Button>
        <Button variant="outline" onClick={() => handleExport('json')}>
          <Download className="w-4 h-4 mr-2" />
          JSON
        </Button>
        <Button variant="outline" onClick={() => handleExport('csv')}>
          <Download className="w-4 h-4 mr-2" />
          CSV
        </Button>
        <Button variant="outline" onClick={() => handleExport('pdf')}>
          <FileText className="w-4 h-4 mr-2" />
          PDF
        </Button>
      </Header>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatsCard
            title="Críticas"
            value={stats.critical}
            icon={AlertTriangle}
            className="border-red-500/50"
          />
          <StatsCard
            title="Altas"
            value={stats.high}
            icon={AlertTriangle}
            className="border-orange-500/50"
          />
          <StatsCard
            title="Medias"
            value={stats.medium}
            icon={Clock}
            className="border-yellow-500/50"
          />
          <StatsCard
            title="Bajas"
            value={stats.low}
            icon={CheckCircle}
            className="border-green-500/50"
          />
          <StatsCard
            title="KEV"
            value={stats.kev}
            icon={Shield}
            description="Explotación activa"
            className="border-purple-500/50"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="findings">Hallazgos ({filteredFindings.length})</TabsTrigger>
            <TabsTrigger value="graph">Grafo de Dependencias</TabsTrigger>
            <TabsTrigger value="metrics">Métricas de Ranking</TabsTrigger>
            <TabsTrigger value="sbom">SBOM</TabsTrigger>
          </TabsList>

          <TabsContent value="findings" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 p-4 bg-card rounded-lg border">
              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                className="px-3 py-2 rounded-md border bg-background text-sm"
              >
                <option value="">Toda prioridad</option>
                <option value="critical">Crítica</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
              </select>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.kev}
                  onChange={(e) => setFilters({ ...filters, kev: e.target.checked })}
                  className="accent-primary"
                />
                Solo KEV
              </label>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.direct}
                  onChange={(e) => setFilters({ ...filters, direct: e.target.checked })}
                  className="accent-primary"
                />
                Solo directas
              </label>

              <input
                type="search"
                value={filters.q}
                onChange={(e) => setFilters({ ...filters, q: e.target.value })}
                placeholder="Buscar CVE / paquete..."
                className="px-3 py-2 rounded-md border bg-background text-sm flex-1 min-w-[200px]"
              />
            </div>

            {/* Findings List */}
            {findingsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="h-32 animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-muted rounded w-1/4 mb-2" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredFindings.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Sin hallazgos</h3>
                  <p className="text-muted-foreground">
                    {findings.length === 0
                      ? 'Ejecuta un análisis para detectar vulnerabilidades.'
                      : 'No hay hallazgos que coincidan con los filtros.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredFindings.map((finding) => (
                  <FindingCard key={finding.id} finding={finding} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="graph">
            <Card>
              <CardHeader>
                <CardTitle>Grafo de Dependencias</CardTitle>
              </CardHeader>
              <CardContent>
                {graph ? (
                  <DependencyGraph data={graph} />
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Ejecuta un análisis para generar el grafo de dependencias.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics">
            <Card>
              <CardHeader>
                <CardTitle>Métricas de Ranking</CardTitle>
              </CardHeader>
              <CardContent>
                {metrics ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Precision@k</h4>
                        <div className="space-y-1">
                          {metrics.precision_at_k.map((p, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span>@{(i + 1) * 5}</span>
                              <span>{(p * 100).toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Recall@k</h4>
                        <div className="space-y-1">
                          {metrics.recall_at_k.map((r, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span>@{(i + 1) * 5}</span>
                              <span>{(r * 100).toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">NDCG@k</h4>
                        <div className="space-y-1">
                          {metrics.ndcg_at_k.map((n, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span>@{(i + 1) * 5}</span>
                              <span>{(n * 100).toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <span className="text-muted-foreground">Spearman rho</span>
                        <p className="text-2xl font-bold">{metrics.spearman_rho.toFixed(3)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Kendall tau</span>
                        <p className="text-2xl font-bold">{metrics.kendall_tau.toFixed(3)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Ejecuta un análisis y configura ground truth para ver las métricas.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sbom">
            <Card>
              <CardHeader>
                <CardTitle>SBOM CycloneDX</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={async () => {
                    const sbom = await api.getSBOM(projectId);
                    const blob = new Blob([JSON.stringify(sbom, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `sbom_${project.name}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar SBOM
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

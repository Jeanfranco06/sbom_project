'use client';

import * as React from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FindingCard } from '@/components/findings/finding-card';
import { DependencyGraph } from '@/components/findings/dependency-graph';
import { RiskAssessmentPanel } from '@/components/projects/risk-assessment';
import { ProjectContextEditor } from '@/components/projects/project-context-editor';
import { GroundTruthEditor } from '@/components/projects/ground-truth-editor';
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
  Info,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface ProjectViewProps {
  projectId: number;
  onBack: () => void;
}

export function ProjectView({ projectId, onBack }: ProjectViewProps) {
  const { project, loading: projectLoading, replaceProject } = useProject(projectId);
  const { analysis, analyze, loading: analysisLoading, refetch: refetchAnalysis } = useAnalysis(projectId);
  const { findings, loading: findingsLoading, refetch: refetchFindings } = useFindings(projectId);
  const { graph, refetch: refetchGraph } = useGraph(projectId);

  const [activeTab, setActiveTab] = React.useState('findings');
  const [analysisMode, setAnalysisMode] = React.useState<string>('hybrid');
  const [page, setPage] = React.useState(1);
  const [filters, setFilters] = React.useState({
    priority: '',
    kev: false,
    direct: false,
    q: '',
  });

  const PAGE_SIZE = 10;

  const isAnalyzing = analysis?.status === 'running' || analysisLoading;
  const { metrics, error: metricsError, refetch: refetchMetrics } = useMetrics(
    projectId,
    10,
    activeTab === 'metrics'
  );

  React.useEffect(() => {
    if (analysis?.status !== 'running') return;
    const interval = setInterval(() => {
      refetchAnalysis();
    }, 3000);
    return () => clearInterval(interval);
  }, [analysis?.status, refetchAnalysis]);

  React.useEffect(() => {
    if (analysis?.status === 'done' || analysis?.status === 'error') {
      refetchFindings();
      refetchGraph();
    }
  }, [analysis?.status, refetchFindings, refetchGraph]);

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
    const info = findings.filter((f) => f.priority_label === 'info').length;
    const kev = findings.filter((f) => f.is_kev).length;

    return { critical, high, medium, low, info, kev };
  }, [findings]);

  const totalPages = Math.ceil(filteredFindings.length / PAGE_SIZE);
  const paginatedFindings = filteredFindings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  React.useEffect(() => {
    setPage(1);
  }, [filters]);

  const handleAnalyze = async () => {
    await analyze(analysisMode);
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
        <select
          value={analysisMode}
          onChange={(e) => setAnalysisMode(e.target.value)}
          disabled={isAnalyzing}
          className="px-3 py-1.5 rounded-md border bg-background text-sm"
        >
          <option value="offline">Offline (solo caché)</option>
          <option value="connected">Connected</option>
          <option value="hybrid">Hibrido</option>
        </select>
        <Button onClick={handleAnalyze} disabled={isAnalyzing}>
          {isAnalyzing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
              Analizando...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Analizar
            </>
          )}
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
        <ProjectContextEditor
          project={project}
          onSaved={(updatedProject) => {
            replaceProject(updatedProject);
          }}
        />

        {/* Stats */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          <StatsCard
            title="Criticas"
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
            title="Info"
            value={stats.info}
            icon={Info}
            className="border-blue-500/50"
          />
          <StatsCard
            title="KEV"
            value={stats.kev}
            icon={Shield}
            description="Explotacion activa"
            className="border-purple-500/50"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="findings">Hallazgos ({filteredFindings.length})</TabsTrigger>
            <TabsTrigger value="risk">Evaluacion de Riesgo</TabsTrigger>
            <TabsTrigger value="graph">Grafo de Dependencias</TabsTrigger>
            <TabsTrigger value="metrics">Metricas de Ranking</TabsTrigger>
            <TabsTrigger value="ground-truth">Ground Truth</TabsTrigger>
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
                <option value="critical">Critica</option>
                <option value="high">Alta</option>
                <option value="medium">Media</option>
                <option value="low">Baja</option>
                <option value="info">Info</option>
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
                      ? 'Ejecuta un analisis para detectar vulnerabilidades.'
                      : 'No hay hallazgos que coincidan con los filtros.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="space-y-4">
                  {paginatedFindings.map((finding) => (
                    <FindingCard key={finding.id} finding={finding} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-muted-foreground">
                      Mostrando {(page - 1) * PAGE_SIZE + 1}-
                      {Math.min(page * PAGE_SIZE, filteredFindings.length)} de{' '}
                      {filteredFindings.length} hallazgos
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={page === pageNum ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="risk">
            <RiskAssessmentPanel projectId={projectId} />
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
                {metrics && metrics.contextual && metrics.concordance ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Precision@k</h4>
                        <div className="text-2xl font-bold">
                          {(metrics.contextual.precision_at_k * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Recall@k</h4>
                        <div className="text-2xl font-bold">
                          {(metrics.contextual.recall_at_k * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">NDCG@k</h4>
                        <div className="text-2xl font-bold">
                          {(metrics.contextual.ndcg_at_k * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <span className="text-muted-foreground">Spearman rho</span>
                        <p className="text-2xl font-bold">{metrics.concordance.spearman_rho?.toFixed(3) ?? 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Kendall tau</span>
                        <p className="text-2xl font-bold">{metrics.concordance.kendall_tau?.toFixed(3) ?? 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                ) : metricsError?.includes('409') ? (
                  <p className="text-muted-foreground text-center py-8">
                    Configura al menos una etiqueta en la pestaña Ground Truth para ver las métricas.
                  </p>
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Ejecuta un análisis para ver las métricas de ranking.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ground-truth">
            <GroundTruthEditor
              projectId={projectId}
              onSaved={() => refetchMetrics()}
            />
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

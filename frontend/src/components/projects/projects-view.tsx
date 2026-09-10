'use client';

import * as React from 'react';
import { Header } from '@/components/layout/header';
import { StatsCard } from '@/components/dashboard/stats-card';
import { useProjects } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { ProjectCard } from '@/components/projects/project-card';
import { CreateProjectModal } from '@/components/projects/create-project-modal';
import { Pagination } from '@/components/ui/pagination';
import { ProjectFiltersBar, ProjectFilters } from '@/components/projects/project-filters';
import {
  FolderOpen,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Shield,
} from 'lucide-react';

interface ProjectsViewProps {
  onViewProject: (id: number) => void;
}

const ITEMS_PER_PAGE = 9;

export function ProjectsView({ onViewProject }: ProjectsViewProps) {
  const { projects, loading, error, refetch } = useProjects();
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [filters, setFilters] = React.useState<ProjectFilters>({
    environment: '',
    status: '',
    exposed: '',
  });

  const filteredProjects = React.useMemo(() => {
    let result = projects;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.path.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query))
      );
    }

    // Environment filter
    if (filters.environment) {
      result = result.filter((p) => p.environment === filters.environment);
    }

    // Status filter
    if (filters.status === 'analyzed') {
      result = result.filter((p) => p.last_analysis_at);
    } else if (filters.status === 'pending') {
      result = result.filter((p) => !p.last_analysis_at);
    }

    // Exposed filter
    if (filters.exposed === 'exposed') {
      result = result.filter((p) => p.internet_exposed);
    } else if (filters.exposed === 'not-exposed') {
      result = result.filter((p) => !p.internet_exposed);
    }

    // Sort: analyzed first (most recent), then pending (most recent)
    return [...result].sort((a, b) => {
      const aHasAnalysis = !!a.last_analysis_at;
      const bHasAnalysis = !!b.last_analysis_at;

      // Analyzed projects first
      if (aHasAnalysis && !bHasAnalysis) return -1;
      if (!aHasAnalysis && bHasAnalysis) return 1;

      // Within same group, sort by date descending (most recent first)
      const aDate = a.last_analysis_at || a.created_at;
      const bDate = b.last_analysis_at || b.created_at;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
  }, [projects, searchQuery, filters]);

  const totalPages = Math.ceil(filteredProjects.length / ITEMS_PER_PAGE);
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filters]);

  const stats = React.useMemo(() => {
    const totalProjects = projects.length;
    const analyzedProjects = projects.filter((p) => p.last_analysis_at).length;
    const exposedProjects = projects.filter((p) => p.internet_exposed).length;

    return {
      totalProjects,
      analyzedProjects,
      exposedProjects,
      pendingProjects: totalProjects - analyzedProjects,
    };
  }, [projects]);

  return (
    <div className="flex flex-col h-full min-w-0 overflow-hidden">
      <Header
        title="Proyectos"
        description="Analiza dependencias de multiples ecosistemas: Python, JavaScript, .NET, PHP y mas."
      >
        <Button onClick={() => setShowCreateModal(true)} className="gradient-primary text-white shadow-md hover:shadow-lg transition-all">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo proyecto
        </Button>
        <Button variant="outline" onClick={refetch} className="border-border/50">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </Header>

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatsCard
            title="Total"
            value={stats.totalProjects}
            icon={FolderOpen}
            color="primary"
          />
          <StatsCard
            title="Analizados"
            value={stats.analyzedProjects}
            icon={CheckCircle}
            color="success"
          />
          <StatsCard
            title="Pendientes"
            value={stats.pendingProjects}
            icon={Clock}
            color="warning"
          />
          <StatsCard
            title="Expuestos"
            value={stats.exposedProjects}
            icon={AlertTriangle}
            color="danger"
          />
        </div>

        {/* Search and Filters */}
        {projects.length > 0 && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar proyectos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border/50 bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                />
              </div>
            </div>
            <ProjectFiltersBar
              filters={filters}
              onFiltersChange={setFilters}
            />
          </div>
        )}

        {/* Results count */}
        {filteredProjects.length > 0 && (
          <div className="text-sm text-muted-foreground">
            Mostrando {paginatedProjects.length} de {filteredProjects.length} proyectos
          </div>
        )}

        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-52 rounded-2xl border border-border/50 bg-card p-5 animate-pulse"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-muted/50" />
                    <div>
                      <div className="h-4 bg-muted/50 rounded w-32 mb-2" />
                      <div className="h-3 bg-muted/30 rounded w-16" />
                    </div>
                  </div>
                  <div className="h-6 bg-muted/30 rounded-full w-20" />
                </div>
                <div className="h-3 bg-muted/30 rounded w-full mb-2" />
                <div className="h-3 bg-muted/30 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center">
            <AlertTriangle className="w-10 h-10 mx-auto text-destructive mb-3" />
            <p className="text-destructive font-medium">{error}</p>
            <Button variant="outline" onClick={refetch} className="mt-4">
              Reintentar
            </Button>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-card p-8 sm:p-12 text-center">
            {searchQuery || filters.environment || filters.status || filters.exposed ? (
              <>
                <Search className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sin resultados</h3>
                <p className="text-muted-foreground mb-4">
                  No se encontraron proyectos con los filtros aplicados.
                </p>
                <Button variant="outline" onClick={() => { setSearchQuery(''); setFilters({ environment: '', status: '', exposed: '' }); }}>
                  Limpiar filtros
                </Button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 mx-auto rounded-2xl gradient-primary flex items-center justify-center mb-4 shadow-lg glow-primary">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No hay proyectos</h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  Crea tu primer proyecto para comenzar a analizar vulnerabilidades en tus dependencias.
                </p>
                <Button onClick={() => setShowCreateModal(true)} className="gradient-primary text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear proyecto
                </Button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {paginatedProjects.map((project, index) => (
                <div key={project.id} className="stagger-item" style={{ animationDelay: `${index * 50}ms` }}>
                  <ProjectCard
                    project={project}
                    onClick={() => onViewProject(project.id)}
                  />
                </div>
              ))}
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      <CreateProjectModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(project) => {
          onViewProject(project.id);
        }}
      />
    </div>
  );
}

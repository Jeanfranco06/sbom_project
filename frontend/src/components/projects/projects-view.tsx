'use client';

import * as React from 'react';
import { Header } from '@/components/layout/header';
import { StatsCard } from '@/components/dashboard/stats-card';
import { useProjects } from '@/hooks/useApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ProjectCard } from '@/components/projects/project-card';
import { CreateProjectModal } from '@/components/projects/create-project-modal';
import {
  FolderOpen,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  RefreshCw,
} from 'lucide-react';

interface ProjectsViewProps {
  onViewProject: (id: number) => void;
}

export function ProjectsView({ onViewProject }: ProjectsViewProps) {
  const { projects, loading, error, refetch } = useProjects();
  const [showCreateModal, setShowCreateModal] = React.useState(false);

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
    <div className="flex flex-col h-full">
      <Header title="Proyectos" description="Analiza proyectos Python locales (requirements.txt, poetry.lock, Pipfile.lock).">
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo proyecto
        </Button>
        <Button variant="outline" onClick={refetch}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </Header>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Proyectos"
            value={stats.totalProjects}
            icon={FolderOpen}
          />
          <StatsCard
            title="Analizados"
            value={stats.analyzedProjects}
            icon={CheckCircle}
            description="Con análisis completado"
          />
          <StatsCard
            title="Pendientes"
            value={stats.pendingProjects}
            icon={Clock}
            description="Sin análisis"
          />
          <StatsCard
            title="Expuestos"
            value={stats.exposedProjects}
            icon={AlertTriangle}
            description="Expuestos a Internet"
          />
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-48 animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-destructive">{error}</p>
              <Button variant="outline" onClick={refetch} className="mt-4">
                Reintentar
              </Button>
            </CardContent>
          </Card>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay proyectos</h3>
              <p className="text-muted-foreground mb-4">
                Crea tu primer proyecto para comenzar a analizar vulnerabilidades.
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Crear proyecto
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => onViewProject(project.id)}
              />
            ))}
          </div>
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

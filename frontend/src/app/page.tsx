'use client';

import * as React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { ProjectsView } from '@/components/projects/projects-view';
import { ProjectView } from '@/components/projects/project-view';
import { SettingsView } from '@/components/projects/settings-view';
import { SnapshotsView } from '@/components/projects/snapshots-view';
import { ExperimentsView } from '@/components/projects/experiments-view';

export default function Home() {
  const [activeView, setActiveView] = React.useState('projects');
  const [selectedProjectId, setSelectedProjectId] = React.useState<number | null>(null);

  const handleViewProject = (id: number) => {
    setSelectedProjectId(id);
    setActiveView('project-detail');
  };

  const handleBackToProjects = () => {
    setSelectedProjectId(null);
    setActiveView('projects');
  };

  const renderView = () => {
    switch (activeView) {
      case 'projects':
        return <ProjectsView onViewProject={handleViewProject} />;
      case 'project-detail':
        return selectedProjectId ? (
          <ProjectView projectId={selectedProjectId} onBack={handleBackToProjects} />
        ) : null;
      case 'settings':
        return <SettingsView />;
      case 'snapshots':
        return <SnapshotsView />;
      case 'experiments':
        return <ExperimentsView />;
      default:
        return <ProjectsView onViewProject={handleViewProject} />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeView={activeView} onViewChange={setActiveView} />
      <main className="flex-1 overflow-hidden">{renderView()}</main>
    </div>
  );
}

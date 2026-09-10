'use client';

import * as React from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { ProjectsView } from '@/components/projects/projects-view';
import { ProjectView } from '@/components/projects/project-view';
import { SettingsView } from '@/components/projects/settings-view';
import { SnapshotsView } from '@/components/projects/snapshots-view';
import { ExperimentsView } from '@/components/projects/experiments-view';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Home() {
  const [activeView, setActiveView] = React.useState('projects');
  const [selectedProjectId, setSelectedProjectId] = React.useState<number | null>(null);
  const [modeVersion, setModeVersion] = React.useState(0);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleViewProject = (id: number) => {
    setSelectedProjectId(id);
    setActiveView('project-detail');
    setSidebarOpen(false);
  };

  const handleBackToProjects = () => {
    setSelectedProjectId(null);
    setActiveView('projects');
  };

  const handleViewChange = (view: string) => {
    setActiveView(view);
    setSidebarOpen(false);
    if (view === 'settings') {
      setModeVersion((v) => v + 1);
    }
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
        return <SettingsView onModeChange={() => setModeVersion((v) => v + 1)} />;
      case 'snapshots':
        return <SnapshotsView />;
      case 'experiments':
        return <ExperimentsView />;
      default:
        return <ProjectsView onViewProject={handleViewProject} />;
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile sidebar toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden bg-card border border-border/50 shadow-md"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </Button>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        'fixed lg:relative z-40 h-full transition-transform duration-200 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <Sidebar activeView={activeView} onViewChange={handleViewChange} modeVersion={modeVersion} />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-hidden min-w-0">
        {renderView()}
      </main>
    </div>
  );
}

'use client';

import { cn } from '@/lib/utils';
import { FolderOpen, GitBranch, Upload, Clock, AlertTriangle, ArrowRight } from 'lucide-react';
import type { Project } from '@/types';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  className?: string;
}

const sourceIcons = {
  local: FolderOpen,
  git: GitBranch,
  upload: Upload,
};

const sourceLabels = {
  local: 'Local',
  git: 'Git',
  upload: 'Upload',
};

const environmentConfig = {
  production: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/30',
    dot: 'bg-red-500',
    label: 'Produccion',
  },
  staging: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    dot: 'bg-amber-500',
    label: 'Staging',
  },
  development: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
    label: 'Desarrollo',
  },
};

export function ProjectCard({ project, onClick, className }: ProjectCardProps) {
  const SourceIcon = sourceIcons[project.source_type] || FolderOpen;
  const envConfig = environmentConfig[project.environment] || environmentConfig.development;
  const hasAnalysis = !!project.last_analysis_at;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-2xl border bg-card p-5 transition-all duration-200',
        'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5',
        'active:scale-[0.98]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <SourceIcon className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground truncate">{project.name}</h3>
            <span className={cn(
              'shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium',
              envConfig.bg,
              envConfig.text
            )}>
              <span className={cn('w-1 h-1 rounded-full', envConfig.dot)} />
              {envConfig.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
            {sourceLabels[project.source_type]}
          </p>
        </div>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
          {project.description}
        </p>
      )}

      {/* Path */}
      <div className="mb-4 px-3 py-2 rounded-lg bg-muted/30">
        <p className="text-xs text-muted-foreground font-mono truncate">
          {project.path}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {hasAnalysis ? (
              <span>{new Date(project.last_analysis_at!).toLocaleDateString()}</span>
            ) : (
              <span className="text-muted-foreground/60">Sin analisis</span>
            )}
          </div>
          {project.internet_exposed && (
            <div className="flex items-center gap-1.5 text-amber-500">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Expuesto</span>
            </div>
          )}
        </div>
        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </div>
    </button>
  );
}

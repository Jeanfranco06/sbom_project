'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, GitBranch, Upload, Clock, AlertTriangle } from 'lucide-react';
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

const environmentColors = {
  production: 'bg-red-500/20 text-red-400',
  staging: 'bg-yellow-500/20 text-yellow-400',
  development: 'bg-green-500/20 text-green-400',
};

export function ProjectCard({ project, onClick, className }: ProjectCardProps) {
  const SourceIcon = sourceIcons[project.source_type] || FolderOpen;

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:border-primary/50 hover:shadow-md',
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <SourceIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{project.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{project.path}</p>
            </div>
          </div>
          <Badge className={environmentColors[project.environment]}>
            {project.environment}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {project.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {project.description}
          </p>
        )}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {project.last_analysis_at
              ? new Date(project.last_analysis_at).toLocaleDateString()
              : 'Sin análisis'}
          </div>
          {project.internet_exposed && (
            <div className="flex items-center gap-1 text-orange-400">
              <AlertTriangle className="w-3 h-3" />
              Expuesto a Internet
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

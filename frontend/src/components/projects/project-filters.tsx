'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SlidersHorizontal, X } from 'lucide-react';

export interface ProjectFilters {
  environment: string;
  status: string;
  exposed: string;
}

interface ProjectFiltersBarProps {
  filters: ProjectFilters;
  onFiltersChange: (filters: ProjectFilters) => void;
  className?: string;
}

const environmentOptions = [
  { value: '', label: 'Todos' },
  { value: 'production', label: 'Produccion' },
  { value: 'staging', label: 'Staging' },
  { value: 'development', label: 'Desarrollo' },
];

const statusOptions = [
  { value: '', label: 'Todos' },
  { value: 'analyzed', label: 'Analizados' },
  { value: 'pending', label: 'Pendientes' },
];

const exposedOptions = [
  { value: '', label: 'Todos' },
  { value: 'exposed', label: 'Expuestos' },
  { value: 'not-exposed', label: 'No expuestos' },
];

export function ProjectFiltersBar({ filters, onFiltersChange, className }: ProjectFiltersBarProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const hasActiveFilters = filters.environment || filters.status || filters.exposed;

  const clearFilters = () => {
    onFiltersChange({ environment: '', status: '', exposed: '' });
  };

  const updateFilter = (key: keyof ProjectFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={isOpen ? 'default' : 'outline'}
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'border-border/50',
            isOpen && 'gradient-primary text-white'
          )}
        >
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          Filtros
          {hasActiveFilters && (
            <span className="ml-2 w-5 h-5 rounded-full bg-white/20 text-xs flex items-center justify-center">
              {[filters.environment, filters.status, filters.exposed].filter(Boolean).length}
            </span>
          )}
        </Button>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
            <X className="w-3 h-3 mr-1" />
            Limpiar
          </Button>
        )}

        {filters.environment && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
            {environmentOptions.find(o => o.value === filters.environment)?.label}
            <button onClick={() => updateFilter('environment', '')} className="hover:text-primary/80">
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
        {filters.status && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500">
            {statusOptions.find(o => o.value === filters.status)?.label}
            <button onClick={() => updateFilter('status', '')} className="hover:text-emerald-500/80">
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
        {filters.exposed && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500">
            {exposedOptions.find(o => o.value === filters.exposed)?.label}
            <button onClick={() => updateFilter('exposed', '')} className="hover:text-amber-500/80">
              <X className="w-3 h-3" />
            </button>
          </span>
        )}
      </div>

      {isOpen && (
        <div className="flex flex-wrap gap-4 p-4 rounded-xl border border-border/50 bg-card animate-slide-in">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Entorno
            </label>
            <div className="flex gap-1">
              {environmentOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateFilter('environment', option.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    filters.environment === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Estado
            </label>
            <div className="flex gap-1">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateFilter('status', option.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    filters.status === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Exposicion
            </label>
            <div className="flex gap-1">
              {exposedOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateFilter('exposed', option.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    filters.exposed === option.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

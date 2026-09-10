'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import {
  FolderOpen,
  Settings,
  Database,
  FlaskConical,
  Shield,
  ChevronRight,
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  modeVersion?: number;
}

const navItems = [
  { id: 'projects', label: 'Proyectos', icon: FolderOpen, color: 'text-blue-400' },
  { id: 'settings', label: 'Configuracion', icon: Settings, color: 'text-purple-400' },
  { id: 'snapshots', label: 'Snapshots', icon: Database, color: 'text-emerald-400' },
  { id: 'experiments', label: 'Experimentos', icon: FlaskConical, color: 'text-amber-400' },
];

const MODE_LABELS: Record<string, string> = {
  connected: 'conectado',
  offline: 'offline',
  hybrid: 'hibrido',
};

const MODE_CONFIG: Record<string, { bg: string; dot: string; glow: string }> = {
  connected: {
    bg: 'bg-emerald-500/10',
    dot: 'bg-emerald-500',
    glow: 'shadow-[0_0_8px_rgb(34,197,94)]',
  },
  offline: {
    bg: 'bg-amber-500/10',
    dot: 'bg-amber-500',
    glow: 'shadow-[0_0_8px_rgb(245,158,11)]',
  },
  hybrid: {
    bg: 'bg-blue-500/10',
    dot: 'bg-blue-500',
    glow: 'shadow-[0_0_8px_rgb(59,130,246)]',
  },
};

export function Sidebar({ activeView, onViewChange, modeVersion }: SidebarProps) {
  const [mode, setMode] = React.useState('offline');

  React.useEffect(() => {
    const fetchMode = async () => {
      try {
        const settings = await api.getSettings();
        setMode(settings.mode);
      } catch {
        // keep default
      }
    };
    fetchMode();
  }, [modeVersion]);

  const modeConfig = MODE_CONFIG[mode] || MODE_CONFIG.offline;

  return (
    <aside className="w-[260px] border-r border-border/50 bg-gradient-to-b from-card via-card to-card/80 flex flex-col h-screen">
      {/* Brand */}
      <div className="p-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center shadow-lg glow-primary">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">SecSBOM</h1>
            <p className="text-xs text-muted-foreground">Priorizacion contextual</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200',
                isActive
                  ? 'bg-white/20'
                  : 'bg-muted/50 group-hover:bg-muted'
              )}>
                <Icon className={cn(
                  'w-4 h-4 transition-colors',
                  isActive ? 'text-primary-foreground' : item.color
                )} />
              </div>
              <span className="flex-1 text-left">{item.label}</span>
              {isActive && (
                <ChevronRight className="w-4 h-4 opacity-60" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border/50">
        <div className={cn(
          'flex items-center gap-2.5 px-3 py-2 rounded-lg',
          modeConfig.bg
        )}>
          <div className={cn(
            'w-2.5 h-2.5 rounded-full',
            modeConfig.dot,
            modeConfig.glow,
            'animate-pulse'
          )} />
          <div className="flex-1">
            <span className="text-xs font-medium text-foreground">
              modo: {MODE_LABELS[mode] || mode}
            </span>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 px-1">
          secsbom v1.0.0
        </p>
      </div>
    </aside>
  );
}

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  FolderOpen,
  Settings,
  Database,
  FlaskConical,
  Shield,
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const navItems = [
  { id: 'projects', label: 'Proyectos', icon: FolderOpen },
  { id: 'settings', label: 'Configuración', icon: Settings },
  { id: 'snapshots', label: 'Snapshots', icon: Database },
  { id: 'experiments', label: 'Experimentos', icon: FlaskConical },
];

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  return (
    <aside className="w-64 border-r bg-card flex flex-col h-screen">
      <div className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg">SecSBOM</h1>
            <p className="text-xs text-muted-foreground">Priorización contextual</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                activeView === item.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-xs text-muted-foreground">modo: offline</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">secsbom v1.0.0</p>
      </div>
    </aside>
  );
}

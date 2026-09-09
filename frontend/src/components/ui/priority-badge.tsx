import * as React from 'react';
import { cn } from '@/lib/utils';
import type { PriorityLabel } from '@/types';

interface PriorityBadgeProps {
  priority: PriorityLabel;
  score?: number;
  className?: string;
}

const priorityConfig: Record<PriorityLabel, { label: string; bg: string; text: string }> = {
  critical: { label: 'Crítica', bg: 'bg-red-500/20', text: 'text-red-400' },
  high: { label: 'Alta', bg: 'bg-orange-500/20', text: 'text-orange-400' },
  medium: { label: 'Media', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  low: { label: 'Baja', bg: 'bg-green-500/20', text: 'text-green-400' },
  info: { label: 'Info', bg: 'bg-blue-500/20', text: 'text-blue-400' },
};

export function PriorityBadge({ priority, score, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority] || priorityConfig.info;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        config.bg,
        config.text,
        className
      )}
    >
      <span>{config.label}</span>
      {score !== undefined && (
        <span className="opacity-70">({score.toFixed(1)})</span>
      )}
    </div>
  );
}

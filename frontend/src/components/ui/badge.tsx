import * as React from 'react';
import { cn } from '@/lib/utils';
import type { PriorityLabel } from '@/types';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  priority?: PriorityLabel;
}

const priorityStyles: Record<PriorityLabel, string> = {
  critical: 'bg-red-500/20 text-red-400 border-red-500/50',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
  low: 'bg-green-500/20 text-green-400 border-green-500/50',
  info: 'bg-blue-500/20 text-blue-400 border-blue-500/50',
};

function Badge({ className, variant = 'default', priority, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        priority ? priorityStyles[priority] : '',
        {
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80': variant === 'default' && !priority,
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80': variant === 'destructive',
          'text-foreground': variant === 'outline',
        },
        className
      )}
      {...props}
    />
  );
}

export { Badge };

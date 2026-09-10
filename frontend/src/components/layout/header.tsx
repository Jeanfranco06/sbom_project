import * as React from 'react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function Header({ title, description, children, className }: HeaderProps) {
  return (
    <header className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6 border-b border-border/50 bg-card/50 backdrop-blur-sm', className)}>
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1 truncate">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </header>
  );
}

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

const colorStyles = {
  default: {
    iconBg: 'bg-muted/50',
    iconColor: 'text-muted-foreground',
    border: 'border-border/50',
    valueColor: 'text-foreground',
  },
  primary: {
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    border: 'border-primary/20',
    valueColor: 'text-primary',
  },
  success: {
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
    border: 'border-emerald-500/20',
    valueColor: 'text-emerald-500',
  },
  warning: {
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-500',
    border: 'border-amber-500/20',
    valueColor: 'text-amber-500',
  },
  danger: {
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-500',
    border: 'border-red-500/20',
    valueColor: 'text-red-500',
  },
};

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
  color = 'default',
  className,
}: StatsCardProps) {
  const styles = colorStyles[color];

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-card p-5 transition-all duration-200 hover-lift',
        styles.border,
        className
      )}
    >
      {/* Background decoration */}
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-gradient-to-br from-muted/30 to-transparent opacity-50" />

      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className={cn('text-3xl font-bold tracking-tight', styles.valueColor)}>
              {value}
            </p>
          </div>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
          {trend && trendValue && (
            <div className={cn(
              'flex items-center gap-1 text-xs font-medium',
              trend === 'up' && 'text-emerald-500',
              trend === 'down' && 'text-red-500',
              trend === 'neutral' && 'text-muted-foreground'
            )}>
              {trend === 'up' && (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              )}
              {trend === 'down' && (
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              )}
              {trendValue}
            </div>
          )}
        </div>
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center',
          styles.iconBg
        )}>
          <Icon className={cn('w-6 h-6', styles.iconColor)} />
        </div>
      </div>
    </div>
  );
}

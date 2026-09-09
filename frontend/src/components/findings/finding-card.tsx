'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PriorityBadge } from '@/components/ui/priority-badge';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import type { Finding } from '@/types';

interface FindingCardProps {
  finding: Finding;
  className?: string;
}

export function FindingCard({ finding, className }: FindingCardProps) {
  const [expanded, setExpanded] = React.useState(false);

  const severityColor = finding.cvss_severity?.toLowerCase() || 'info';

  return (
    <Card className={cn('transition-all hover:border-primary/50', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <PriorityBadge priority={finding.priority_label as any} score={finding.priority_score} />
              {finding.is_kev && (
                <Badge variant="destructive">KEV</Badge>
              )}
              {finding.patch_available && (
                <Badge variant="secondary">Parche disponible</Badge>
              )}
            </div>
            <h3 className="mt-2 font-mono text-sm font-semibold">
              {finding.vuln_id}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 truncate">
              {finding.summary || 'Sin descripción'}
            </p>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">CVSS</span>
            <p className={cn('font-medium', getSeverityColor(severityColor))}>
              {finding.cvss_score?.toFixed(1) || '-'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">EPSS</span>
            <p className="font-medium">
              {finding.epss_score ? `${(finding.epss_score * 100).toFixed(1)}%` : '-'}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Fuente</span>
            <p className="font-medium">{finding.source}</p>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-4 border-t pt-4">
            {finding.explanation && (
              <div>
                <h4 className="font-medium text-sm mb-2">Explicación</h4>
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                  {renderExplanation(finding.explanation)}
                </div>
              </div>
            )}

            {finding.fixed_versions && (
              <div>
                <h4 className="font-medium text-sm mb-2">Versión corregida</h4>
                <p className="text-sm font-mono">{finding.fixed_versions}</p>
              </div>
            )}

            <div className="flex items-center gap-2">
              <a
                href={`https://nvd.nist.gov/vuln/detail/${finding.vuln_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Ver en NVD <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href={`https://osv.dev/vulnerability/${finding.vuln_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Ver en OSV <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getSeverityColor(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'critical':
      return 'text-red-400';
    case 'high':
      return 'text-orange-400';
    case 'medium':
      return 'text-yellow-400';
    case 'low':
      return 'text-green-400';
    default:
      return 'text-blue-400';
  }
}

function renderExplanation(explanation: string): React.ReactNode {
  try {
    const data = JSON.parse(explanation);
    if (data.factors) {
      return (
        <div className="space-y-2">
          {data.factors.map((factor: any, i: number) => (
            <div key={i} className="flex justify-between">
              <span>{factor.label}</span>
              <span className="font-mono">
                {factor.value.toFixed(2)} × {factor.contribution.toFixed(1)}%
              </span>
            </div>
          ))}
          {data.recommendation && (
            <div className="mt-2 pt-2 border-t">
              <span className="font-medium">Recomendación:</span> {data.recommendation}
            </div>
          )}
        </div>
      );
    }
    return explanation;
  } catch {
    return explanation;
  }
}

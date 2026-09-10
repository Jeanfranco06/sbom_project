'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PriorityBadge } from '@/components/ui/priority-badge';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, ExternalLink, Info, Shield, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import type { Explanation, ExplanationFactor, Finding } from '@/types';

interface FindingCardProps {
  finding: Finding;
  className?: string;
}

function parseExplanation(explanation: Explanation | string | null): Explanation | null {
  if (!explanation) return null;
  if (typeof explanation === 'string') {
    try {
      return JSON.parse(explanation) as Explanation;
    } catch {
      return null;
    }
  }
  return explanation;
}

const FACTOR_ICONS: Record<string, React.ElementType> = {
  cvss: AlertTriangle,
  kev: Shield,
  epss: Info,
  exposure: Info,
  environment: Info,
  dependency: Info,
  data_criticality: Info,
  remediation: CheckCircle,
};

const FACTOR_COLORS: Record<string, string> = {
  cvss: 'text-red-400',
  kev: 'text-purple-400',
  epss: 'text-orange-400',
  exposure: 'text-yellow-400',
  environment: 'text-blue-400',
  dependency: 'text-cyan-400',
  data_criticality: 'text-pink-400',
  remediation: 'text-green-400',
};

const RISK_LEVEL_COLORS: Record<string, string> = {
  critico: 'bg-red-500/10 border-red-500/30 text-red-500',
  alto: 'bg-orange-500/10 border-orange-500/30 text-orange-500',
  moderado: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500',
  bajo: 'bg-blue-500/10 border-blue-500/30 text-blue-500',
};

const CIA_LABELS: Record<string, string> = {
  alto: 'Alto impacto',
  parcial: 'Impacto parcial',
  completo: 'Impacto completo',
  bajo: 'Bajo impacto',
  ninguno: 'Sin impacto',
  desconocido: 'No determinado',
};

const CIA_COLORS: Record<string, string> = {
  alto: 'text-red-400',
  completo: 'text-red-400',
  parcial: 'text-yellow-400',
  bajo: 'text-green-400',
  ninguno: 'text-green-400',
  desconocido: 'text-muted-foreground',
};

export function FindingCard({ finding, className }: FindingCardProps) {
  const [expanded, setExpanded] = React.useState(false);
  const data = parseExplanation(finding.explanation);

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
              {data?.component && (
                <Badge variant="outline" className="font-mono text-xs">
                  {data.component.name}@{data.component.version}
                </Badge>
              )}
            </div>
            <h3 className="mt-2 font-mono text-sm font-semibold">
              {finding.vuln_id}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {finding.summary || 'Sin descripcion'}
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
        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-4 text-sm">
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
          <div>
            <span className="text-muted-foreground">Prioridad</span>
            <p className="font-medium font-mono">{finding.priority_score.toFixed(1)}</p>
          </div>
        </div>

        {/* Expanded detail */}
        {expanded && data && (
          <div className="mt-4 space-y-4 border-t pt-4">
            {/* Factor breakdown - the core of explainability */}
            <div>
              <h4 className="font-medium text-sm mb-3">Desglose de factores</h4>
              <div className="space-y-3">
                {data.factors.map((factor: ExplanationFactor, i: number) => {
                  const Icon = FACTOR_ICONS[factor.factor] || Info;
                  const color = FACTOR_COLORS[factor.factor] || 'text-muted-foreground';
                  const barWidth = Math.min(factor.contribution_pct * 2, 100);
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Icon className={cn('w-3.5 h-3.5', color)} />
                          <span className="font-medium">{factor.label}</span>
                          <span className="text-xs text-muted-foreground">({factor.source})</span>
                        </div>
                        <span className="font-mono text-xs">
                          {factor.value_normalized.toFixed(2)} x {factor.weight_pct}% = {factor.contribution_pct.toFixed(1)}%
                        </span>
                      </div>
                      {/* Contribution bar */}
                      <div className="w-full bg-muted rounded-full h-1.5 ml-6">
                        <div
                          className={cn('h-1.5 rounded-full', getBarColor(factor.contribution_pct))}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      {/* Human-readable note */}
                      <p className="text-xs text-muted-foreground ml-6 italic">
                        {factor.note}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Risk Impact */}
            {data.risk_impact && (
              <div className={`border rounded-md p-4 ${RISK_LEVEL_COLORS[data.risk_impact.risk_level] || ''}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4" />
                  <h4 className="font-medium text-sm">Impacto de Riesgo</h4>
                  <Badge variant="outline" className="text-xs ml-auto">
                    Riesgo: {data.risk_impact.risk_level.toUpperCase()}
                  </Badge>
                </div>

                {/* CIA Triad */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {Object.entries(data.risk_impact.cia).map(([key, value]) => (
                    <div key={key} className="text-center p-2 bg-background/50 rounded">
                      <div className="text-xs text-muted-foreground capitalize">
                        {key === 'confidentiality' ? 'Confidencialidad' : key === 'integrity' ? 'Integridad' : 'Disponibilidad'}
                      </div>
                      <div className={cn('text-sm font-medium', CIA_COLORS[value] || '')}>
                        {CIA_LABELS[value] || value}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Business impacts */}
                {data.risk_impact.business_impacts && data.risk_impact.business_impacts.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {data.risk_impact.business_impacts.map((impact, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>{impact}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Exploitation */}
                {data.risk_impact.exploitation && data.risk_impact.exploitation.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {data.risk_impact.exploitation.map((exp, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-orange-400">
                        <Shield className="w-3 h-3 mt-0.5 shrink-0" />
                        <span>{exp}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Exposure context */}
                {data.risk_impact.exposure_context && data.risk_impact.exposure_context.map((ctx, i) => (
                  <p key={i} className="text-xs text-muted-foreground mt-2 italic">{ctx}</p>
                ))}

                {/* Summary */}
                <p className="text-sm font-medium mt-3 pt-2 border-t border-current/20">
                  {data.risk_impact.impact_summary}
                </p>
              </div>
            )}

            {/* Rules applied */}
            {data.rules_applied && data.rules_applied.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-md p-3">
                <h4 className="font-medium text-sm mb-1 text-yellow-600">Reglas de excepcion aplicadas</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {data.rules_applied.map((rule, i) => (
                    <li key={i} className="font-mono">{rule}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Remediation recommendation */}
            <div className="bg-green-500/10 border border-green-500/20 rounded-md p-3">
              <h4 className="font-medium text-sm mb-1 text-green-600">Recomendacion de remediacion</h4>
              <p className="text-sm">{data.remediation}</p>
            </div>

            {/* Fixed versions */}
            {finding.fixed_versions && finding.fixed_versions.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-1">Versiones corregidas</h4>
                <div className="flex flex-wrap gap-1">
                  {finding.fixed_versions.map((v, i) => (
                    <Badge key={i} variant="outline" className="font-mono text-xs">{v}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Evidence */}
            {data.evidence && data.evidence.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Evidencia</h4>
                <div className="grid grid-cols-2 gap-2">
                  {data.evidence.map((ev, i) => (
                    <div key={i} className="text-xs bg-muted p-2 rounded">
                      <span className="font-medium">{ev.source}:</span>{' '}
                      {ev.severity && <span>Severidad {ev.severity} </span>}
                      {ev.value !== undefined && typeof ev.value === 'number' && (
                        <span className="font-mono">{ev.value.toFixed(4)}</span>
                      )}
                      {ev.value === 'known_exploited' && (
                        <Badge variant="destructive" className="text-xs">Explotacion activa</Badge>
                      )}
                      {ev.fixed_versions && (
                        <span>Parches: {ev.fixed_versions.join(', ')}</span>
                      )}
                      {ev.details && (
                        <span className="block mt-1 text-muted-foreground line-clamp-2">{ev.details}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* External links */}
            <div className="flex items-center gap-2 pt-2 border-t">
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

        {/* Fallback for no explanation data */}
        {expanded && !data && (
          <div className="mt-4 border-t pt-4">
            <p className="text-sm text-muted-foreground">
              Sin datos de explicacion disponibles.
            </p>
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

function getBarColor(contribution: number): string {
  if (contribution >= 15) return 'bg-red-500';
  if (contribution >= 10) return 'bg-orange-500';
  if (contribution >= 5) return 'bg-yellow-500';
  return 'bg-blue-500';
}

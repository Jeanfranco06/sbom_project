'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import {
  Shield,
  TrendingUp,
  Wrench,
  ArrowRight,
  Target,
  Bug,
  Globe,
} from 'lucide-react';

interface RiskDimension {
  name: string;
  label: string;
  score: number;
  weight: number;
  findings_count: number;
  critical_count: number;
  description: string;
}

interface RemediationAction {
  priority: number;
  title: string;
  description: string;
  effort: string;
  affected_packages: string[];
  risk_reduction: number;
  finding_ids: number[];
}

interface RiskAssessment {
  project_id: number;
  overall_risk_score: number;
  risk_level: string;
  dimensions: RiskDimension[];
  top_actions: RemediationAction[];
  summary: string;
  stats: Record<string, unknown>;
}

const RISK_COLORS: Record<string, string> = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
};

const RISK_TEXT_COLORS: Record<string, string> = {
  critical: 'text-red-500',
  high: 'text-orange-500',
  medium: 'text-yellow-500',
  low: 'text-blue-500',
};

const DIMENSION_ICONS: Record<string, React.ElementType> = {
  technical: Bug,
  exploitation: TrendingUp,
  exposure: Globe,
  maintenance: Wrench,
};

const EFFORT_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: 'Bajo', color: 'bg-green-500/10 text-green-500' },
  medium: { label: 'Medio', color: 'bg-yellow-500/10 text-yellow-500' },
  high: { label: 'Alto', color: 'bg-red-500/10 text-red-500' },
};

interface RiskAssessmentPanelProps {
  projectId: number;
}

export function RiskAssessmentPanel({ projectId }: RiskAssessmentPanelProps) {
  const [assessment, setAssessment] = React.useState<RiskAssessment | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchAssessment = async () => {
      try {
        setLoading(true);
        const data = await api.getRiskAssessment(projectId);
        setAssessment(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading risk assessment');
      } finally {
        setLoading(false);
      }
    };
    fetchAssessment();
  }, [projectId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="h-48 animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-1/2 mb-2" />
              <div className="h-3 bg-muted rounded w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">{error || 'No hay datos de riesgo disponibles'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <Card className={`border-2 ${
        assessment.risk_level === 'critical' ? 'border-red-500/50' :
        assessment.risk_level === 'high' ? 'border-orange-500/50' :
        assessment.risk_level === 'medium' ? 'border-yellow-500/50' :
        'border-blue-500/50'
      }`}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-lg ${RISK_COLORS[assessment.risk_level]}/10`}>
              <Shield className={`w-8 h-8 ${RISK_TEXT_COLORS[assessment.risk_level]}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold">Resumen Ejecutivo</h3>
                <Badge variant="outline" className={`${RISK_TEXT_COLORS[assessment.risk_level]} border-current`}>
                  Riesgo {assessment.risk_level.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {assessment.summary}
              </p>
            </div>
            <div className="text-center">
              <div className={`text-4xl font-bold ${RISK_TEXT_COLORS[assessment.risk_level]}`}>
                {Math.round(assessment.overall_risk_score)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">/ 100</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Dimensions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {assessment.dimensions.map((dim) => {
          const Icon = DIMENSION_ICONS[dim.name] || Target;
          return (
            <Card key={dim.name}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{dim.label}</span>
                  </div>
                  <span className="text-lg font-bold">{Math.round(dim.score)}</span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-muted rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full ${RISK_COLORS[
                      dim.score >= 70 ? 'critical' : dim.score >= 50 ? 'high' : dim.score >= 30 ? 'medium' : 'low'
                    ]}`}
                    style={{ width: `${Math.min(dim.score, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{dim.description}</p>
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <span className="text-muted-foreground">{dim.findings_count} hallazgos</span>
                  {dim.critical_count > 0 && (
                    <span className="text-red-500">({dim.critical_count} críticos)</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Top Remediation Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Plan de Remediación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {assessment.top_actions.map((action) => {
              const effort = EFFORT_LABELS[action.effort] || EFFORT_LABELS.medium;
              return (
                <div
                  key={action.priority}
                  className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                    {action.priority}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{action.title}</h4>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${effort.color}`}>
                        Esfuerzo: {effort.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{action.description}</p>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-muted-foreground">
                        Paquetes: {action.affected_packages ? action.affected_packages.slice(0, 3).join(', ') : 'Desconocido'}
                        {action.affected_packages && action.affected_packages.length > 3 && ` +${action.affected_packages.length - 3}`}
                      </span>
                      <span className="text-green-500">
                        Reducción estimada: {action.risk_reduction}%
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

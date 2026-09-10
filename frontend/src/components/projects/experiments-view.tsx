'use client';

import * as React from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FindingCard } from '@/components/findings/finding-card';
import { api } from '@/lib/api';
import type { Finding, Project } from '@/types';
import { Play, BarChart3, AlertCircle } from 'lucide-react';

export function ExperimentsView() {
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>('');
  
  const [triageFindings, setTriageFindings] = React.useState<Finding[]>([]);
  const [currentCondition, setCurrentCondition] = React.useState<'A' | 'D'>('A');
  const [timer, setTimer] = React.useState(0);
  const [isTimerRunning, setIsTimerRunning] = React.useState(false);
  const [participantId, setParticipantId] = React.useState('');
  const [decisionCorrect, setDecisionCorrect] = React.useState(false);
  const [trialSaved, setTrialSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [trialsSummary, setTrialsSummary] = React.useState<{
    condition_a: { avg_time: number; accuracy: number; count: number };
    condition_d: { avg_time: number; accuracy: number; count: number };
  } | null>(null);

  // Load Projects on mount
  React.useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await api.getProjects();
        setProjects(data);
        if (data.length > 0) {
          setSelectedProjectId(data[0].id.toString());
        }
      } catch (err) {
        console.error('Failed to load projects:', err);
      }
    };
    fetchProjects();
    loadSummary();
  }, []);

  // Timer
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimer((t) => t + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const loadTriageScenario = async (condition: 'A' | 'D') => {
    if (!selectedProjectId) {
      setError('Debes seleccionar un proyecto primero.');
      return;
    }
    try {
      setError(null);
      const data = await api.getTriageScenario(parseInt(selectedProjectId), condition);
      // Data correctly comes as { cards: Finding[] } based on backend
      setTriageFindings(data.cards || []);
      setCurrentCondition(condition);
      setTimer(0);
      setIsTimerRunning(true);
      setTrialSaved(false);
    } catch (err: any) {
      setError(err.message || 'Error cargando el escenario. ¿Aseguraste de analizar el proyecto primero?');
      setTriageFindings([]);
    }
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
  };

  const saveTrial = async () => {
    if (!participantId || !selectedProjectId) return;

    try {
      await api.createTrial({
        participant_id: participantId,
        condition: currentCondition,
        scenario: `Escenario ${currentCondition}`,
        project_id: parseInt(selectedProjectId),
        triage_seconds: timer,
        decision_correct: decisionCorrect,
      });
      setTrialSaved(true);
      loadSummary();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el resultado.');
    }
  };

  const loadSummary = async () => {
    try {
      const summary = await api.getTrialsSummary();
      if (summary) {
        setTrialsSummary({
          condition_a: summary.condition_a || { avg_time: 0, accuracy: 0, count: 0 },
          condition_d: summary.condition_d || { avg_time: 0, accuracy: 0, count: 0 },
        });
      }
    } catch (error) {
      console.error('Failed to load summary:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Experimentación y usabilidad"
        description="Corpus comparativo (condiciones A-D), tiempo de triage y prueba de Wilcoxon."
      >
        <div className="flex items-center gap-2">
          <Label htmlFor="project-select" className="sr-only">Proyecto</Label>
          <select
            id="project-select"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-1.5 rounded-md border bg-background text-sm min-w-[200px]"
          >
            {projects.length === 0 ? (
              <option value="">No hay proyectos...</option>
            ) : (
              projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))
            )}
          </select>
          <Button onClick={() => loadTriageScenario('A')} disabled={!selectedProjectId}>
            <Play className="w-4 h-4 mr-2" />
            Iniciar Baseline
          </Button>
          <Button variant="secondary" onClick={() => loadTriageScenario('D')} disabled={!selectedProjectId}>
            <Play className="w-4 h-4 mr-2" />
            Iniciar Explicable
          </Button>
        </div>
      </Header>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/50 text-red-500 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Triage Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Controles de la Prueba</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-6 bg-muted/30 p-4 rounded-lg border">
              <div className="flex flex-col gap-1">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Condición Actual</Label>
                <div className="text-lg font-bold text-primary">
                  {currentCondition === 'A' ? 'A (Baseline - Solo CVSS)' : 'D (Explicable - SecSBOM)'}
                </div>
              </div>

              <div className="h-10 w-px bg-border mx-2" />

              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="participant" className="text-muted-foreground text-xs uppercase tracking-wider">Participante ID</Label>
                  <Input
                    id="participant"
                    value={participantId}
                    onChange={(e) => setParticipantId(e.target.value)}
                    placeholder="Ej. P-001"
                    className="w-32"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 ml-auto">
                <div className="flex flex-col items-end gap-1">
                  <Label className="text-muted-foreground text-xs uppercase tracking-wider">Tiempo transcurrido</Label>
                  <span className="text-3xl font-mono font-bold text-foreground">
                    {formatTime(timer)}
                  </span>
                </div>
                {isTimerRunning && (
                  <Button variant="destructive" onClick={stopTimer}>
                    Detener Reloj
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Label className="flex items-center gap-3 text-base cursor-pointer p-2 hover:bg-muted/50 rounded-lg transition-colors">
                <input
                  type="checkbox"
                  checked={decisionCorrect}
                  onChange={(e) => setDecisionCorrect(e.target.checked)}
                  className="w-5 h-5 accent-primary"
                />
                El participante tomó la decisión correcta de remediación
              </Label>

              <Button
                size="lg"
                onClick={saveTrial}
                disabled={!participantId || timer === 0 || trialSaved}
                className={trialSaved ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {trialSaved ? 'Resultado Guardado ✓' : 'Guardar Resultado'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Triage Cards */}
        {triageFindings.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Escenario (Condición {currentCondition})
              </h3>
              <span className="text-sm text-muted-foreground">Mostrando {triageFindings.length} vulnerabilidades críticas</span>
            </div>
            <div className="grid gap-4">
              {triageFindings.map((finding, idx) => (
                <FindingCard
                  key={finding.id ? `triage-${finding.id}` : `triage-idx-${idx}`}
                  finding={finding}
                />
              ))}
            </div>
          </div>
        )}

        {/* Results Summary */}
        {trialsSummary && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Estadísticas Globales del Experimento (En tiempo real)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-4 rounded-lg border bg-card">
                  <h4 className="font-bold text-lg mb-4 text-primary">Condición A (Baseline CVSS)</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-muted-foreground">Tiempo de Triage Promedio:</span>
                      <span className="font-mono text-xl">
                        {formatTime(Math.round(trialsSummary.condition_a?.avg_time || 0))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-muted-foreground">Tasa de Decisión Correcta:</span>
                      <span className="font-mono text-xl font-bold">
                        {((trialsSummary.condition_a?.accuracy || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Pruebas realizadas:</span>
                      <span className="font-mono">{trialsSummary.condition_a?.count || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg border bg-card">
                  <h4 className="font-bold text-lg mb-4 text-primary">Condición D (SecSBOM Explicable)</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-muted-foreground">Tiempo de Triage Promedio:</span>
                      <span className="font-mono text-xl">
                        {formatTime(Math.round(trialsSummary.condition_d?.avg_time || 0))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-muted-foreground">Tasa de Decisión Correcta:</span>
                      <span className="font-mono text-xl font-bold">
                        {((trialsSummary.condition_d?.accuracy || 0) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Pruebas realizadas:</span>
                      <span className="font-mono">{trialsSummary.condition_d?.count || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

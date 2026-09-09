'use client';

import * as React from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FindingCard } from '@/components/findings/finding-card';
import { api } from '@/lib/api';
import type { Finding } from '@/types';
import { Play, BarChart3 } from 'lucide-react';

export function ExperimentsView() {
  const [triageFindings, setTriageFindings] = React.useState<Finding[]>([]);
  const [currentCondition, setCurrentCondition] = React.useState<'A' | 'D'>('A');
  const [timer, setTimer] = React.useState(0);
  const [isTimerRunning, setIsTimerRunning] = React.useState(false);
  const [participantId, setParticipantId] = React.useState('');
  const [decisionCorrect, setDecisionCorrect] = React.useState(false);
  const [trialSaved, setTrialSaved] = React.useState(false);

  const [trialsSummary, setTrialsSummary] = React.useState<{
    condition_a: { avg_time: number; accuracy: number; count: number };
    condition_d: { avg_time: number; accuracy: number; count: number };
  } | null>(null);

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
    try {
      const data = await api.getTriageScenario(1, condition); // projectId 1 for demo
      setTriageFindings(data.findings);
      setCurrentCondition(condition);
      setTimer(0);
      setIsTimerRunning(true);
      setTrialSaved(false);
    } catch (error) {
      console.error('Failed to load scenario:', error);
    }
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
  };

  const saveTrial = async () => {
    if (!participantId) return;

    try {
      await api.createTrial({
        participant_id: participantId,
        condition: currentCondition,
        scenario: `Escenario ${currentCondition}`,
        project_id: 1,
        triage_seconds: timer,
        decision_correct: decisionCorrect,
      });
      setTrialSaved(true);
      loadSummary();
    } catch (error) {
      console.error('Failed to save trial:', error);
    }
  };

  const loadSummary = async () => {
    try {
      const summary = await api.getTrialsSummary();
      setTrialsSummary(summary);
    } catch (error) {
      console.error('Failed to load summary:', error);
    }
  };

  React.useEffect(() => {
    loadSummary();
  }, []);

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
        <Button onClick={() => loadTriageScenario('A')}>
          <Play className="w-4 h-4 mr-2" />
          Ejecutar experimento
        </Button>
      </Header>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Triage Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Pruebas de usabilidad (A vs D)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <Button
                variant={currentCondition === 'A' ? 'default' : 'outline'}
                onClick={() => loadTriageScenario('A')}
              >
                Condición A (Baseline)
              </Button>
              <Button
                variant={currentCondition === 'D' ? 'default' : 'outline'}
                onClick={() => loadTriageScenario('D')}
              >
                Condición D (Explicable)
              </Button>

              <div className="flex items-center gap-2">
                <Label htmlFor="participant">Participante:</Label>
                <Input
                  id="participant"
                  value={participantId}
                  onChange={(e) => setParticipantId(e.target.value)}
                  placeholder="ID participante"
                  className="w-40"
                />
              </div>

              <div className="flex items-center gap-2">
                <Label>Tiempo:</Label>
                <span className="text-2xl font-mono font-bold">
                  {formatTime(timer)}
                </span>
                {isTimerRunning && (
                  <Button variant="outline" size="sm" onClick={stopTimer}>
                    Detener
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={decisionCorrect}
                  onChange={(e) => setDecisionCorrect(e.target.checked)}
                  className="accent-primary"
                />
                Decisión correcta
              </Label>

              <Button
                onClick={saveTrial}
                disabled={!participantId || timer === 0 || trialSaved}
              >
                {trialSaved ? 'Guardado' : 'Guardar resultado'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Triage Cards */}
        {triageFindings.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">
              Escenario Condición {currentCondition}
            </h3>
            <div className="grid gap-4">
              {triageFindings.map((finding) => (
                <FindingCard key={finding.id} finding={finding} />
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
                Resultados de usabilidad
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h4 className="font-medium mb-4">Condición A (Baseline)</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tiempo promedio:</span>
                      <span className="font-mono">
                        {formatTime(Math.round(trialsSummary.condition_a.avg_time))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Precisión:</span>
                      <span className="font-mono">
                        {(trialsSummary.condition_a.accuracy * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Participantes:</span>
                      <span className="font-mono">{trialsSummary.condition_a.count}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-4">Condición D (Explicable)</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tiempo promedio:</span>
                      <span className="font-mono">
                        {formatTime(Math.round(trialsSummary.condition_d.avg_time))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Precisión:</span>
                      <span className="font-mono">
                        {(trialsSummary.condition_d.accuracy * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Participantes:</span>
                      <span className="font-mono">{trialsSummary.condition_d.count}</span>
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

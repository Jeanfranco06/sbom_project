'use client';

import * as React from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import type { SnapshotStatus } from '@/types';
import { Download, Check, X, RefreshCw, Loader2, AlertCircle } from 'lucide-react';

interface DownloadProgress {
  source: string;
  stage: string;
  progress: number;
  message: string;
}

export function SnapshotsView() {
  const [status, setStatus] = React.useState<SnapshotStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [downloading, setDownloading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<DownloadProgress[]>([]);
  const [currentMessage, setCurrentMessage] = React.useState('');

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const data = await api.getSnapshotStatus();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error fetching status');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchStatus();
  }, []);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      setError(null);
      setProgress([]);
      setCurrentMessage('Iniciando descarga...');

      const response = await fetch('/api/snapshots/download/stream?kev=true&epss=true');
      
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No se pudo leer la respuesta');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.status === 'completed') {
                setCurrentMessage('Descarga completada');
                setProgress(prev => [...prev, {
                  source: 'system',
                  stage: 'completed',
                  progress: 100,
                  message: data.message
                }]);
              } else if (data.status === 'error') {
                setError(data.message);
                setCurrentMessage('Error en la descarga');
              } else {
                setProgress(prev => {
                  const existing = prev.findIndex(p => p.source === data.source);
                  if (existing >= 0) {
                    const updated = [...prev];
                    updated[existing] = data;
                    return updated;
                  }
                  return [...prev, data];
                });
                setCurrentMessage(data.message);
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al descargar');
      setCurrentMessage('Error en la descarga');
    } finally {
      setDownloading(false);
    }
  };

  const getProgressForSource = (source: string) => {
    return progress.find(p => p.source === source);
  };

  const kevProgress = getProgressForSource('kev');
  const epssProgress = getProgressForSource('epss');

  return (
    <div className="flex flex-col h-full min-w-0 overflow-hidden">
      <Header
        title="Snapshots de inteligencia"
        description="Descarga puntual de CISA KEV y FIRST EPSS para modo offline e hibrido."
      >
        <Button 
          onClick={handleDownload} 
          disabled={downloading}
          className="gradient-primary text-white"
        >
          {downloading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          {downloading ? 'Descargando...' : 'Descargar ahora'}
        </Button>
        <Button variant="outline" onClick={fetchStatus} disabled={downloading}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </Header>

      <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-6">
        {/* Progress Section */}
        {downloading && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>{currentMessage}</span>
                </div>

                {/* Overall Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Progreso total</span>
                    <span>
                      {Math.round(
                        ((kevProgress?.progress || 0) + (epssProgress?.progress || 0)) / 2
                      )}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full gradient-primary transition-all duration-300"
                      style={{
                        width: `${((kevProgress?.progress || 0) + (epssProgress?.progress || 0)) / 2}%`
                      }}
                    />
                  </div>
                </div>

                {/* Individual Progress */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* KEV Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">CISA KEV</span>
                      <span className="text-muted-foreground">{kevProgress?.progress || 0}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500 transition-all duration-300"
                        style={{ width: `${kevProgress?.progress || 0}%` }}
                      />
                    </div>
                    {kevProgress?.message && (
                      <p className="text-xs text-muted-foreground">{kevProgress.message}</p>
                    )}
                  </div>

                  {/* EPSS Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">FIRST EPSS</span>
                      <span className="text-muted-foreground">{epssProgress?.progress || 0}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${epssProgress?.progress || 0}%` }}
                      />
                    </div>
                    {epssProgress?.message && (
                      <p className="text-xs text-muted-foreground">{epssProgress.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && !downloading && (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={() => setError(null)} className="ml-auto">
                Cerrar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Status Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <Card key={i} className="h-48 animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-1/2 mb-2" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error && !status ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-destructive">{error}</p>
              <Button variant="outline" onClick={fetchStatus} className="mt-4">
                Reintentar
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* KEV Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>CISA KEV</CardTitle>
                  {status?.kev.available ? (
                    <span className="flex items-center gap-1 text-emerald-500 text-sm">
                      <Check className="w-4 h-4" /> Disponible
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-500 text-sm">
                      <X className="w-4 h-4" /> No disponible
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Known Exploited Vulnerabilities Catalog
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Entradas:</span>
                    <span className="font-mono">{status?.kev.count || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Ultima actualizacion:</span>
                    <span className="font-mono">
                      {status?.kev.last_updated
                        ? new Date(status.kev.last_updated).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* EPSS Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>FIRST EPSS</CardTitle>
                  {status?.epss.available ? (
                    <span className="flex items-center gap-1 text-emerald-500 text-sm">
                      <Check className="w-4 h-4" /> Disponible
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-red-500 text-sm">
                      <X className="w-4 h-4" /> No disponible
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Exploit Prediction Scoring System
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Entradas:</span>
                    <span className="font-mono">{status?.epss.count || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Ultima actualizacion:</span>
                    <span className="font-mono">
                      {status?.epss.last_updated
                        ? new Date(status.epss.last_updated).toLocaleDateString()
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

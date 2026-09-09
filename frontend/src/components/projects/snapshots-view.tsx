'use client';

import * as React from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import type { SnapshotStatus } from '@/types';
import { Download, Check, X, RefreshCw } from 'lucide-react';

export function SnapshotsView() {
  const [status, setStatus] = React.useState<SnapshotStatus | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [downloading, setDownloading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
      await api.downloadSnapshots();
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error downloading');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Snapshots de inteligencia"
        description="Descarga puntual de CISA KEV y FIRST EPSS para modo offline e híbrido."
      >
        <Button onClick={handleDownload} disabled={downloading}>
          <Download className="w-4 h-4 mr-2" />
          {downloading ? 'Descargando...' : 'Descargar ahora'}
        </Button>
        <Button variant="outline" onClick={fetchStatus}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </Header>

      <div className="flex-1 overflow-auto p-4 space-y-6">
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
        ) : error ? (
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
                    <span className="flex items-center gap-1 text-green-500 text-sm">
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
                    <span>Última actualización:</span>
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
                    <span className="flex items-center gap-1 text-green-500 text-sm">
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
                    <span>Última actualización:</span>
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

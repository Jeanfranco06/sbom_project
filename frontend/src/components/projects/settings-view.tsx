'use client';

import * as React from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useWeights } from '@/hooks/useApi';
import { api } from '@/lib/api';
import { Save, RotateCcw, Wifi, WifiOff, RefreshCw } from 'lucide-react';

const defaultWeights = {
  cvss: 20,
  kev: 25,
  epss: 15,
  exposure: 15,
  environment: 10,
  dependency: 5,
  data_criticality: 5,
  remediation: 5,
};

const weightLabels: Record<keyof typeof defaultWeights, { label: string; description: string }> = {
  cvss: { label: 'CVSS', description: 'Severidad tecnica (0-100)' },
  kev: { label: 'KEV', description: 'Explotacion activa (0 o 100)' },
  epss: { label: 'EPSS', description: 'Probabilidad de explotacion (0-100)' },
  exposure: { label: 'Exposicion', description: 'Expuesto a Internet (0-100)' },
  environment: { label: 'Entorno', description: 'Produccion/Staging/Desarrollo (0-100)' },
  dependency: { label: 'Alcance', description: 'Dependencia directa/transitiva (0-100)' },
  data_criticality: { label: 'Criticidad', description: 'Criticidad de datos tratados (0-100)' },
  remediation: { label: 'Remediacion', description: 'Disponibilidad de parche (0-100)' },
};

const MODE_OPTIONS = [
  { value: 'connected', label: 'Conectado', description: 'Consulta OSV/NVD en tiempo real', icon: Wifi, color: 'text-green-500' },
  { value: 'offline', label: 'Offline', description: 'Solo snapshots locales, sin red', icon: WifiOff, color: 'text-yellow-500' },
  { value: 'hybrid', label: 'Hibrido', description: 'Consulta y guarda para offline', icon: RefreshCw, color: 'text-blue-500' },
];

interface SettingsViewProps {
  onModeChange?: () => void;
}

export function SettingsView({ onModeChange }: SettingsViewProps) {
  const { weights, updateWeights } = useWeights();
  const [localWeights, setLocalWeights] = React.useState(defaultWeights);
  const [saving, setSaving] = React.useState(false);
  const [mode, setMode] = React.useState('offline');
  const [modeSaving, setModeSaving] = React.useState(false);

  React.useEffect(() => {
    if (weights) {
      setLocalWeights(weights);
    }
    const fetchMode = async () => {
      try {
        const settings = await api.getSettings();
        setMode(settings.mode);
      } catch {
        // keep default
      }
    };
    fetchMode();
  }, [weights]);

  const total = Object.values(localWeights).reduce((sum, v) => sum + v, 0);

  const handleWeightChange = (key: keyof typeof defaultWeights, value: number) => {
    setLocalWeights({ ...localWeights, [key]: value });
  };

  const handleSave = async () => {
    setSaving(true);
    await updateWeights(localWeights);
    setSaving(false);
  };

  const handleModeChange = async (newMode: string) => {
    setModeSaving(true);
    try {
      await api.updateMode(newMode);
      setMode(newMode);
      onModeChange?.();
    } catch (err) {
      console.error('Failed to update mode:', err);
    } finally {
      setModeSaving(false);
    }
  };

  const handleReset = () => {
    setLocalWeights(defaultWeights);
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Configuracion del modelo"
        description="Pesos del modelo P_v = wC*C + wK*K + wE*E + wX*X + wA*A + wD*D + wI*I + wR*R"
      >
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Restablecer
        </Button>
        <Button onClick={handleSave} disabled={saving || total !== 100}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Guardando...' : 'Guardar pesos'}
        </Button>
      </Header>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Mode Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Modo de operacion</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Define como se consultan las vulnerabilidades. El modo se aplica por defecto a todos los proyectos.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {MODE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = mode === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleModeChange(opt.value)}
                    disabled={modeSaving}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`w-5 h-5 ${isSelected ? opt.color : 'text-muted-foreground'}`} />
                      <span className="font-medium">{opt.label}</span>
                      {isSelected && (
                        <span className="ml-auto text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                          Activo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Total Indicator */}
        <Card className={total !== 100 ? 'border-yellow-500/50' : 'border-green-500/50'}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Total de pesos</span>
              <span className={`text-2xl font-bold ${total !== 100 ? 'text-yellow-500' : 'text-green-500'}`}>
                {total}
              </span>
            </div>
            {total !== 100 && (
              <p className="text-sm text-yellow-500 mt-1">
                Los pesos deben sumar exactamente 100
              </p>
            )}
          </CardContent>
        </Card>

        {/* Weight Sliders */}
        <Card>
          <CardHeader>
            <CardTitle>Pesos del modelo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {(Object.keys(localWeights) as Array<keyof typeof defaultWeights>).map((key) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{weightLabels[key].label}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {weightLabels[key].description}
                    </span>
                  </div>
                  <span className="text-sm font-mono text-muted-foreground">
                    {localWeights[key]}%
                  </span>
                </div>
                <Slider
                  value={[localWeights[key]]}
                  onValueChange={([value]) => handleWeightChange(key, value)}
                  min={0}
                  max={100}
                  step={5}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Formula Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Formula de priorizacion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-sm bg-muted p-4 rounded-lg">
              P_v = {localWeights.cvss}*C + {localWeights.kev}*K + {localWeights.epss}*E +{' '}
              {localWeights.exposure}*X + {localWeights.environment}*A + {localWeights.dependency}*D +{' '}
              {localWeights.data_criticality}*I + {localWeights.remediation}*R
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              <p>Donde:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>C = severidad CVSS normalizada (0-1)</li>
                <li>K = evidencia KEV (0 o 1)</li>
                <li>E = EPSS normalizado (0-1)</li>
                <li>X = exposicion del componente (0-1)</li>
                <li>A = entorno o ambiente (0-1)</li>
                <li>D = tipo/profundidad de dependencia (0-1)</li>
                <li>I = criticidad de datos (0-1)</li>
                <li>R = remediabilidad (0-1)</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

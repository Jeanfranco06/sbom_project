'use client';

import * as React from 'react';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useWeights } from '@/hooks/useApi';
import { Save, RotateCcw } from 'lucide-react';

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
  cvss: { label: 'CVSS', description: 'Severidad técnica (0-100)' },
  kev: { label: 'KEV', description: 'Explotación activa (0 o 100)' },
  epss: { label: 'EPSS', description: 'Probabilidad de explotación (0-100)' },
  exposure: { label: 'Exposición', description: 'Expuesto a Internet (0-100)' },
  environment: { label: 'Entorno', description: 'Producción/Staging/Desarrollo (0-100)' },
  dependency: { label: 'Alcance', description: 'Dependencia directa/transitiva (0-100)' },
  data_criticality: { label: 'Criticidad', description: 'Criticidad de datos tratados (0-100)' },
  remediation: { label: 'Remediación', description: 'Disponibilidad de parche (0-100)' },
};

export function SettingsView() {
  const { weights, updateWeights } = useWeights();
  const [localWeights, setLocalWeights] = React.useState(defaultWeights);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (weights) {
      setLocalWeights(weights);
    }
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

  const handleReset = () => {
    setLocalWeights(defaultWeights);
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Configuración del modelo"
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
            <CardTitle>Fórmula de priorización</CardTitle>
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
                <li>X = exposición del componente (0-1)</li>
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

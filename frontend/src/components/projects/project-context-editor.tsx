'use client';

import * as React from 'react';
import { Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api';
import type { Project } from '@/types';

interface ProjectContextEditorProps {
  project: Project;
  onSaved: (project: Project) => void;
}

export function ProjectContextEditor({ project, onSaved }: ProjectContextEditorProps) {
  const [environment, setEnvironment] = React.useState(project.environment);
  const [dataCriticality, setDataCriticality] = React.useState(project.data_criticality);
  const [internetExposed, setInternetExposed] = React.useState(project.internet_exposed);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setEnvironment(project.environment);
    setDataCriticality(project.data_criticality);
    setInternetExposed(project.internet_exposed);
  }, [project]);

  const hasChanges =
    environment !== project.environment ||
    dataCriticality !== project.data_criticality ||
    internetExposed !== project.internet_exposed;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updatedProject = await api.updateProject(project.id, {
        environment,
        data_criticality: dataCriticality,
        internet_exposed: internetExposed,
      });
      onSaved(updatedProject);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el contexto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Contexto de priorización</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Estos datos se usan para calcular el riesgo contextual del proyecto.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || !hasChanges}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Guardando...' : 'Guardar contexto'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="project-environment">Entorno de ejecución</Label>
            <Select
              id="project-environment"
              value={environment}
              onChange={(event) => setEnvironment(event.target.value as Project['environment'])}
            >
              <option value="production">Producción</option>
              <option value="staging">Staging</option>
              <option value="development">Desarrollo</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="project-data-criticality">Criticidad de los datos</Label>
            <Select
              id="project-data-criticality"
              value={dataCriticality}
              onChange={(event) => setDataCriticality(event.target.value as Project['data_criticality'])}
            >
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </Select>
          </div>
        </div>
        <Label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={internetExposed}
            onChange={(event) => setInternetExposed(event.target.checked)}
            className="accent-primary"
          />
          Componente o servicio expuesto a Internet
        </Label>
        {hasChanges && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Guarda los cambios y vuelve a analizar el proyecto para recalcular sus prioridades.
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

'use client';

import * as React from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api';
import type { GroundTruth, PriorityLabel } from '@/types';

type GroundTruthDraft = Pick<GroundTruth, 'vuln_id' | 'expected_priority' | 'justification'>;

const emptyEntry: GroundTruthDraft = {
  vuln_id: '',
  expected_priority: 'medium',
  justification: '',
};

interface GroundTruthEditorProps {
  projectId: number;
  onSaved: () => void;
}

export function GroundTruthEditor({ projectId, onSaved }: GroundTruthEditorProps) {
  const [entries, setEntries] = React.useState<GroundTruthDraft[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadEntries = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getGroundTruth(projectId);
      setEntries(data.length > 0 ? data.map(({ vuln_id, expected_priority, justification }) => ({
        vuln_id,
        expected_priority: expected_priority as PriorityLabel,
        justification: justification || '',
      })) : [{ ...emptyEntry }]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el ground truth');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const updateEntry = (index: number, changes: Partial<GroundTruthDraft>) => {
    setEntries((current) => current.map((entry, i) => i === index ? { ...entry, ...changes } : entry));
  };

  const handleSave = async () => {
    const validEntries = entries
      .map((entry) => ({ ...entry, vuln_id: entry.vuln_id.trim() }))
      .filter((entry) => entry.vuln_id);
    if (validEntries.length === 0) {
      setError('Añade al menos un identificador de vulnerabilidad, por ejemplo CVE-2023-4863.');
      return;
    }

    const duplicateIds = validEntries.map((entry) => entry.vuln_id.toLowerCase());
    if (new Set(duplicateIds).size !== duplicateIds.length) {
      setError('No puede haber identificadores de vulnerabilidad duplicados.');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await api.setGroundTruth(projectId, validEntries);
      setEntries(validEntries);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el ground truth');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Ground truth</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Etiqueta la prioridad esperada por expertos para comparar el ranking.
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving || loading}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Guardando...' : 'Guardar ground truth'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando registros...</p>
        ) : (
          entries.map((entry, index) => (
            <div key={`${index}-${entry.vuln_id}`} className="grid grid-cols-1 md:grid-cols-[1.2fr_180px_1.5fr_auto] gap-3 items-end">
              <div className="space-y-2">
                <Label htmlFor={`ground-truth-vuln-${index}`}>Vulnerabilidad</Label>
                <Input
                  id={`ground-truth-vuln-${index}`}
                  value={entry.vuln_id}
                  onChange={(event) => updateEntry(index, { vuln_id: event.target.value })}
                  placeholder="CVE-2023-4863"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`ground-truth-priority-${index}`}>Prioridad esperada</Label>
                <Select
                  id={`ground-truth-priority-${index}`}
                  value={entry.expected_priority}
                  onChange={(event) => updateEntry(index, { expected_priority: event.target.value as PriorityLabel })}
                >
                  <option value="critical">Crítica</option>
                  <option value="high">Alta</option>
                  <option value="medium">Media</option>
                  <option value="low">Baja</option>
                  <option value="info">Info</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`ground-truth-justification-${index}`}>Justificación (opcional)</Label>
                <Input
                  id={`ground-truth-justification-${index}`}
                  value={entry.justification || ''}
                  onChange={(event) => updateEntry(index, { justification: event.target.value })}
                  placeholder="Razón de la etiqueta"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Eliminar registro"
                onClick={() => setEntries((current) => current.filter((_, i) => i !== index))}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
        <Button type="button" variant="outline" onClick={() => setEntries((current) => [...current, { ...emptyEntry }])} disabled={loading}>
          <Plus className="w-4 h-4 mr-2" />
          Añadir vulnerabilidad
        </Button>
        <p className="text-xs text-muted-foreground">
          El identificador debe coincidir con el `vuln_id` de un hallazgo del análisis.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

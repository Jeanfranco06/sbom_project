'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { api } from '@/lib/api';
import type { Project } from '@/types';

const projectSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  source_type: z.enum(['local', 'git', 'upload']),
  path: z.string().optional(),
  git_url: z.string().url('URL inválida').optional().or(z.literal('')),
  environment: z.enum(['production', 'staging', 'development']),
  data_criticality: z.enum(['high', 'medium', 'low']),
  internet_exposed: z.boolean(),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
}

export function CreateProjectModal({ open, onClose, onCreated }: CreateProjectModalProps) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      source_type: 'local',
      environment: 'production',
      data_criticality: 'medium',
      internet_exposed: true,
    },
  });

  const sourceType = watch('source_type');

  const onSubmit = async (data: ProjectFormData) => {
    try {
      setLoading(true);
      setError(null);

      const projectData: Partial<Project> = {
        name: data.name,
        description: data.description || undefined,
        source_type: data.source_type,
        path: data.source_type === 'local' ? data.path || undefined : undefined,
        git_url: data.source_type === 'git' ? data.git_url || undefined : undefined,
        environment: data.environment,
        data_criticality: data.data_criticality,
        internet_exposed: data.internet_exposed,
      };

      const project = await api.createProject(projectData);
      onCreated(project);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear proyecto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nuevo proyecto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nombre *</Label>
          <Input
            id="name"
            placeholder="Mi proyecto"
            {...register('name')}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Input
            id="description"
            placeholder="Descripción del proyecto"
            {...register('description')}
          />
        </div>

        <div className="space-y-2">
          <Label>Origen del código</Label>
          <div className="flex gap-2">
            <Label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="local"
                {...register('source_type')}
                className="accent-primary"
              />
              Ruta Local
            </Label>
            <Label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="git"
                {...register('source_type')}
                className="accent-primary"
              />
              Repositorio Git
            </Label>
            <Label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="upload"
                {...register('source_type')}
                className="accent-primary"
              />
              Subir Archivo
            </Label>
          </div>
        </div>

        {sourceType === 'local' && (
          <div className="space-y-2">
            <Label htmlFor="path">Ruta local del proyecto</Label>
            <Input
              id="path"
              placeholder="C:/ruta/al/proyecto"
              {...register('path')}
            />
          </div>
        )}

        {sourceType === 'git' && (
          <div className="space-y-2">
            <Label htmlFor="git_url">URL de Git (HTTPS)</Label>
            <Input
              id="git_url"
              placeholder="https://github.com/usuario/repo.git"
              {...register('git_url')}
            />
            {errors.git_url && (
              <p className="text-sm text-destructive">{errors.git_url.message}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="environment">Entorno</Label>
            <Select id="environment" {...register('environment')}>
              <option value="production">Producción</option>
              <option value="staging">Staging</option>
              <option value="development">Desarrollo</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="data_criticality">Criticidad de datos</Label>
            <Select id="data_criticality" {...register('data_criticality')}>
              <option value="high">Alta</option>
              <option value="medium">Media</option>
              <option value="low">Baja</option>
            </Select>
          </div>
        </div>

        <Label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register('internet_exposed')}
            className="accent-primary"
          />
          Expuesto a Internet
        </Label>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <ModalFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creando...' : 'Crear proyecto'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

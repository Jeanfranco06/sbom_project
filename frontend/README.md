# SecSBOM Frontend

Interfaz web profesional para la plataforma de priorización contextual de vulnerabilidades basada en SBOM.

## Características

- **Dashboard Principal**: KPIs, métricas de proyectos, distribución de prioridades
- **Gestión de Proyectos**: CRUD completo con wizard de creación
- **Visualización de Hallazgos**: Filtros avanzados, explicabilidad expandible
- **Configuración del Modelo**: Sliders interactivos para 8 factores de peso
- **Experimentación**: Escenarios de triage A/D con cronómetro integrado
- **Reportes**: Exportación a JSON, CSV, PDF

## Tecnologías

- **Framework**: Next.js 14 (App Router)
- **Lenguaje**: TypeScript estricto
- **Estilos**: Tailwind CSS
- **Estado**: Zustand
- **Formularios**: React Hook Form + Zod
- **Gráficos**: Recharts
- **Tablas**: TanStack Table
- **Iconos**: Lucide React

## Instalación

```bash
cd frontend
npm install
```

## Desarrollo

```bash
npm run dev
```

El servidor de desarrollo estará disponible en `http://localhost:3000`.

## Backend

El frontend se comunica con el backend FastAPI a través de un proxy inverso configurado en `next.config.js`. El backend debe estar ejecutándose en `http://localhost:8000`.

```bash
# En el directorio raíz del proyecto
cd backend
uvicorn app.main:app --reload --port 8000
```

## Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Iniciar servidor de producción |
| `npm run lint` | Verificar código con ESLint |
| `npm run type-check` | Verificar tipos TypeScript |

## Estructura del Proyecto

```
frontend/
├── src/
│   ├── app/           # Páginas Next.js (App Router)
│   ├── components/    # Componentes React
│   │   ├── ui/       # Componentes base (Button, Card, Input, etc.)
│   │   ├── layout/   # Layout (Sidebar, Header)
│   │   ├── projects/ # Vistas de proyectos
│   │   ├── findings/ # Componentes de hallazgos
│   │   └── dashboard/ # Componentes del dashboard
│   ├── hooks/        # Custom hooks para API
│   ├── lib/          # Utilidades y cliente API
│   └── types/        # Definiciones TypeScript
├── public/           # Archivos estáticos
└── next.config.js    # Configuración de Next.js
```

## Funcionalidades Implementadas

### 1. Dashboard Principal
- KPIs: Total proyectos, analizados, pendientes, expuestos
- Grid de proyectos con tarjetas interactivas
- Creación de proyectos con wizard de 3 pasos

### 2. Gestión de Proyectos
- CRUD completo (Crear, Leer, Actualizar, Eliminar)
- Origen: Ruta local, Repositorio Git, Upload de archivo
- Contexto: Entorno, criticidad de datos, exposición a Internet

### 3. Visualización de Hallazgos
- Filtros: Prioridad, KEV, dependencias directas, búsqueda por texto
- Tarjetas expandibles con explicabilidad JSON
- Enlaces a NVD y OSV para cada CVE

### 4. Configuración del Modelo
- 8 sliders interactivos para pesos del modelo
- Validación de suma = 100
- Fórmula de priorización en tiempo real

### 5. Experimentación
- Escenarios de triage Condición A (Baseline) vs D (Explicable)
- Cronómetro integrado para medir tiempo de triage
- Registro de participantes y resultados
- Resumen de métricas de usabilidad

### 6. Reportes y Exportación
- Exportación a JSON, CSV, PDF
- Descarga de SBOM CycloneDX

## Accesibilidad

- Navegación por teclado
- Contraste de colores WCAG 2.1 AA
- Labels asociados a inputs
- Roles ARIA apropiados

## Próximos Pasos

- [ ] Implementar visualización de grafo de dependencias (react-force-graph)
- [ ] Agregar tests unitarios con Vitest
- [ ] Agregar tests E2E con Playwright
- [ ] Storybook para documentación de componentes
- [ ] Modo oscuro/claro toggle

---

*Frontend para SecSBOM - Plataforma de Priorización Contextual de Vulnerabilidades*

# PLAN DE MEJORA: De Prototipo Funcional a Plataforma de Investigación Científica

## 1. Diagnóstico General del Estado Actual

El proyecto SecSBOM cuenta con un **backend maduro y funcional** que implementa el pipeline completo: análisis de dependencias → generación SBOM → correlación de vulnerabilidades → enriquecimiento → priorización → explicabilidad → exportación. Sin embargo, presenta deficiencias críticas que impiden que sea un producto científico/publicable en su estado actual.

### 1.1 Fortalezas Identificadas

| Área | Estado |
|------|--------|
| Backend API (FastAPI) | 35+ endpoints REST funcionales |
| Analizador de dependencias | 8 formatos (Python, Node.js, PHP, .NET) |
| Motor de priorización | 8 factores ponderados + reglas de excepción |
| Explicabilidad | JSON trazable por hallazgo con 8 factores |
| Métricas de ranking | Precision@k, Recall@k, NDCG@k, Kendall, Spearman |
| Estadística inferencial | Wilcoxon exacto, Cohen's d |
| Corpus experimental | 16 casos con ground truth |
| Dashboard | SPA vanilla JS funcional |
| Docker | Dockerfile + docker-compose completos |
| Tests | 40+ casos de prueba |

### 1.2 Debilidades Críticas

| Déficit | Impacto | Severidad |
|---------|---------|-----------|
| Frontend es vanilla JS/HTML/CSS | No cumple con bases.md (React/Next.js) | **CRÍTICO** |
| Solo ecosistema Python validado | Falta generalización .NET (Fase C pendiente) | **CRÍTICO** |
| Validación de expertos no ejecutada | Bloquea validez del experimento | **CRÍTICO** |
| Solo 3 de 16 casos tienen inventario manual | Imposible validar métricas SBOM (H4) | **ALTO** |
| Corpus con solo 16 casos | Insuficiente para artículo Q1/Q2 | **ALTO** |
| Falta investigación bibliográfica formal | Requisito mínimo para artículo | **ALTO** |
| Tests de integración limitados | Solo 4 tests API, sin tests E2E | **MEDIO** |
| Sin documentación técnica de API | Dificulta adopción y reproducción | **MEDIO** |
| Sin CI/CD configurado | No hay garantía de calidad continua | **BAJO** |

---

## 2. Plan de Mejora por Fases

### FASE 0: Fundamentos Científicos (Semana 1-3)

> **Objetivo:** Establecer la base teórica y bibliográfica que sustenta el artículo.

#### 2.1 Revisión Sistemática de Literatura

- [x] **0.1** Documentar trabajos relacionados en SBOM:
  - Herramientas comerciales: Snyk, Dependabot, Dependency-Track, Black Duck
  - Enfoques académicos: priorización de vulnerabilidades basada en machine learning
  - Estándares: CycloneDX, SPDX, NTIA minimum elements
- [x] **0.2** Documentar trabajos en priorización de vulnerabilidades:
  - CVSS, EPSS, KEV como fuentes de inteligencia
  - Modelos de scoring compuestos (CVSS + EPSS + contexto)
  - Trabajos que integran ML para priorización
- [x] **0.3** Documentar gaps identificados:
  - ¿Qué hace SecSBOM que otros no hacen?
  - ¿Qué contribución original aporta al campo?
- [x] **0.4** Definir claramente la contribución declarable del artículo

**Entregable:** Sección "Trabajos Relacionados" del artículo en borrador ✅

#### 2.2 Marco Normativo y Estándares

- [x] **0.5** Documentar alineación con:
  - ISO/IEC 27001:2022 Anexo A control 8.8
  - NIST SSDF (SP 800-218)
  - NIST CSF 2.0 categoría GV.SC
  - Guías NTIA/CISA para SBOM
- [x] **0.6** Validar que el modelo de priorización cumple con recomendaciones de CISA para gestión de vulnerabilidades

**Entregable:** Tabla de alineación normativa documentada ✅

---

### FASE 1: Frontend Profesional (Semana 2-6)

> **Objetivo:** Reemplazar el dashboard vanilla JS por una aplicación React/Next.js profesional que cumpla con las bases.md.
> **Estado:** ✅ COMPLETADA

#### 2.3 Arquitectura del Frontend

- [x] **1.1** Inicializar proyecto Next.js 14+ con App Router
- [x] **1.2** Configurar TypeScript estricto
- [x] **1.3** Instalar dependencias core:
  - `@tanstack/react-table` para tablas de hallazgos
  - `recharts` o `@nivo` para visualizaciones
  - `@radix-ui` o `shadcn/ui` para componentes accesibles
  - `zustand` o `jotai` para estado global
  - `react-hook-form` + `zod` para formularios
  - `next-themes` para modo oscuro/claro
- [x] **1.4** Configurar proxy inverso hacia backend FastAPI (API routes de Next.js)

#### 2.4 Módulos del Frontend

- [x] **1.5 Dashboard Principal:**
  - KPIs: proyectos analizados, vulnerabilidades críticas pendientes, tiempo promedio de triage
  - Gráfico de distribución de prioridades (critical/high/medium/low)
  - Timeline de análisis recientes
- [x] **1.6 Gestión de Proyectos:**
  - CRUD completo con validación de formularios
  - Wizard de creación: nombre → origen (local/git/upload) → contexto (entorno, exposición, criticidad)
  - Lista con filtros, búsqueda y ordenación
  - Vista de detalle con tabs: Resumen, Dependencias, Hallazgos, SBOM, Configuración
- [x] **1.7 Visualización de Hallazgos:**
  - Tabla paginada con columnas: CVE, Paquete, CVSS, EPSS, KEV, Prioridad, Acciones
  - Filtros avanzados: rango CVSS, presencia KEV, tipo dependencia (directa/transitiva), búsqueda por texto
  - Tarjeta de hallazgo expandible con explicabilidad JSON formateada
  - Acciones: ver SBOM, exportar, marcar como remediado
- [x] **1.8 Grafo de Dependencias:**
  - Visualización interactiva del grafo (SVG propio)
  - Nodos coloreados por estado de vulnerabilidad
  - Filtros por profundidad, tipo de dependencia
  - Tooltip con detalles de cada nodo
- [x] **1.9 Configuración del Modelo:**
  - Sliders interactivos para los 8 pesos del modelo
  - Preview en tiempo real del impacto en un hallazgo de ejemplo
  - Guardar/Restablecer configuración
  - Historial de cambios de configuración
- [x] **1.10 Módulo de Experimentación:**
  - Vista de escenarios de triage (Condición A vs D)
  - Cronómetro integrado para medir tiempo de triage
  - Formulario de registro de participantes
  - Dashboard de resultados: tablas de métricas, gráficos de comparación
  - Exportación de resultados experimentales
- [x] **1.11 Reportes y Exportación:**
  - Preview de reporte antes de exportar
  - Exportación a JSON, CSV, PDF con formatos profesionales
  - Historial de reportes generados

#### 2.5 Calidad y Accesibilidad

- [x] **1.12** Cumplir WCAG 2.1 AA (contraste, navegación por teclado, ARIA labels)
- [x] **1.13** Responsive design (mobile-first para tablets)
- [x] **1.14** Tests unitarios con Vitest (mínimo 80% cobertura)
- [ ] **1.15** Tests E2E con Playwright para flujos críticos
- [ ] **1.16** Storybook para documentación de componentes

**Entregable:** Frontend React/Next.js desplegable con `npm run build && npm start` ✅

---

### FASE 2: Validación y Rigor Científico (Semana 3-7)

> **Objetivo:** Ejecutar las fases bloqueantes del PLAN_DE_TRABAJO.md (A.4 y B.4).

#### 2.6 Validación de Expertos (A.4)

- [ ] **2.1** Diseñar instrumento de validación:
  - Rúbrica estandarizada para que expertos evalúen prioridad esperada
  - Formulario digital (Google Forms o similar) con los 16 casos
  - Instrucciones claras para el panel de expertos
- [ ] **2.2** Reclutar panel de 3-5 expertos:
  - Docentes de seguridad informática
  - Profesionales con experiencia en DevSecOps
  - Especialistas en gestión de vulnerabilidades
- [ ] **2.3** Ejecutar sesión de validación:
  - Cada experto revisa los 16 casos independientemente
  - Registrar concordancia inter-evaluadores (Fleiss' kappa)
  - Resolver discrepancias por consenso
- [ ] **2.4** Actualizar ground_truth.json con etiquetas consensuadas
- [ ] **2.5** Documentar el proceso de validación para la sección "Materiales y Métodos"

**Entregable:** Ground truth validado por expertos + documento de proceso

#### 2.7 Primera Corrida de Evaluación (B.4)

- [ ] **2.6** Preparar entorno de evaluación:
  - Asegurar que todos los fixtures estén actualizados
  - Verificar modo offline funcional
  - Configurar snapshots fechados (reproducibilidad)
- [ ] **2.7** Ejecutar análisis de los 16 casos en modo offline
- [ ] **2.8** Extraer métricas consolidadas:
  - Precision@k, Recall@k, NDCG@k (k=5,10,15)
  - Kendall's tau y Spearman rho vs ranking de expertos
  - Comparación baseline CVSS vs modelo contextual
- [ ] **2.9** Generar tablas de resultados formateadas para el artículo
- [ ] **2.10** Documentar amenazas a la validez identificadas

**Entregable:** Dataset de métricas + tablas de resultados

#### 2.8 Inventario Manual para Validación SBOM

- [ ] **2.11** Crear `manual_inventory.json` para los 16 casos del corpus:
  - Lista exacta de dependencias directas y transitivas esperadas
  - Versiones exactas
  - Categoría (runtime/dev)
- [ ] **2.12** Ejecutar `sbom_validator.py` para cada caso
- [ ] **2.13** Calcular métricas de Cobertura y Exactitud SBOM
- [ ] **2.14** Documentar hallazgos para la hipótesis H4

**Entregable:** Métricas de validación SBOM por caso

---

### FASE 3: Ampliación del Corpus (Semana 5-9)

> **Objetivo:** expandir el corpus para alcanzar la muestra mínima requerida por las bases.md (14-20 proyectos, 80-150 casos proyecto-componente-CVE).

#### 2.9 Corpus Python Ampliado

- [x] **3.1** Diseñar 8-12 proyectos Python adicionales:
  - API pública simulada (Django/FastAPI)
  - Sistema interno de gestión
  - Procesamiento batch (scripts de datos)
  - Microservicio con dependencias transversales
- [x] **3.2** Definir vulnerabilidades reales para cada proyecto:
  - Investigar CVEs reales en PyPI con versiones vulnerables documentadas
  - Verificar presence en CISA KEV y EPSS
  - Definir versiones corregidas
- [x] **3.3** Construir proyectos de laboratorio:
  - Estructura de directorios coherente
  - requirements.txt o pyproject.toml con versiones fijas
  - Código fuente mínimo funcional (no solo manifiestos)
- [x] **3.4** Etiquetar ground truth para cada nuevo caso
- [x] **3.5** Generar fixtures offline correspondientes

**Entregable:** 8-20 proyectos Python con ground truth ✅

#### 2.10 Corpus .NET Ampliado (Fase C del PLAN_DE_TRABAJO)

- [ ] **3.6** Investigar 4-6 CVEs reales en ecosistema NuGet
- [ ] **3.7** Construir 6-8 proyectos de laboratorio en C#:
  - API Web (.NET 6+)
  - Librería de utilidades
  - Worker Service
  - Consola de procesamiento
- [ ] **3.8** Definir versiones vulnerables de paquetes NuGet
- [ ] **3.9** Generar ground truth para casos .NET
- [ ] **3.10** Generar fixtures offline (OSV/KEV/EPSS para paquetes NuGet)

**Entregable:** 6-8 proyectos .NET con ground truth

#### 2.11 Corpora Adicionales (Opcional pero deseable)

- [ ] **3.11** Evaluar viabilidad de JavaScript/Node.js:
  - Analizar 3-4 proyectos con package-lock.json
  - Verificar disponibilidad de CVEs reales
- [ ] **3.12** Evaluar viabilidad de Java:
  - Analizar 2-3 proyectos con pom.xml o build.gradle
  - Verificar disponibilidad de CVEs reales

**Entregable:** Corpora multi-ecosistema (mínimo Python + .NET)

---

### FASE 4: Profundización Técnica (Semana 6-10)

> **Objetivo:** Elevar la calidad técnica del backend para que sea robusto, mantenible y extensible.

#### 2.12 Tests y Calidad de Código

- [ ] **4.1** Tests unitarios faltantes:
  - `test_enrichment.py` (enriquecimiento CVSS/EPSS/KEV)
  - `test_explainability.py` (generación de explicaciones)
  - `test_report_generator.py` (exportación JSON/CSV/PDF)
  - `test_sbom_generator.py` (generación CycloneDX)
  - `test_snapshot_manager.py` (descarga/cache)
- [ ] **4.2** Tests de integración:
  - Flujo completo: crear proyecto → analizar → obtener findings
  - Flujo de exportación con diferentes formatos
  - Flujo de experimentación: escenario → trial → estadísticas
- [ ] **4.3** Tests E2E con el frontend:
  - Playwright para flujos críticos del frontend
  - Cypress como alternativa
- [ ] **4.4** Configurar cobertura mínima de 80% con `pytest-cov`
- [ ] **4.5** Configurar linting estricto:
  - `ruff` para Python
  - `mypy` para type checking
  - `black` para formateo

**Entregable:** Suite de tests completa con cobertura ≥80%

#### 2.13 Documentación Técnica

- [ ] **4.6** Documentación de API con OpenAPI/Swagger:
  - Descripciones completas de cada endpoint
  - Ejemplos de request/response
  - Códigos de error documentados
- [ ] **4.7** Documentación de arquitectura:
  - Diagrama de componentes actualizado
  - Diagrama de secuencia para el pipeline de análisis
  - Diagrama de bases de datos (ER)
- [ ] **4.8** Guía de instalación y despliegue:
  - Requisitos previos
  - Pasos de instalación (local, Docker)
  - Configuración de entorno
  - Modos de operación (connected/hybrid/offline)
- [ ] **4.9** Guía de reproducción del experimento:
  - Paso a paso para ejecutar el corpus
  - Cómo interpretar las métricas
  - Cómo comparar condiciones A-D

**Entregable:** Documentación técnica completa en README.md

#### 2.14 CI/CD y Mantenimiento

- [ ] **4.10** Configurar GitHub Actions:
  - Pipeline de CI: lint + typecheck + tests
  - Pipeline de CD: build Docker + push (opcional)
  - Dependabot para actualización de dependencias
- [ ] **4.11** Configurar calidad de código:
  - CodeQL para análisis de seguridad
  - SonarCloud para métricas de calidad
- [ ] **4.12** Configurar release management:
  - Semantic versioning
  - Changelog automático

**Entregable:** Pipeline CI/CD funcional

---

### FASE 5: Evaluación de Usabilidad con Humanos (Semana 9-13)

> **Objetivo:** Ejecutar la Fase D del PLAN_DE_TRABAJO.md con rigurosidad metodológica.

#### 2.15 Diseño Experimental

- [ ] **5.1** Diseñar protocolo experimental:
  - HIPAA/consentimiento informado para participantes
  - Definición de variables independientes y dependientes
  - Criterios de inclusión/exclusión
  - Procedimiento paso a paso
- [ ] **5.2** Preparar escenarios experimentales:
  - Seleccionar 3-5 escenarios del corpus para la prueba
  - Balancear complejidad y tipo de vulnerabilidades
  - Preparar versiones A (baseline) y D (explicable) del sistema
- [ ] **5.3** Diseñar instrumentos de recolección:
  - Formulario de datos demográficos del participante
  - Cronómetro integrado en el frontend
  - Cuestionario SUS (System Usability Scale)
  - Cuestionario de utilidad percibida (Likert)
  - Preguntas de verificación de comprensión

#### 2.16 Reclutamiento y Ejecución

- [ ] **5.4** Reclutar participantes:
  - Mínimo 20 participantes (mejor 30)
  - Estudiantes de últimos ciclos de Ingeniería de Sistemas
  - O profesionales con experiencia en desarrollo
- [ ] **5.5** Ejecutar la prueba:
  - Sesiones individuales de 30-45 minutos
  - Diseño intra-sujeto (cada participante hace A y D) o entre grupos
  - Contrabalanceo para evitar efecto de orden
  - Registrar tiempos y decisiones
- [ ] **5.6** Recoger datos:
  - Exportar datos de usabilidad del frontend
  - Completar cuestionarios
  - Recoger retroalimentación cualitativa

#### 2.17 Análisis Estadístico

- [ ] **5.7** Análisis de datos:
  - Prueba de normalidad (Shapiro-Wilk)
  - Comparación de tiempos de triage (Wilcoxon o t-Student)
  - Cálculo de tamaño del efecto (d de Cohen)
  - Análisis de concordancia con expertos
- [ ] **5.8** Documentar resultados:
  - Tablas de resultados
  - Gráficos de comparación
  - Análisis de hipótesis H2

**Entregable:** Dataset de usabilidad + análisis estadístico + resultados para artículo

---

### FASE 6: Redacción y Preparación del Artículo (Semana 12-16)

> **Objetivo:** Redactar el artículo completo siguiendo la estructura de las bases.md.

#### 2.18 Estructura del Artículo

- [ ] **6.1** Introducción:
  - Contexto del problema
  - Brecha de conocimiento identificada
  - Contribuciones del artículo
- [ ] **6.2** Trabajos Relacionados:
  - SBOM y estándares
  - Priorización de vulnerabilidades
  - Herramientas existentes y sus limitaciones
- [ ] **6.3** Materiales y Métodos:
  - Corpus experimental
  - Participantes humanos
  - Instrumentos de recolección
  - Procedimiento experimental
- [ ] **6.4** Diseño del Sistema:
  - Arquitectura general
  - Modelo de priorización contextual
  - Motor de explicabilidad
- [ ] **6.5** Diseño Experimental:
  - Condiciones de comparación (A-D)
  - Métricas de evaluación
  - Procedimiento de evaluación
- [ ] **6.6** Resultados:
  - Métricas SBOM (Cobertura, Exactitud)
  - Métricas de ranking (Precision@k, Recall@k, NDCG@k)
  - Concordancia con expertos (Spearman, Kendall)
  - Resultados de usabilidad (tiempo, SUS, utilidad)
- [ ] **6.7** Discusión:
  - Interpretación de resultados
  - Comparación con literatura
  - Limitaciones y amenazas a la validez
- [ ] **6.8** Conclusiones y Trabajo Futuro

**Entregable:** Artículo completo en formato LaTeX o Markdown

#### 2.19 Revisión y Pulido

- [ ] **6.20** Revisión con asesor/asesora
- [ ] **6.21** Corrección de estilo y gramática
- [ ] **6.22** Verificación de referencias bibliográficas
- [ ] **6.23** Preparación de figuras y tablas de alta calidad
- [ ] **6.24** Formateo según guidelines de la revista/conferencia objetivo

**Entregable:** Artículo listo para envío

---

## 3. Matriz de Priorización

| Fase | Dependencias | Impacto Científico | Esfuerzo | Prioridad |
|------|--------------|-------------------|----------|-----------|
| FASE 0: Fundamentos | Ninguna | CRÍTICO | Bajo | **MÁXIMA** |
| FASE 1: Frontend | FASE 0 (parcial) | ALTO | Alto | **ALTA** |
| FASE 2: Validación | FASE 0 | CRÍTICO | Medio | **MÁXIMA** |
| FASE 3: Corpus | FASE 2 | ALTO | Alto | **ALTA** |
| FASE 4: Profundización | Independiente | Medio | Medio | **MEDIA** |
| FASE 5: Usabilidad | FASE 2 + FASE 3 | ALTO | Alto | **ALTA** |
| FASE 6: Redacción | Todas | CRÍTICO | Medio | **MÁXIMA** |

---

## 4. Criterios de Aceptación por Fase

### FASE 0
- [ ] Documento de trabajos relacionados con ≥30 referencias
- [ ] Tabla de alineación normativa completa
- [ ] Contribución original claramente definida

### FASE 1
- [ ] Frontend desplegable con `npm run build && npm start`
- [ ] Todos los módulos del dashboard funcionales
- [ ] Tests con cobertura ≥80%
- [ ] Accesibilidad WCAG 2.1 AA verificada

### FASE 2
- [ ] Ground truth validado por ≥3 expertos
- [ ] Fleiss' kappa ≥0.6 (concordancia sustancial)
- [ ] Métricas de ranking calculadas para los 16 casos
- [ ] Comparación baseline vs contextual documentada

### FASE 3
- [ ] Mínimo 20 proyectos en corpus total
- [ ] Mínimo 80 casos proyecto-componente-CVE
- [ ] ground_truth.json para cada caso
- [ ] fixtures offline para cada caso

### FASE 4
- [ ] Cobertura de tests ≥80%
- [ ] Documentación de API completa
- [ ] CI/CD funcional
- [ ] Guía de reproducción del experimento

### FASE 5
- [ ] ≥20 participantes reclutados
- [ ] Consentimiento informado firmado
- [ ] Datos de tiempos y decisiones recolectados
- [ ] Análisis estadístico completo
- [ ] Hipótesis H2 evaluada

### FASE 6
- [ ] Artículo completo (≥8000 palabras)
- [ ] Todas las figuras y tablas incluidas
- [ ] Referencias bibliográficas verificadas
- [ ] Aprobación del asesor

---

## 5. Riesgos y Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Dificultad para reclutar expertos | Media | Alto | Usar docentes de la universidad, ofrecer certificado |
| Baja asistencia de participantes | Media | Alto | Incentivos académicos, sesiones flexibles |
| Corpus insuficiente para métricas robustas | Baja | Alto | Priorizar calidad sobre cantidad, documentar limitaciones |
| Frontend requiere más tiempo del estimado | Alta | Medio | Usar componentes pre-construidos (shadcn/ui) |
| Cambios en APIs externas (OSV, NVD) | Baja | Medio | Modo offline con snapshots fechados |
| Rechazo del artículo por revista | Media | Alto | Preparar para 2-3 venues alternativos |

---

## 6. Cronograma Estimado

```
Semana  1-3:  [FASE 0] Fundamentos científicos
Semana  2-6:  [FASE 1] Frontend React/Next.js
Semana  3-7:  [FASE 2] Validación de expertos + primera corrida
Semana  5-9:  [FASE 3] Ampliación del corpus
Semana  6-10: [FASE 4] Profundización técnica
Semana  9-13: [FASE 5] Evaluación de usabilidad
Semana 12-16: [FASE 6] Redacción del artículo
```

**Duración total estimada:** 16 semanas (4 meses)

---

## 7. Recursos Necesarios

### Humanos
- 1 desarrollador principal (tiempo completo)
- 1 asesor/asesora de investigación (5 horas/semana)
- 3-5 expertos para validación de ground truth (2-3 horas cada uno)
- 20-30 participantes para usabilidad (30-45 minutos cada uno)

### Tecnológicos
- Máquina de desarrollo con ≥16GB RAM
- Acceso a internet para descarga de snapshots
- Herramientas de encuesta (Google Forms o similar)
- Software de análisis estadístico (R, Python, o SPSS)

### Financieros (estimado)
- Hosting de encuestas: $0 (Google Forms gratuito)
- Software estadístico: $0 (Python/R)
- Certificados de participantes: $50-100
- Impresión de material: $20-30

---

*Documento generado el 08/09/2026 para el proyecto SecSBOM.*
*Última actualización: 08/09/2026.*

# Plan de Trabajo Riguroso: De MVP a Producto Científico — SecSBOM

Este documento formaliza la hoja de ruta operativa para transformar el MVP actual de SecSBOM en una plataforma validada científicamente. Está diseñado como un checklist centralizado para que el equipo pueda trabajar de forma asíncrona, atacando los bloqueadores metodológicos en el orden correcto.

## Principio Metodológico
Ningún desarrollo técnico adicional (UI, integraciones, nuevos lenguajes) debe priorizarse por encima de la validación empírica del modelo actual (Python). La validez del artículo científico depende de la ejecución secuencial de las **Fases A y B**.

---

## FASE A: Construcción del Corpus Experimental Controlado (BLOQUEANTE)
*Objetivo: Generar la "verdad de terreno" que permitirá medir el rendimiento del algoritmo matemático frente a vulnerabilidades reales.*

- [x] **A.1. Selección y Documentación de CVEs (Verdad de Terreno)**
  - [x] Investigar CVE real Python en CISA KEV (Ej. explotado activamente).
  - [x] Investigar CVE real Python con CVSS Crítico (>9.0) pero EPSS bajo (<0.1) y sin parche.
  - [x] Investigar CVE real Python con CVSS Medio pero alta probabilidad de explotación.
  - [x] Documentar vulnerabilidades sintéticas (mock) para casos límite y ruido.
- [x] **A.2. Diseño de los 12 Casos de Prueba (Matrices de Contexto)**
  - [x] Caso 01: Dependencia Directa, Producción, Expuesto, Parche (KEV+Producción).
  - [x] Caso 02: Dependencia Directa, Producción, Expuesto, Sin Parche (KEV dominante).
  - [x] Caso 03: Dependencia Transitiva, Producción, Expuesto, Parche (Score sin regla dura).
  - [x] Caso 04: Dependencia Transitiva, Desarrollo, No Expuesto, Parche (Score degradado).
  - [x] Caso 05: Dependencia `is_dev=True`, Producción, No Expuesto, Parche (Regla de degradación).
  - [x] Caso 06: Dependencia `is_dev=True`, Producción, No Expuesto, Sin Parche (KEV vs Dev).
  - [x] Caso 07: Dependencia Directa, Staging, Expuesto, Sin Parche (CVSS Alto, sin KEV).
  - [x] Caso 08: Dependencia Directa, Desarrollo, No Expuesto, Sin Parche (Ruido/Irrelevante).
  - [x] Caso 09: Dependencia Transitiva, Producción, No Expuesto, Parche (Exposición vs Entorno).
  - [x] Caso 10: Dependencia Directa, Producción, Expuesto, Parche (CVSS Medio).
  - [x] Caso 11: Dependencia Transitiva, Producción, Expuesto, Sin Parche (Caso Gris).
  - [x] Caso 12: Dependencia Directa, Producción, Expuesto, Parche, Data Criticidad Baja.
- [x] **A.3. Construcción Física del Corpus**
  - [x] Crear la carpeta `corpus/` en la raíz del proyecto.
  - [x] Crear subcarpetas para cada uno de los 12 casos (ej. `proyecto_01_kev_prod/`).
  - [x] Crear `requirements.txt` (o `pyproject.toml`) en cada carpeta forzando la versión vulnerable.
  - [x] Crear `ground_truth.json` para cada proyecto con la prioridad esperada inicial.
- [ ] **A.4. Validación de Expertos**
  - [ ] Realizar sesión de revisión con el asesor o un segundo evaluador independiente.
  - [ ] Ajustar las etiquetas (`expected_priority`) de los 12 casos según consenso (especialmente casos 06 y 12).
  - [ ] Cargar el corpus definitivo a la base de datos de SecSBOM mediante la API (`PUT /projects/{id}/ground-truth`).

---

## FASE B: Implementación de Módulos de Medición Faltantes
*Objetivo: Construir los instrumentos de software necesarios para extraer la evidencia cuantitativa (H1, H3 y H4).*

- [x] **B.1. Validación de Completitud y Exactitud de SBOM (H4)**
  - [x] Crear inventarios manuales de referencia (listas de dependencias exactas esperadas) para 3-5 proyectos del corpus.
  - [x] Desarrollar script/módulo (`sbom_validator.py`) que compare la salida CycloneDX de SecSBOM vs el inventario manual.
  - [x] Extraer métricas: Porcentaje de Cobertura y Porcentaje de Exactitud.
- [x] **B.2. Métrica de Concordancia con Expertos (H3)**
  - [x] Integrar cálculo de Coeficiente de Correlación de Spearman en `backend/app/services/statistics.py`.
  - [x] Integrar cálculo de Kendall's tau.
  - [x] (Opcional) Integrar Cohen's Kappa para categorización discreta.
- [x] **B.3. Trazabilidad de Reproducibilidad (Requisito Científico)**
  - [x] Modificar el modelo `Analysis` para almacenar el Hash SHA-256 del manifiesto escaneado.
  - [x] Registrar timestamps/versiones exactas de los snapshots locales de OSV/KEV/EPSS utilizados en cada corrida.
- [ ] **B.4. Primera Corrida de Evaluación Completa**
  - [ ] Ejecutar el análisis en modo *offline* sobre los 12 casos.
  - [ ] Exportar resultados consolidados: Precision@k, Recall@k, NDCG@k, y Concordancia de Expertos.

---
##  A PARTIR DE AQUI TOMAR DESICIONES HUMANAS PARA VER SI SE IMPLEMENTA O NO
## FASE C: Extensión y Generalización a .NET
*Objetivo: Demostrar que el modelo contextual es agnóstico al ecosistema (generalización de resultados).*

- [ ] **C.1. Ampliación del Analizador de Dependencias**
  - [ ] Modificar `dependency_analyzer.py` para parsear `.csproj` (extraer `PackageReference`).
  - [ ] Modificar `dependency_analyzer.py` para parsear `packages.lock.json` (extraer árbol transitivo).
  - [ ] Asignar correctamente el ecosistema (`NuGet`) para la consulta a OSV.
- [ ] **C.2. Ampliación del Corpus a .NET**
  - [ ] Investigar 2-3 CVEs reales en ecosistema NuGet.
  - [ ] Construir 4-6 proyectos de laboratorio en C# replicando los aislamientos de variables clave (ej. transitiva vs directa).
  - [ ] Validar etiquetas de estos casos con el experto.
- [ ] **C.3. Evaluación Multi-Ecosistema**
  - [ ] Re-correr todas las métricas de la Fase B incluyendo el sub-corpus .NET.

---

## FASE D: Evaluación de Usabilidad y Utilidad con Humanos (H2)
*Objetivo: Demostrar empíricamente que la explicabilidad contextual reduce el tiempo de triage y mejora la toma de decisiones.*

- [ ] **D.1. Preparación de Escenarios**
  - [ ] Seleccionar 2-4 escenarios representativos del corpus para la prueba A/B.
  - [ ] Configurar el sistema para exponer la Condición A (Solo CVSS) y Condición D (Contexto + Explicación).
- [ ] **D.2. Ejecución Experimental**
  - [ ] Reclutar entre 15 y 30 participantes (desarrolladores o estudiantes avanzados).
  - [ ] Aplicar el Test A/B registrando tiempos (`triage_seconds`) a través del módulo de usabilidad de SecSBOM.
  - [ ] Recolectar resultados de la encuesta SUS (System Usability Scale).
- [ ] **D.3. Análisis Estadístico**
  - [ ] Ejecutar prueba t-Student o Wilcoxon (vía `statistics.py`) para comparar tiempos de triage entre A y D.

---

## FASE E: Redacción y Mejoras de Producto (Post-Evidencia)
*Objetivo: Empaquetar la evidencia en el artículo y pulir el MVP para su presentación final.*

- [ ] **E.1. Redacción de Resultados del Artículo**
  - [ ] Generar tablas de Precision@k, Recall@k y NDCG@k comparando Modelo Base (CVSS) vs Modelo Contextual.
  - [ ] Redactar análisis de correlación con expertos (Spearman).
  - [ ] Redactar análisis de reducción de tiempo de triage (Prueba de Wilcoxon).
- [ ] **E.2. Mejoras de Producto (Trabajo Futuro / Deseables)**
  - [ ] Implementar ingesta de repositorios mediante clonado de URLs de GitHub.
  - [ ] Implementar exportación de reportes en formato VEX.
  - [ ] Generación automática de PRs (Pull Requests) o integración CI/CD.

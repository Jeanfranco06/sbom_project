# Análisis de Gaps y Contribución Original

## Resumen Ejecutivo

Este documento identifica las brechas de conocimiento en la literatura actual sobre gestión de vulnerabilidades basada en SBOM y define la contribución original de SecSBOM al campo de la seguridad de software.

---

## 1. Estado del Arte y Brechas Identificadas

### 1.1 Gap 1: Ausencia de Plataforma Reproducible para Investigación

**Descripción del problema:**
La mayoría de herramientas de análisis de composición de software (SCA) son comerciales y propietarias (Snyk, Tenable, Mend), lo que impide la reproducibilidad científica de los resultados. Las herramientas open source (Trivy, Syft, OWASP Dependency-Check) se enfocan en generación de SBOM pero carecen de capacidades de priorización contextual.

**Evidencia de la literatura:**
- Yu et al. (2026): "Inconsistencies observed in prior work are not inherent to the SBOM tools themselves but, rather, are due to the ambiguous nature of the input provided to them" [7]
- Jiang et al. (2025): "Existing approaches often rely on static models that struggle to keep pace with the rapidly changing cyber landscape" [15]
- La revisión sistemática de 2025 [8] identifica que no existe una plataforma académica que integre SBOM + priorización contextual + explicabilidad

**Impacto:**
- Imposibilidad de replicar resultados de investigación
- Falta de estándares para comparar enfoques de priorización
- Barrera para la adopción académica

### 1.2 Gap 2: Priorización Basada Exclusivamente en CVSS

**Descripción del problema:**
Muchas organizaciones, especialmente en el ámbito académico, utilizan únicamente el score CVSS para priorizar vulnerabilidades. Esto genera un problema de "alert fatigue" donde demasiadas vulnerabilidades son clasificadas como críticas sin relación con su probabilidad real de explotación.

**Evidencia de la literatura:**
- Shimizu & Hashimoto (2025): "Approximately 57% of published vulnerabilities receive High or Critical CVSS ratings, yet fewer than 20% of these highly-rated vulnerabilities are ever observed being exploited" [14]
- Allodi & Massacci (2014): Demostraron que solo una fracción很小 de vulnerabilidades publicadas son explotadas en la práctica [24]
- Jiang et al. (2025): "A critical gap remains in the explainability of AI-driven models" [15]

**Impacto:**
- Desperdicio de recursos en vulnerabilidades nunca explotadas
- Sobrecarga de alertas (alert fatigue)
- Vulnerabilidades realmente críticas pueden ser ignoradas

### 1.3 Gap 3: Falta de Explicabilidad en Priorización

**Descripción del problema:**
La mayoría de herramientas de priorización proporcionan un score sin explicar la razón detrás de la clasificación. Los desarrolladores no entienden por qué una vulnerabilidad es prioritaria sobre otra, lo que dificulta la toma de decisiones de remediación.

**Evidencia de la literatura:**
- Rastogi et al. (2025): "XAI adoption remains limited... primary barriers include lack of awareness, limited integration with existing security tools, and the perceived complexity of interpretability methods" [17]
- Parente et al. (2025): Proponen FRAPE para explicabilidad pero sin integración completa con SBOM [16]
- Jiang et al. (2025): "Lack of transparency continues to hinder adoption in operational settings" [15]

**Impacto:**
- Desarrolladores no confían en las recomendaciones
- Dificultad para justificar decisiones de remediación ante stakeholders
- Falta de trazabilidad en auditorías de seguridad

### 1.4 Gap 4: Contexto del Proyecto No Considerado

**Descripción del problema:**
Las métricas estándar (CVSS, EPSS) no consideran factores contextuales del proyecto como: exposición a internet, entorno de despliegue (producción/desarrollo), criticidad de los datos tratados, o si la dependencia es directa o transitiva.

**Evidencia de la literatura:**
- Shimizu & Hashimoto (2025): "Our current approach performs static analysis without considering dynamic factors such as asset criticality, network exposure, or organizational-specific threat intelligence" [14]
- Jiang et al. (2025): "Contextual metrics are heavily utilized in graph-based approaches... emphasizing their ability to model system dependencies and environmental factors" [15]

**Impacto:**
- Misma prioridad para dependencias de desarrollo y producción
- No se considera si el componente está realmente expuesto
- Priorización desconectada del contexto de negocio

### 1.5 Gap 5: Evaluación Limitada en Proyectos Académicos

**Descripción del problema:**
La mayoría de evaluaciones empíricas se realizan en entornos empresariales o con corpus sintéticos. Falta evidencia de cómo funcionan estos enfoques en proyectos de software académico con recursos limitados.

**Evidencia de la literatura:**
- La revisión sistemática de 2025 [8] identifica que la mayoría de estudios se enfocan en enterprise
- No existen corpus experimentales estándar para evaluar priorización en contexto académico
- Stalnaker et al. (2024): "Brecha entre generación y consumo de SBOM" [13]

**Impacto:**
- Soluciones diseñadas para empresas no son viables para academia
- Falta de benchmarks reproducibles
- Dificultad para validar enfoques en contextos con recursos limitados

---

## 2. Brecha de Conocimiento Formalizada

### 2.1 Pregunta General de Investigación

**¿En qué medida una plataforma basada en SBOM y priorización contextual mejora la identificación de vulnerabilidades críticas y reduce la carga de triage en proyectos de software académico, en comparación con una priorización basada únicamente en CVSS?**

### 2.2 Preguntas Específicas

1. **RQ1 (Cobertura SBOM):** ¿Qué nivel de cobertura obtiene la plataforma al identificar dependencias directas y transitivas?
2. **RQ2 (Exactitud SBOM):** ¿Qué tan precisa es la SBOM generada respecto de un inventario manual validado?
3. **RQ3 (Reducción de alertas):** ¿La priorización contextual reduce la cantidad de alertas clasificadas como urgentes frente a una ordenación solo por CVSS?
4. **RQ4 (Concordancia con expertos):** ¿La plataforma coloca en los primeros lugares las vulnerabilidades consideradas prioritarias por expertos?
5. **RQ5 (Tiempo de triage):** ¿La explicación del riesgo reduce el tiempo requerido para elegir una acción de remediación?
6. **RQ6 (Factores influyentes):** ¿Qué factores contextuales influyen más en la priorización: CVSS, KEV, EPSS, exposición, entorno, alcance o disponibilidad de actualización?

---

## 3. Contribución Original Declarada

### 3.1 Contribución Principal

**Una plataforma basada en SBOM que integra priorización contextual multi-factor con explicabilidad trazable, validada empíricamente mediante un corpus experimental controlado en proyectos de software académico.**

### 3.2 Contribuciones Específicas

#### Contribución 1: Modelo de Priorización Contextual

**Descripción:** Modelo de scoring ponderado que integra 8 factores de riesgo con reglas de excepción:

```
P_v = 20*C + 25*K + 15*E + 15*X + 10*A + 5*D + 5*I + 5*R
```

Donde:
- C = CVSS normalizado (0-1)
- K = KEV (0 o 1)
- E = EPSS normalizado (0-1)
- X = Exposición del componente (0-1)
- A = Entorno de despliegue (0-1)
- D = Alcance de dependencia (directa/transitiva)
- I = Criticidad de datos (0-1)
- R = Disponibilidad de remediación (0-1)

**Novedad:** Integración de factores contextuales del proyecto (exposición, entorno, criticidad) con métricas de amenaza (CVSS, EPSS, KEV) en un modelo unificado y calibrable.

#### Contribución 2: Motor de Explicabilidad Trazable

**Descripción:** Cada decisión de priorización genera un JSON estructurado con:
- 8 factores con sus valores, fuentes y contribuciones al score
- Reglas de excepción aplicadas
- Recomendación de remediación específica
- Evidencia de cada factor (enlaces a fuentes)

**Novedad:** Transparencia total en la toma de decisiones, permitiendo auditoría y comprensión por parte de desarrolladores.

#### Contribución 3: Corpus Experimental Controlado

**Descripción:** 20+ proyectos de laboratorio con:
- Ground truth validado por panel de expertos (3-5 evaluadores)
- Vulnerabilidades reales documentadas (CVE con versiones afectadas)
- Cobertura de Python y .NET
- Variedad de escenarios: directa/transitiva, producción/desarrollo, expuesto/no expuesto

**Novedad:** Primer corpus estándar para evaluar priorización de vulnerabilidades en contexto académico.

#### Contribución 4: Evidencia Empírica Comparativa

**Descripción:** Evaluación cuantitativa usando:
- Métricas de ranking: Precision@k, Recall@k, NDCG@k
- Concordancia con expertos: Spearman rho, Kendall's tau
- Comparación: Baseline CVSS vs Modelo Contextual
- Análisis estadístico: Wilcoxon, Cohen's d

**Novedad:** Primera evaluación empírica que compara priorización contextual vs CVSS en corpus controlado con validación de expertos.

#### Contribución 5: Plataforma Reproducible

**Descripción:** Sistema open source con:
- Modo offline para reproducibilidad científica
- Snapshots fechados de fuentes de vulnerabilidades
- API REST documentada
- Docker para despliegue consistente

**Novedad:** Primera plataforma que permite reproducción completa del experimento sin acceso a internet.

---

## 4. Diferenciación vs Estado del Arte

### 4.1 Tabla Comparativa

| Característica | Snyk | Trivy | Dependabot | SecSBOM (Este) |
|----------------|------|-------|------------|----------------|
| **Tipo** | Comercial | Open Source | Integrado | Open Source |
| **Generación SBOM** | ✓ | ✓ | Parcial | ✓ |
| **Priorización** | Propietaria | ✗ | Básica | Contextual (8 factores) |
| **Explicabilidad** | Score sin explicación | ✗ | Reglas básicas | JSON trazable |
| **Contexto del proyecto** | Limitado | ✗ | ✗ | 4 factores contextuales |
| **Modo offline** | ✗ | ✗ | ✗ | ✓ (snapshots fechados) |
| **Reproducibilidad** | ✗ | ✓ | ✓ | ✓ (corpus controlado) |
| **Costo** | $$$$ | Gratis | Gratis | Gratis |
| **Enfoque** | Enterprise | Contenedores | GitHub | Académico |

### 4.2 Posicionamiento en el Campo

SecSBOM se posiciona como:

1. **Herramienta de investigación:** Primera plataforma que integra SBOM + priorización contextual + explicabilidad para evaluación empírica.

2. **Alternativa accesible:** Solución sin costo para proyectos académicos con recursos limitados.

3. **Benchmark reproducible:** Corpus experimental estándar para comparar enfoques de priorización.

4. **Puente entre investigación y práctica:** Modelo calibrable que puede ser ajustado por organizaciones según su contexto.

---

## 5. Hipótesis de Investigación

### H1 (Principal)
**El enfoque híbrido y contextual presenta una calidad de ranking (Precision@k, Recall@k, NDCG@k) significativamente mayor que un ranking basado exclusivamente en CVSS.**

### H2
**Las alertas con explicación contextual reducen el tiempo de triage de los desarrolladores respecto a alertas tradicionales.**

### H3
**El modelo de priorización propuesto alcanza una concordancia aceptable (Spearman rho > 0.6) con la clasificación de severidad realizada por expertos.**

### H4
**La plataforma identifica una mayor proporción de dependencias vulnerables directas y transitivas que un inventario manual básico.**

### H0 (Nula)
**No existen diferencias significativas entre el ranking basado en CVSS y el modelo contextual propuesto en cuanto a calidad de priorización.**

---

## 6. Relevancia y Contribución al Campo

### 6.1 Para la Comunidad Académica
- Corpus experimental estándar para futuras investigaciones
- Métricas y metodología de evaluación documentadas
- Plataforma reproducible para replicar estudios

### 6.2 Para la Industria
- Herramienta gratuita para gestión de vulnerabilidades
- Modelo calibrable según contexto organizacional
- Mejor comprensión de priorización más allá de CVSS

### 6.3 Para la Sociedad
- Mejor gestión de riesgos en software académico
- Formación de desarrolladores en seguridad de cadena de suministro
- Contribución a la transparencia de software

---

*Documento generado el 08/09/2026 para el proyecto SecSBOM.*
*Estado: Borrador v1.0 - Requiere revisión del asesor.*

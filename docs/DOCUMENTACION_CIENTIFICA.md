# Documentación Científica: Fundamentos para el Artículo

## 1. Trabajos Relacionados en SBOM

### 1.1 Estándares y Especificaciones

| Estándar | Organización | Versión | Descripción | Referencia |
|----------|--------------|---------|-------------|------------|
| CycloneDX | OWASP | ECMA-424 (2025) | Formato estándar para SBOM con soporte de vulnerabilidades y licencias | [1] |
| SPDX | Linux Foundation | v3.0.1 (2024) | Estándar de intercambio de datos de paquetes de software | [2] |
| NTIA Minimum Elements | NTIA/CISA | 2021/2025/2026 | Elementos mínimos para SBOM válidos | [3][4][5] |
| ISO/IEC 5962:2021 | ISO | 2021 | Identificación de componentes de software | [6] |

### 1.2 Herramientas de Generación de SBOM

| Herramienta | Tipo | Ecosistemas Soportados | Limitaciones |
|-------------|------|------------------------|--------------|
| **Syft** (Anchore) | Open Source | Multi-ecosistema (Python, Java, JS, Go, .NET, PHP, Ruby, Rust) | Sin análisis de reachability |
| **Trivy** (Aqua Security) | Open Source | Multi-ecosistema + contenedores + IaC | Enfoque principal en contenedores |
| **CycloneDX cdxgen** | Open Source | Multi-ecosistema (15+ lenguajes) | Complejidad en configuración |
| **SBOM-tool** (Microsoft) | Open Source | .NET, Python, Java, JS | Enfoque en ecosistema Microsoft |
| **Snyk** | Comercial | 13 lenguajes, 20+ package managers | Propietario, costo elevado |
| **GitHub Dependabot** | Integrado | 25+ ecosistemas | Solo GitHub, sin SBOM exportable completo |

**Referencia:** Yu et al. (2024), O'Donoghue et al. (2023), Rabbi et al. (2024) - Tabla comparativa en [7]

### 1.3 Investigación Académica Reciente en SBOM

| Autor(es) | Año | Título | Hallazgos Clave | Referencia |
|-----------|-----|--------|-----------------|------------|
| **Systematic Literature Review** | 2025 | "Software Bill of Materials in Software Supply Chain Security: A Systematic Literature Review" | Revisión de 40 estudios; identifica barreras de adopción: inconsistencias en generación, falta de estandarización, madurez limitada de herramientas | [8] |
| **Soeiro et al.** | 2025 | "Wild SBOMs: a Large-scale Dataset of Software Bills of Materials from Public Code" | Dataset masivo de SBOMs reales; demuestra variabilidad en calidad entre herramientas | [9] |
| **Tobar et al.** (CMU SEI) | 2025 | "SBOM Harmonization Plugfest 2024" | Evaluación de diferencias entre generadores SBOM; recomendaciones para calidad consistente | [10] |
| **Sorocean et al.** | 2026 | "Securing the Software Supply Chain with SBOMs: An Empirical Evaluation of Open-Source Tools" | Evaluación empírica de herramientas SBOM en entornos empresariales | [11] |
| **O'Donoghue et al.** | 2023 | "Impacts of SBOM Generation on Vulnerability Detection" | La calidad del SBOM afecta directamente la detección de vulnerabilidades; lockfiles > manifestos | [12] |
| **Stalnaker et al.** | 2024 | "Boms Away! Inside the Minds of Stakeholders" | Estudio de percepción de stakeholders sobre SBOM; brecha entre generación y consumo | [13] |

### 1.4 Marco Regulatorio y Políticas

| Regulación | Jurisdicción | Requisito SBOM | Fecha |
|------------|--------------|----------------|-------|
| **Executive Order 14028** | EE.UU. | SBOM para software del gobierno federal | 2021 |
| **OMB M-22-18** | EE.UU. | Prácticas seguras de desarrollo incluyendo SBOM | 2022 |
| **EU Cyber Resilience Act** (Regulation 2024/2847) | UE | SBOM como parte de documentación técnica | 2024 |
| **BSI TR-03183-2** | Alemania | Requisitos técnicos para SBOM | 2024 |
| **METI Guidance** | Japón | Guía de implementación SBOM para proveedores | 2023 |
| **CERT-In Guidelines** | India | Requisitos de SBOM y otros BOM | 2024 |

---

## 2. Trabajos Relacionados en Priorización de Vulnerabilidades

### 2.1 Métricas de Severidad y Explotación

#### CVSS (Common Vulnerability Scoring System)
- **Versión actual:** CVSS v3.1 (con CVSS v4.0 disponible desde 2023)
- **Rango:** 0.0 - 10.0
- **Limitación fundamental:** Mide severidad teórica, no probabilidad de explotación real
- **Dato clave:** ~57% de CVEs reciben calificación High/Critical, pero <20% son explotados [14]

#### EPSS (Exploit Prediction Scoring System)
- **Versión actual:** EPSS v3.0 (con v4.0 disponible)
- **Rango:** 0.0 - 1.0 (probabilidad de explotación en 30 días)
- **Modelo:** Machine learning con 1,400+ features
- **Cobertura:** 82% de vulnerabilidades explotadas con menor carga de trabajo [14]
- **Actualización:** Diaria

#### CISA KEV (Known Exploited Vulnerabilities)
- **Tipo:** Catálogo de evidencia de explotación activa
- **Fortaleza:** Alta confianza en explotación confirmada
- **Limitación:** Reactivo (solo documenta después de explotación)
- **Cobertura:** Enfocado en redes federales de EE.UU.

### 2.2 Investigación Reciente en Priorización

| Autor(es) | Año | Enfoque | Contribución | Referencia |
|-----------|-----|---------|--------------|------------|
| **Shimizu & Hashimoto** | 2025 | Vulnerability Management Chaining | Framework de árbol de decisión integrando CVSS+EPSS+KEV; 95% reducción en carga urgente | [14] |
| **Jiang et al.** | 2025 | Survey on Vulnerability Prioritization | Revisión de 82 papers; taxonomía de métricas; gaps en context-aware y explainability | [15] |
| **Parente et al.** | 2025 | FRAPE Framework | Framework para evaluación de riesgo, priorización y explicabilidad de vulnerabilidades | [16] |
| **Rastogi et al.** | 2025 | XAI in Threat Intelligence | Revisión de XAI en SOC; analystas prefieren explicaciones contextuales accionables | [17] |
| **Adaptive VP (DQN)** | 2026 | Deep Reinforcement Learning | Agente DQN para priorización adaptativa; supera VPrioritizer por 4.3% | [18] |
| **Walkowski et al.** | 2021/2025 | CVSS + Context | Priorización automática con información contextual y ML | [19] |

### 2.3 Herramientas Comerciales de Priorización

| Herramienta | Empresa | Enfoque | Limitación |
|-------------|---------|---------|------------|
| **Snyk Risk Score** | Snyk | 12+ factores (EPSS, reachability, fix availability) | Propietario, no reproducible |
| **Tenable VPR** | Tenable | Vulnerability Priority Rating | Propietario, costo elevado |
| **Mend** | Mend (ex-WhiteSource) | Priorización + compliance licencias | Enfoque enterprise |
| **GitHub Advanced Security** | GitHub | Auto-triage rules + compatibility scores | Limitado a GitHub |

---

## 3. Gaps Identificados en la Literatura

### 3.1 Gap 1: Falta de Plataforma Reproducible para Investigación

**Estado actual:**
- Las herramientas comerciales (Snyk, Tenable) son propietarias y no reproducibles
- Las herramientas open source (Trivy, Syft) generan SBOM pero no priorizan contextualmente
- No existe una plataforma académica que integre SBOM + priorización contextual + explicabilidad

**Evidencia:**
- Jiang et al. (2025): "Existing approaches often rely on static models that struggle to keep pace with the rapidly changing cyber landscape" [15]
- Rastogi et al. (2025): "XAI adoption remains limited... primary barriers include lack of awareness, limited integration with existing security tools" [17]

### 3.2 Gap 2: Priorización Basada Exclusivamente en CVSS

**Estado actual:**
- Muchas organizaciones (especialmente académicas) usan solo CVSS para priorizar
- El "alert fatigue" es un problema documentado: demasiadas alertas "críticas" que nunca son explotadas

**Evidencia:**
- Shimizu & Hashimoto (2025): "Approximately 57% of published vulnerabilities receive High or Critical CVSS ratings, yet fewer than 20% are ever exploited" [14]
- Allodi & Massacci (2017): "Only a small fraction of published vulnerabilities are exploited in practice" [14]

### 3.3 Gap 3: Explicabilidad en Priorización de Vulnerabilidades

**Estado actual:**
- La mayoría de herramientas dan un score sin explicar por qué
- Falta trazabilidad: ¿por qué esta vulnerabilidad es prioridad sobre otra?
- Los desarrolladores no entienden las recomendaciones

**Evidencia:**
- Jiang et al. (2025): "A critical gap remains in the explainability of AI-driven models, as lack of transparency continues to hinder their adoption" [15]
- Parente et al. (2025): Propone FRAPE para explicabilidad pero sin integración con SBOM [16]

### 3.4 Gap 4: Contexto del Proyecto en Priorización

**Estado actual:**
- CVSS no considera: ¿está expuesto a internet? ¿En producción? ¿Es dependencia directa o transita?
- EPSS no considera: ¿el componente está realmente desplegado?

**Evidencia:**
- Jiang et al. (2025): "Contextual metrics are heavily utilized in graph-based approaches... emphasizing their ability to model system dependencies" [15]
- Shimizu & Hashimoto (2025): "Our current approach performs static analysis without considering dynamic factors such as asset criticality, network exposure" [14]

### 3.5 Gap 5: Evaluación Empírica en Proyectos Académicos

**Estado actual:**
- La mayoría de evaluaciones se hacen en entornos empresariales o synthéticos
- Falta evidencia en proyectos académicos con recursos limitados

**Evidencia:**
- La revisión sistemática de 2025 [8] identifica que la mayoría de estudios se enfocan en enterprise
- No existen corpus experimentales estándar para evaluar priorización en contexto académico

---

## 4. Contribución Original del Artículo

### 4.1 Contribución Principal

**Una plataforma basada en SBOM que integra priorización contextual multi-factor con explicabilidad trazable, validada empíricamente mediante un corpus experimental controlado en proyectos de software académico.**

### 4.2 Contribuciones Específicas

1. **Modelo de priorización contextual:** Fórmula ponderada que integra 8 factores (CVSS, EPSS, KEV, exposición, entorno, alcance de dependencia, criticidad, remediabilidad) con reglas de excepción, calibrable y explicable.

2. **Motor de explicabilidad trazable:** Cada decisión de priorización genera un JSON con factores, fuentes, valores, contribuciones y recomendaciones de remediación.

3. **Corpus experimental controlado:** 20+ proyectos de laboratorio con ground truth validado por expertos, cubriendo Python y .NET, con vulnerabilidades reales documentadas.

4. **Evidencia empírica comparativa:** Métricas de ranking (Precision@k, Recall@k, NDCG@k) comparando priorización contextual vs baseline CVSS, con concordancia con juicio de expertos (Spearman, Kendall).

5. **Plataforma reproducible:** Sistema open source con modo offline para garantizar reproducibilidad científica, usando snapshots fechados de fuentes de vulnerabilidades.

### 4.3 Diferenciación vs Trabajos Existentes

| Aspecto | Trabajos Existentes | SecSBOM (Este Artículo) |
|---------|--------------------|-----------------------|
| **Integración SBOM + Priorización** | Herramientas separadas | Pipeline unificado |
| **Explicabilidad** | Scores sin justificación | JSON trazable por hallazgo |
| **Contexto del proyecto** | No considerado | 4 factores contextuales |
| **Modo offline** | No disponible | Snapshots fechados |
| **Validación académica** | Enterprise/synthéticos | Corpus controlado + expertos |
| **Costo** | Comercial ($$) | Open source, gratuito |

---

## 5. Alineación Normativa

### 5.1 ISO/IEC 27001:2022

| Control | Descripción | Función en SecSBOM |
|---------|-------------|-------------------|
| **A.8.8** | Gestión de vulnerabilidades técnicas | Identificación, correlación, priorización y remediación de vulnerabilidades |
| **A.5.19** | Seguridad en la cadena de suministro de TI | SBOM como inventario de dependencias de terceros |
| **A.5.21** | Gestión de la seguridad de la cadena de suministro de TI | Análisis de dependencias directas y transitivas |

### 5.2 NIST SP 800-218 (SSDF)

| Práctica | Descripción | Cobertura en SecSBOM |
|----------|-------------|---------------------|
| **PO.3** | Proteger la cadena de suministro de software | SBOM + correlación de vulnerabilidades |
| **PS.1** | Definir las necesidades de seguridad del software | Perfil de contexto del proyecto |
| **RV.1** | Identificar las vulnerabilidades del software | Correlación OSV/NVD + enriquecimiento |

### 5.3 NIST CSF 2.0

| Categoría | Descripción | Implementación |
|-----------|-------------|----------------|
| **GV.SC** | Gestión de riesgo de cadena de suministro | SBOM + análisis de dependencias |
| **ID.RA** | Evaluación de riesgos | Modelo de priorización contextual |
| **RS.MI** | Mitigación | Recomendaciones de remediación |

### 5.4 Guías NTIA/CISA

| Elemento Mínimo (2021) | Actualización (2025/2026) | SecSBOM Cumple |
|------------------------|--------------------------|----------------|
| Supplier Name | Software Producer | ✓ (purl) |
| Component Name | Component Name | ✓ |
| Version | Semantic Version | ✓ |
| Dependency Relationships | Depth and Completeness | ✓ (grafo BFS) |
| Unique Identifier | PURL/CPE | ✓ (purl) |
| — | SBOM Author | ✓ (metadata) |
| — | SBOM Tool Name/Version | ✓ (cyclonedx-python) |

---

## 6. Validación del Modelo con Recomendaciones CISA

### 6.1 Alineación con CISA SBOM Minimum Elements (2025/2026)

**SecSBOM cumple con los elementos mínimos actualizados:**

| Categoría | Elemento | Implementación |
|-----------|----------|----------------|
| **Data Fields** | SBOM Author | Metadata del generador |
| | Software Producer | Propiedad purl del componente |
| | Component Name | Campo name en CycloneDX |
| | Semantic Version | Campo version con semver |
| | Unique Identifier | Package URL (purl) |
| | Dependency Relationships | Sección dependencies con grafo |
| **Automation** | Machine-processable format | CycloneDX JSON |
| | Automated generation | API REST + CLI |
| **Practices** | Regular updates | Snapshots fechados + modo hybrid |
| | Vulnerability correlation | OSV + NVD integration |

### 6.2 Recomendaciones CISA para Gestión de Vulnerabilidades

| Recomendación | Implementación en SecSBOM |
|---------------|--------------------------|
| Usar evidencia de explotación (KEV) | Integración directa con CISA KEV |
| Incorporar predicción de explotación (EPSS) | Score EPSS normalizado en priorización |
| Contexto ambiental | 4 factores: exposición, entorno, criticidad, alcance |
| Acciones de remediación | Recomendaciones: actualizar, mitigar, sustituir, aceptar |
| Trazabilidad | Explicación JSON por hallazgo |

### 6.3 Contribución a Objetivos de Transparencia de Software

SecSBOM contribuye a los objetivos de CISA/NTIA:

1. **Visibilidad:** Genera SBOM completo con dependencias transitivas
2. **Acciónabilidad:** Prioriza y recomienda acciones específicas
3. **Reproducibilidad:** Modo offline con snapshots fechados
4. **Accesibilidad:** Interfaz web local, sin costo

---

## 7. Referencias Bibliográficas

### Estándares y Guías
[1] OWASP Foundation. "CycloneDX: The International Standard for Bill of Materials (ECMA-424)." https://cyclonedx.org/, 2024.

[2] The Linux Foundation. "The System Package Data Exchange (SPDX) Specification Version 3.0.1." https://spdx.github.io/spdx-spec/v3.0.1/, 2024.

[3] NTIA. "The Minimum Elements For a Software Bill of Materials (SBOM)." https://www.ntia.gov/files/ntia/publications/sbom_minimum_elements_report.pdf, 2021.

[4] CISA. "2025 Minimum Elements for a Software Bill of Materials (SBOM)." https://www.cisa.gov/resources-tools/resources/2025-minimum-elements-software-bill-materials-sbom, 2025.

[5] CISA. "2026 Minimum Elements for a Software Bill of Materials (SBOM)." https://www.cisa.gov/resources-tools/resources/2026-minimum-elements-software-bill-materials-sbom, 2026.

[6] ISO. "ISO/IEC 5962:2021 - Information technology — Automatic identification and data capture techniques — Software identification (SWID) tags." https://www.iso.org/standard/81870.html, 2021.

### Investigación en SBOM
[7] Yu, H. et al. "A Reality Check on SBOM-based Vulnerability Management: An Empirical Study and A Path Forward." arXiv:2511.20313, 2026.

[8] ResearchGate. "Software Bill of Materials in Software Supply Chain Security: A Systematic Literature Review." arXiv:2506.03507, 2025.

[9] Soeiro, L., Robert, T., & Zacchiroli, S. "Wild SBOMs: a Large-scale Dataset of Software Bills of Materials from Public Code." arXiv:2503.15021, 2025.

[10] Tobar, D. et al. "Software Bill of Materials (SBOM) Harmonization Plugfest 2024." CMU/SEI-2025-SR-002, Carnegie Mellon University, 2025.

[11] Sorocean, O. et al. "Securing the Software Supply Chain with Software Bill of Materials (SBOMs): An Empirical Evaluation of Open-Source Tools in Enterprise IT Environments." Programming and Computer Software, 2026.

[12] O'Donoghue, E., Boles, B., Izurieta, C., & Reinhold, A.M. "Impacts of Software Bill of Materials (SBOM) Generation on Vulnerability Detection." Proceedings of the 2024 Workshop on SSCORNED, pp. 67-76, 2023.

[13] Stalnaker, T. et al. "Boms Away! Inside the Minds of Stakeholders: A Comprehensive Study of Bills of Materials for Software Systems." ICSE 2024, pp. 1-13, 2024.

### Investigación en Priorización
[14] Shimizu, N. & Hashimoto, M. "Vulnerability Management Chaining: An Integrated Framework for Efficient Cybersecurity Risk Prioritization." arXiv:2506.01220, 2025.

[15] Jiang, Y., Oo, N., Meng, Q., Lim, H.W., & Sikdar, B. "A Survey on Vulnerability Prioritization: Taxonomy, Metrics, and Research Challenges." arXiv:2502.11070, 2025.

[16] Parente, F.R. et al. "FRAPE: A Framework for Risk Assessment, Prioritization and Explainability of vulnerabilities in cybersecurity." Journal of Information Security and Applications, Vol. 89, 2025.

[17] Rastogi, N. et al. "Survey Perspective: The Role of Explainable AI in Threat Intelligence." arXiv:2503.02065, 2025.

[18] Adaptive Vulnerability Prioritization under Active Exploitation Using the CISA Known Exploited Vulnerabilities Catalog. ACM, 2026.

[19] Walkowski, M. et al. "Automatic CVSS-Based Vulnerability Prioritization and Response with Context Information." SoftCOM 2021, IEEE, pp. 1-6, 2021.

### Fuentes de Datos
[20] CISA. "Known Exploited Vulnerabilities (KEV) Catalog." https://www.cisa.gov/known-exploited-vulnerabilities-catalog, 2024.

[21] FIRST. "Exploit Prediction Scoring System (EPSS)." https://www.first.org/epss/, 2024.

[22] Google. "OSV - Open Source Vulnerabilities." https://osv.dev/, 2024.

[23] NIST. "National Vulnerability Database (NVD)." https://nvd.nist.gov/, 2024.

---

*Documento generado el 08/09/2026 para el proyecto SecSBOM.*
*Estado: Borrador v1.0 - Requiere revisión y actualización.*

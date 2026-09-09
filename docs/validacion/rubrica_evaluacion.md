# Rúbrica de Evaluación para Priorización de Vulnerabilidades

## Estudio SecSBOM — Framework de Priorización basado en SBOM

**Versión:** 1.0
**Fecha:** 2026

---

## Propósito de esta Rúbrica

Este documento define los criterios y niveles de prioridad que los/as expertos/as deben utilizar al evaluar los 24 casos de vulnerabilidades en dependencias de software. La rúbrica proporciona un marco de referencia estandarizado para garantizar consistencia entre evaluadores/as.

---

## Definición de Niveles de Prioridad

### 🔴 CRÍTICA

**Definición:** Vulnerabilidad que requiere remediación **inmediata** (0–24 horas). Existe evidencia de explotación activa, alto potencial de impacto severo, y la vulnerabilidad está en un componente expuesto en producción.

**Indicadores clave:**
- KEV activo (explotación documentada en la naturaleza)
- CVSS ≥ 9.0 **o** EPSS ≥ 0.7 con contexto de explotación
- Ambiente de producción **y** expuesto a red
- Dependencia directa (especialmente si es punto de entrada)
- Datos de alta criticidad (PII, credenciales, datos financieros)

---

### 🟠 ALTA

**Definición:** Vulnerabilidad que requiere remediación **urgente** (1–7 días). Alto potencial de impacto pero sin evidencia de explotación activa, o con factores mitigantes parciales.

**Indicadores clave:**
- CVSS ≥ 7.0 **o** EPSS ≥ 0.3
- Sin KEV pero con-vector de explotación claro
- Ambiente de producción (con o sin exposición directa)
- Dependencia directa o transitiva de baja profundidad (d ≤ 2)
- Parche disponible (facilita remediación)

---

### 🟡 MEDIA

**Definición:** Vulnerabilidad que debe remediarse en el **ciclo de mantenimiento regular** (1–4 semanas). Riesgo moderado con factores que reducen la urgencia.

**Indicadores clave:**
- CVSS 4.0–6.9 **o** EPSS 0.1–0.3
- Sin KEV
- Ambiente de staging o producción sin exposición directa
- Dependencia transitiva (d ≥ 2) o dependencia directa en entorno no productivo
- Datos de criticidad media

---

### 🔵 BAJA

**Definición:** Vulnerabilidad que debe programarse para **remediación a futuro** (1–3 meses). Riesgo bajo con múltiples factores mitigantes.

**Indicadores clave:**
- CVSS < 4.0 **o** EPSS < 0.1
- Sin KEV
- Ambiente de desarrollo o producción sin exposición
- Dependencia transitiva profunda (d ≥ 3) **o** dependencia de desarrollo
- Datos de baja criticidad
- Parche disponible pero sin urgencia de aplicación

---

### ⚪ INFORMATIVA

**Definición:** Vulnerabilidad de **referencia** sin acción inmediata requerida. Documentada para completitud del SBOM pero sin riesgo práctico en el contexto actual.

**Indicadores clave:**
- CVSS < 4.0 **o** EPSS < 0.05
- Sin KEV
- Entorno de desarrollo, sin exposición
- Dependencia de desarrollo (dev-dependency)
- Datos de baja criticidad
- Sin impacto funcional o de seguridad demostrable

---

## Matriz de Decisión por Factor

La siguiente tabla muestra cómo cada factor contribuye a la determinación de la prioridad. Los valores son guías, no reglas absolutas.

### Tabla 1: Contribución del CVSS

| Rango CVSS | Contribución a prioridad |
|------------|--------------------------|
| 9.0 – 10.0 | +3 niveles (hacia Crítica) |
| 7.0 – 8.9 | +2 niveles |
| 4.0 – 6.9 | +1 nivel |
| 0.1 – 3.9 | Neutro |
| 0.0 | -1 nivel |

### Tabla 2: Contribución del EPSS

| Rango EPSS | Contribución a prioridad |
|------------|--------------------------|
| ≥ 0.7 | +3 niveles |
| 0.3 – 0.69 | +2 niveles |
| 0.1 – 0.29 | +1 nivel |
| 0.01 – 0.09 | Neutro |
| < 0.01 | -1 nivel |

### Tabla 3: Factor KEV

| Estado KEV | Contribución a prioridad |
|------------|--------------------------|
| Sí (activo) | +2 niveles (mínimo Alta) |
| No | Neutro |

### Tabla 4: Factor Ambiente

| Ambiente | Contribución a prioridad |
|----------|--------------------------|
| Producción | +2 niveles |
| Staging | +1 nivel |
| Desarrollo | -1 nivel |

### Tabla 5: Factor Exposición

| Exposición | Contribución a prioridad |
|------------|--------------------------|
| Expuesto a red | +2 niveles |
| No expuesto | Neutro |

### Tabla 6: Critacidad de Datos

| Critacidad | Contribución a prioridad |
|------------|--------------------------|
| Alta (PII, credenciales, financieros) | +2 niveles |
| Media | +1 nivel |
| Baja | Neutro |

### Tabla 7: Tipo de Dependencia

| Tipo | Contribución a prioridad |
|------|--------------------------|
| Directa | +1 nivel |
| Transitiva (d=1–2) | Neutro |
| Transitiva (d=3–4) | -1 nivel |
| Transitiva (d≥5) | -2 niveles |
| Dev-dependency | -2 niveles |

### Tabla 8: Disponibilidad de Parche

| Parche | Contribución a prioridad |
|--------|--------------------------|
| Sí (disponible) | +1 nivel (habilita remediación) |
| No (sin solución) | -1 nivel (limita acción) |

---

## Árbol de Decisiones para Casos Límite

Cuando la evaluación de un caso resulte ambigua, siga este flujo de decisión:

```
¿Hay KEV activo?
├── SÍ → Mínimo ALTA. Evaluar si es Crítica según contexto.
└── NO ↓

¿Está en producción?
├── NO ↓
│   ├── ¿Está en staging Y expuesto?
│   │   ├── SÍ → Evaluar como si fuera producción con atenuantes.
│   │   └── NO → Mínimo BAJA.
│   └── [Fin de rama]

└── SÍ ↓

¿Está expuesto a red?
├── NO ↓
│   ├── CVSS ≥ 7.0 Y EPSS ≥ 0.3 → MEDIA
│   ├── CVSS < 7.0 O EPSS < 0.3 → BAJA
│   └── [Fin de rama]

└── SÍ ↓

¿Es dependencia directa?
├── NO ↓
│   ├── d ≤ 2 → Evaluar como dependencia directa con atenuante.
│   ├── d ≥ 3 → MEDIA o BAJA según CVSS/EPSS.
│   └── [Fin de rama]

└── SÍ ↓

¿Hay parche disponible?
├── NO → Considerar migración. Evaluar riesgo residual.
└── SÍ ↓

CVSS ≥ 9.0 O EPSS ≥ 0.7?
├── SÍ → CRÍTICA
└── NO → ALTA
```

---

## Factores Contextuales Adicionales

Los siguientes factores pueden ajustar la prioridad **±1 nivel** según el contexto específico del caso:

### Factores que incrementan la prioridad (+1 nivel)

- **Naturaleza del paquete:** Paquete criptográfico, de autenticación o de manejo de datos sensibles
- **Vector de explotación:** La vulnerabilidad permite RCE o acceso no autorizado
- **Cadena de dependencias:** El paquete es dependencia de frameworks ampliamente utilizados
- **Historial de incidentes:** La organización ha tenido incidentes relacionados previamente

### Factores que reducen la prioridad (-1 nivel)

- **Mitigaciones activas:** WAF, sandboxing, o controles compensatorios implementados
- **Función del paquete:** Solo se usa para testing, documentación o herramientas de build
- **Alternativas disponibles:** Existe un reemplazo directo sin vulnerabilidad conocida
- **Ventana de exposición:** La vulnerabilidad solo es explotable en configuraciones específicas no implementadas

---

## Ejemplos de Cada Nivel de Prioridad

### Ejemplo CRÍTICA

**Caso:** Pillow 10.0.0 / CVE-2023-4863
**Justificación:** KEV activo con explotación documentada (vector zero-click). Producción expuesta. Dependencia directa. CVSS 8.1 + KEV = impacto efectivo crítico. Acción inmediata requerida.

---

### Ejemplo ALTA

**Caso:** Werkzeug 2.2.2 / CVE-2023-25577 (producción, expuesto)
**Justificación:** CVSS 7.5 + producción expuesta + dependencia transitiva de baja profundidad. Sin KEV pero vector de explotación claro. Parche disponible facilita remediación en ventana de 1–7 días.

---

### Ejemplo MEDIA

**Caso:** urllib3 2.0.4 / CVE-2023-43804 (producción, transitiva)
**Justificación:** CVSS 4.2 + producción sin exposición directa. Dependencia transitiva. EPSS bajo (12%). Remediación programable en ciclo de mantenimiento regular.

---

### Ejemplo BAJA

**Caso:** Werkzeug 2.2.2 / CVE-2023-25577 (desarrollo)
**Justificación:** Misma vulnerabilidad que el ejemplo ALTA pero en entorno de desarrollo sin exposición. El riesgo real es despreciable. Programar para futuro.

---

### Ejemplo INFORMATIVA

**Caso:** Black 23.1.0 / CVE-2024-21503
**Justificación:** CVSS 5.3 + EPSS 5% + desarrollo + sin exposición + dependencia de desarrollo. Sin impacto práctico. Documentar para completitud del SBOM.

---

## Notas para Evaluadores

1. **No utilice solo el CVSS.** El CVSS es un componente, no la totalidad de la decisión.
2. **Considere siempre el contexto.** La misma vulnerabilidad puede ser Crítica o Informativa según el entorno.
3. **Justifique su razonamiento.** La justificación es tan importante como la selección del nivel.
4. **Cuando dude, evalúe el peor escenario razonable** dentro del contexto proporcionado.
5. **Los factores atenuantes no eliminan el riesgo**, solo lo reducen. Un entorno de desarrollo no es un escudo absoluto.

---

## Referencias

- **CVSS v3.1:** Common Vulnerability Scoring System — https://www.first.org/cvss/
- **EPSS:** Exploit Prediction Scoring System — https://www.first.org/epss/
- **KEV:** Known Exploited Vulnerabilities Catalog — https://www.cisa.gov/known-exploited-vulnerabilities-catalog
- **NIST SP 800-30:** Guía para Evaluación de Riesgos de TI — https://csrc.nist.gov/publications/detail/sp/800-30/rev-1/final

---

*Esta rúbrica forma parte del proyecto de investigación SecSBOM — Framework de Priorización de Vulnerabilidades basado en SBOM.*

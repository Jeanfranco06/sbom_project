# Instrucciones para el Panel de Expertos

## Estudio SecSBOM — Validación de Priorización de Vulnerabilidades

**Versión:** 1.0
**Fecha:** 2026

---

## 1. Propósito del Estudio

El presente estudio tiene como objetivo validar un **modelo de priorización de vulnerabilidades en dependencias de software** denominado **SecSBOM**. Este modelo utiliza la información contenida en un Software Bill of Materials (SBOM), combinada con datos de fuentes externas (CVSS, EPSS, KEV) y factores contextuales del entorno de despliegue, para asignar niveles de prioridad de remediación a vulnerabilidades identificadas en dependencias.

**Su participación como experto/a es fundamental para:**

- Evaluar si el modelo asigna prioridades consistentes con el criterio profesional experto
- Identificar factores que el modelo puede estar subestimando o sobreestimando
- Generar evidencia empírica de la validez del enfoque propuesto
- Contribuir a la mejora del framework para su aplicación en contextos reales

Los resultados de esta validación serán utilizados en una publicación científica. Su participación será reconocida de forma anónima en los agradecimientos del paper.

---

## 2. Estructura del Material de Validación

Usted recibirá los siguientes documentos:

| Documento | Descripción |
|-----------|-------------|
| `formulario_validacion.md` | Formulario con 24 casos de vulnerabilidades para evaluar |
| `rubrica_evaluacion.md` | Rúbrica con definiciones y criterios de cada nivel de prioridad |
| `instrucciones_expertos.md` | Este documento (instrucciones generales) |

---

## 3. Proceso de Evaluación

### Paso 1: Familiarización (5 minutos)

- Lea atentamente la **Rúbrica de Evaluación** (`rubrica_evaluacion.md`)
- Preste especial atención a las definiciones de cada nivel de prioridad
- Revise el árbol de decisiones para casos límite

### Paso 2: Evaluación de Casos (35–45 minutos)

- Abra el **Formulario de Validación** (`formulario_validacion.md`)
- Para cada uno de los 24 casos:
  1. Revise la descripción del escenario de vulnerabilidad
  2. Examine los datos proporcionados en la tabla (CVE, CVSS, EPSS, KEV, etc.)
  3. Seleccione el nivel de prioridad que considere correcto
  4. Escriba una justificación breve (2–3 oraciones) de su evaluación

### Paso 3: Resumen Comparativo (5–10 minutos)

- Complete la tabla de comparación al final del formulario
- Indique para cada caso si su evaluación coincide con la del modelo
- Proporcione comentarios generales sobre fortalezas y debilidades del modelo

---

## 4. Criterios de Calidad de las Evaluaciones

Para que su participación sea útil para la investigación, por favor asegúrese de:

- **Consistencia:** Evalúe todos los casos usando los mismos criterios definidos en la rúbrica
- **Justificación:** Proporcione razones claras y específicas para cada evaluación
- **Atención al contexto:** No se limite al CVSS; considere todos los factores disponibles
- **Pensamiento crítico:** Si un caso parece ambiguo, documente su razonamiento

---

## 5. Tiempo Estimado

| Actividad | Tiempo estimado |
|-----------|-----------------|
| Lectura de instrucciones | 5 minutos |
| Lectura de la rúbrica | 5 minutos |
| Evaluación de 24 casos | 35–45 minutos |
| Resumen comparativo | 5–10 minutos |
| **Total** | **50–65 minutos** |

---

## 6. Información de Contacto

Si tiene preguntas sobre el estudio o necesita aclaraciones sobre algún caso, por favor contacte al equipo de investigación:

| Campo | Información |
|-------|-------------|
| **Investigador principal** | [Nombre del investigador] |
| **Correo electrónico** | [correo@institucion.edu] |
| **Institución** | [Nombre de la institución] |
| **Teléfono** | [+XX XXX XXX XXXX] |
| **Horario de atención** | Lunes a viernes, 9:00–18:00 (hora local) |

---

## 7. Nota de Confidencialidad

Este estudio se realiza bajo los siguientes principios de confidencialidad y ética:

### Anonimato

- Sus respuestas serán tratadas de forma **completamente anónima**
- En la publicación de resultados, solo se hará referencia a "panel de N expertos"
- Su nombre **no será asociado** con respuestas individuales en ningún momento

### Uso de Datos

- Los datos recopilados serán utilizados **exclusivamente** para los fines de esta investigación
- No se compartirán con terceros ni se utilizarán para otros propósitos
- Los datos serán conservados por un máximo de **5 años** después de la publicación, y luego eliminados

### Consentimiento

- Su participación es **voluntaria** y puede retirarse en cualquier momento
- Al completar el formulario, declara haber leído y comprendido estas instrucciones
- La participación implica la aceptación de los términos descritos aquí

### Publicación

- Los resultados se presentarán de forma agregada (estadísticas de concordancia, análisis de divergencias)
- No se publicarán respuestas individuales identificables
- El protocolo del estudio será enviado a un comité de ética antes de la recolección de datos

---

## 8. Glosario de Términos

Para facilitar la comprensión de los casos, a continuación se definen los términos técnicos utilizados:

| Término | Definición |
|---------|------------|
| **CVSS** | Common Vulnerability Scoring System — Puntuación numérica (0–10) que mide la severidad técnica de una vulnerabilidad |
| **EPSS** | Exploit Prediction Scoring System — Probabilidad (0–1) de que una vulnerabilidad sea explotada en los próximos 30 días |
| **KEV** | Known Exploited Vulnerabilities — Catálogo de CISA que lista vulnerabilidades con explotación activa documentada |
| **SBOM** | Software Bill of Materials — Inventario estructurado de componentes de software y sus dependencias |
| **Dependencia directa** | Paquete incluido explícitamente en el manifiesto del proyecto |
| **Dependencia transitiva** | Paquete incluido como dependencia de otra dependencia |
| **Profundidad (d)** | Número de niveles de separación entre el paquete raíz y la dependencia vulnerable |
| **PII** | Personally Identifiable Information — Datos personales identificables |
| **RCE** | Remote Code Execution — Ejecución remota de código |

---

## 9. Preguntas Frecuentes

**P: ¿Puedo cambiar mi evaluación después de enviar el formulario?**
R: Sí, mientras el plazo de recepción esté abierto. Envíe una versión actualizada indicando los cambios.

**P: ¿Qué hago si no conozco un paquete o CVE específico?**
R: Evalúe el caso basándose en los datos proporcionados en la tabla. No es necesario conocer el paquete específicamente; los factores cuantitativos (CVSS, EPSS, KEV) y contextuales (ambiente, exposición) son suficientes para la evaluación.

**P: ¿Debo investigar los CVEs por mi cuenta?**
R: No es necesario ni recomendable. La información proporcionada en cada caso es la que el modelo utilizaría en producción. Investigar externamente podría introducir sesgos.

**P: ¿Qué significan los casos MOCK (MOCK-KEV-XXXX)?**
R: Son paquetes internos del proyecto con vulnerabilidades simuladas para evaluar el manejo de activos propios. Evalúelos como evaluaría cualquier otro caso.

**P: ¿Puedo discutir los casos con otros expertos?**
R: Se recomienda que cada experto evalúe de forma independiente para evitar sesgos de grupo. Si tiene dudas, contacte al equipo de investigación.

---

*Agradecemos su participación en este estudio. Su experiencia y criterio profesional son fundamentales para la validación científica de este framework.*

*Proyecto SecSBOM — Framework de Priorización de Vulnerabilidades basado en SBOM*

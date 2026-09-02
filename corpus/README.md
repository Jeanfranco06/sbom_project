# Corpus Experimental Controlado — SecSBOM (Fase A)

Este directorio contiene la **verdad de terreno** del experimento: 12 proyectos de
laboratorio que aíslan las variables del modelo de priorización contextual, con sus
etiquetas de prioridad esperada (`expected_priority`) para evaluar las hipótesis
H1 (calidad de ranking), H3 (concordancia con expertos) y H4 (cobertura SBOM).

- Selección y evidencia de CVEs: ver [CVE_SELECTION.md](CVE_SELECTION.md) (Fase A.1).
- Fecha del snapshot de fuentes (OSV/KEV/EPSS): **2026-09-02** (`fixtures/`).
- Los proyectos son **manifest-only** por diseño: el analizador de SecSBOM es
  estático (no ejecuta código), por lo que cada caso solo necesita su manifiesto
  de dependencias y su `ground_truth.json`.

## Matriz de los 12 casos (Fase A.2)

| # | Caso | Alcance | Entorno | Expuesto | Parche | Paquete / CVE objetivo | Prioridad esperada |
|---|------|---------|---------|----------|--------|------------------------|--------------------|
| 01 | KEV + producción | Directa | production | Sí | Sí | pillow 10.0.0 / CVE-2023-4863 | **critical** |
| 02 | KEV dominante sin parche | Directa | production | Sí | **No** | corpus-filexplorer 1.0.0 / MOCK-KEV-0001 ⚠ sintético | **critical** |
| 03 | Score sin regla dura | Transitiva | production | Sí | Sí | werkzeug 2.2.2 / CVE-2023-25577 | **high** |
| 04 | Score degradado | Transitiva | development | No | Sí | werkzeug 2.2.2 / CVE-2023-25577 | **low** |
| 05 | Regla de degradación R2 | Directa (dev) | production | No | Sí | black 23.1.0 / CVE-2024-21503 | **info** |
| 06 | KEV vs Dev ⚠ consenso | Directa (dev) | production | No | **No** | corpus-devkit 2.0.0 / MOCK-KEV-0002 ⚠ sintético | **medium** |
| 07 | CVSS crítico sin KEV | Directa | staging | Sí | **No** | pycrypto 2.6.1 / CVE-2013-7459 (+ CVE-2018-6594) | **high** / **medium** |
| 08 | Ruido / irrelevante | Directa | development | No | **No** | ecdsa 0.18.0 / CVE-2024-23342 | **low** |
| 09 | Exposición vs entorno | Transitiva | production | No | Sí | urllib3 2.0.4 / CVE-2023-43804 | **medium** |
| 10 | CVSS medio, EPSS alta | Directa | production | Sí | Sí | paramiko 2.10.3 / CVE-2023-48795 | **high** |
| 11 | Caso gris ⚠ consenso | Transitiva | production | Sí | **No** | ecdsa 0.18.0 / CVE-2024-23342 | **medium** |
| 12 | Criticidad de datos baja ⚠ consenso | Directa | production | Sí | Sí | urllib3 2.0.4 / CVE-2023-43804 | **medium** |

⚠ Casos 06 y 12 (y el gris 11): etiquetas iniciales **pendientes de consenso del
panel de expertos** (Fase A.4). ⚠ sintético: vulnerabilidad mock documentada en
CVE_SELECTION.md.

Cada caso incluye además 2 dependencias **negativas** (sin vulnerabilidades
conocidas en el snapshot: six, colorama, packaging, typing-extensions,
platformdirs, zipp, atomicwrites) como ruido controlado (sección 12.1 de `bases.md`).

## Estructura

```
corpus/
  README.md                    # este archivo (Fase A.2)
  CVE_SELECTION.md             # evidencia de seleccion de CVEs (Fase A.1)
  fixtures/                    # snapshots offline fechados (2026-09-02)
    osv/*.json                 # respuestas OSV crudas por paquete+version
    kev/kev_20260902.json      # KEV reducido al corpus (+ mocks)
    epss/epss_20260902.csv.gz  # EPSS reducido al corpus (+ mocks)
  caso_XX_*/
    requirements.txt | pyproject.toml | poetry.lock
    ground_truth.json          # contexto del proyecto + etiquetas esperadas
```

## Uso

```powershell
# 1. (Re)generar los fixtures offline (requiere red; ya vienen generados)
python scripts/build_corpus_fixtures.py

# 2. Arrancar el servidor SecSBOM
python backend/run.py   # o: uvicorn app.main:app --app-dir backend

# 3. Cargar el corpus en la base de datos y analizar en modo offline (Fase A.4)
python scripts/load_corpus.py --seed-fixtures --analyze
```

Tras la carga, las métricas de ranking de cada caso están disponibles en
`GET /api/projects/{id}/metrics` y la verdad de terreno en
`GET /api/projects/{id}/ground-truth`.

## Notas de calidad de datos (amenazas a la validez documentadas)

1. **CVE-2013-7459 (caso 07)**: OSV lista un evento `fixed` con hash de commit git
   (PYSEC-2017-94), por lo que el motor infiere `patch_available=True`. En la
   realidad operativa pycrypto está abandonado y **no existe release instalable en
   PyPI** con la corrección; la verdad de terreno registra `patch_available=false`.
2. **CVE-2023-4863 (caso 01)**: OSV contiene dos entradas para el mismo problema
   (GHSA-j7hp-h8jx-5ppr con CVE y PYSEC-2023-175 sin alias CVE): el segundo queda
   como hallazgo duplicado no etiquetado.
3. **CVE-2023-43804 (casos 09/12)**: OSV publica dos vectores CVSS divergentes
   (GHSA 5.9 vs PYSEC 8.1). El motor fusiona las entradas y conserva el vector de
   GHSA; la verdad de terreno se etiquetó con ese valor.
4. **Ruido no etiquetado**: las versiones vulnerables reales acumulan otras CVEs
   (p. ej. pillow 10.0.0: 35 entradas OSV al 2026-09-02). Solo las vulnerabilidades
   objetivo están etiquetadas; el resto actúa como ruido realista no relevante.
5. **EPSS/KEV son series temporales**: los valores usados corresponden al snapshot
   2026-09-02. Regenerar los fixtures en otra fecha produce un snapshot distinto
   (nuevo experimento, no comparable con éste).

# SecSBOM

**Plataforma de priorización contextual y explicable de vulnerabilidades basada en SBOM para proyectos de software académico.**

[![Python 3.13](https://img.shields.io/badge/python-3.13-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-green.svg)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-MIT-lightgrey.svg)](LICENSE)

---

## Resumen

SecSBOM es una plataforma local que transforma el inventario técnico de dependencias (SBOM) en un **ranking contextual y explicable de vulnerabilidades**, superando la priorización basada únicamente en CVSS. Combina:

- **CVSS** (severidad técnica)
- **EPSS** (probabilidad de explotación)
- **CISA KEV** (evidencia de explotación activa)
- **Contexto del proyecto** (entorno, exposición, criticidad de datos, tipo de dependencia)

### Fórmula de priorización

```
P_v = 20*C + 25*K + 15*E + 15*X + 10*A + 5*D + 5*I + 5*R
```

| Factor | Descripción | Peso |
|--------|-------------|------|
| C | CVSS normalizado | 20% |
| K | Evidencia KEV | 25% |
| E | EPSS normalizado | 15% |
| X | Exposición del componente | 15% |
| A | Entorno (prod/staging/dev) | 10% |
| D | Tipo de dependencia (directa/transitiva) | 5% |
| I | Criticidad de datos | 5% |
| R | Disponibilidad de parche | 5% |

---

## Características

- **Análisis multi-ecosistema**: Python (PyPI), .NET (NuGet)
- **Modo offline**: Snapshots fechados de OSV, KEV y EPSS para reproducibilidad científica
- **Explicabilidad**: Cada hallazgo incluye la razón JSON de su prioridad
- **Grafo de dependencias**: Visualización interactiva del grafo de dependencias
- **Experimentación**: Módulo de usabilidad con cronómetro para validar H2 (reducción de tiempo de triage)
- **Exportación**: JSON, CSV, PDF con formatos profesionales
- **Dashboard**: KPIs, distribución de prioridades, timeline de análisis

---

## Arquitectura

```
secsbom/
├── backend/                # FastAPI + SQLAlchemy + SQLite
│   ├── app/
│   │   ├── api/            # Rutas REST (25+ endpoints)
│   │   ├── services/       # Lógica de negocio
│   │   │   ├── analysis_service.py    # Análisis de vulnerabilidades
│   │   │   ├── prioritization.py      # Modelo de priorización contextual
│   │   │   ├── explainability.py      # Motor de explicabilidad
│   │   │   ├── dependency_analyzer.py # Análisis de dependencias
│   │   │   └── ...
│   │   ├── models.py       # Modelos SQLAlchemy
│   │   └── schemas.py      # Schemas Pydantic
│   └── requirements.txt
├── frontend/               # Next.js 14 + React + Tailwind CSS
│   ├── src/
│   │   ├── app/            # App Router
│   │   ├── components/     # Componentes UI
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # API client, utils
│   │   ├── types/          # TypeScript interfaces
│   │   └── __tests__/      # Tests unitarios (Vitest)
│   └── package.json
├── corpus/                 # Corpus experimental controlado
│   ├── caso_01_*/ ... caso_24_*/  # 24 casos de prueba
│   └── fixtures/           # Snapshots offline fechados
├── scripts/                # Scripts de utilidad
│   ├── build_corpus_fixtures.py  # Generador de fixtures
│   ├── load_corpus.py           # Carga del corpus
│   ├── sbom_validator.py        # Validación SBOM
│   └── fleiss_kappa.py          # Calculadora Fleiss' kappa
└── docs/                   # Documentación científica
    ├── DOCUMENTACION_CIENTIFICA.md  # Revisión de literatura
    ├── GAPS_Y_CONTRIBUCION.md       # Brechas y contribuciones
    ├── referencias.bib              # Bibliografía (35 entradas)
    └── validacion/                  # Instrumentos de validación
```

---

## Inicio rápido

### Prerrequisitos

- Python 3.13+
- Node.js 18+
- npm
- PostgreSQL 16+ (o Docker Desktop)

### Instalación

```powershell
# Clonar el repositorio
git clone https://github.com/tu-usuario/sec_sbom.git
cd sec_sbom

# Crear entorno virtual e instalar dependencias del backend
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r backend/requirements.txt

# Instalar dependencias del frontend
cd frontend
npm install
cd ..
```

### Ejecución

```powershell
# Terminal 1: PostgreSQL
docker compose up -d postgres

# Terminal 2: Backend (FastAPI)
cd backend
pip install -r requirements.txt
$env:DATABASE_URL = "postgresql+psycopg://secsbom:secsbom@localhost:5432/secsbom"
uvicorn app.main:app --reload --port 8000

# Terminal 3: Frontend (Next.js)
cd frontend
npm run dev
```

Abrir **http://localhost:3000** en el navegador.

### Cargar corpus experimental

```powershell
# Generar fixtures offline (requiere red, una sola vez)
python scripts/build_corpus_fixtures.py

# Cargar corpus en la base de datos y analizar
python scripts/load_corpus.py --seed-fixtures --analyze
```

---

## Corpus experimental

24 casos de prueba controlados que aíslan variables del modelo de priorización:

| # | Caso | Paquete | CVE | Entorno | Prioridad |
|---|------|---------|-----|---------|-----------|
| 01 | KEV + producción | pillow 10.0.0 | CVE-2023-4863 | production | **critical** |
| 02 | KEV sin parche | corpus-filexplorer 1.0.0 | MOCK-KEV-0001 | production | **critical** |
| 03 | Transitiva prod | werkzeug 2.2.2 | CVE-2023-25577 | production | **high** |
| 04 | Transitiva dev | werkzeug 2.2.2 | CVE-2023-25577 | development | **low** |
| 05 | Dev sin exposición | black 23.1.0 | CVE-2024-21503 | production | **info** |
| 06 | KEV vs Dev | corpus-devkit 2.0.0 | MOCK-KEV-0002 | production | **medium** |
| 07 | CVSS crítico | pycrypto 2.6.1 | CVE-2013-7459 | staging | **high** |
| 08 | Ruido | ecdsa 0.18.0 | CVE-2024-23342 | development | **low** |
| 09 | Exposición vs entorno | urllib3 2.0.4 | CVE-2023-43804 | production | **medium** |
| 10 | EPSS alta | paramiko 2.10.3 | CVE-2023-48795 | production | **high** |
| 11 | Caso gris | ecdsa 0.18.0 | CVE-2024-23342 | production | **medium** |
| 12 | Criticidad baja | urllib3 2.0.4 | CVE-2023-43804 | production | **medium** |
| 13-16 | NuGet | Newtonsoft.Json 12.0.3 | CVE-2024-21907 | Varios | Varios |
| 17 | Staging CVE alto | setuptools 69.1.1 | CVE-2024-6345 | staging | **high** |
| 18 | Staging sin exposición | virtualenv 20.26.5 | CVE-2024-53899 | staging | **medium** |
| 19 | Transitiva d=3 | nltk 3.8.1 | CVE-2024-39705 | production | **high** |
| 20 | Transitiva staging | python-multipart 0.0.6 | CVE-2024-24762 | staging | **medium** |
| 21 | Transitiva d=4 | idna 3.6 | CVE-2024-3651 | production | **low** |
| 22 | Dev sin exposición | scikit-learn 1.4.1 | CVE-2024-5206 | development | **info** |
| 23 | Criticidad alta | RestrictedPython 7.2 | CVE-2024-47532 | production | **medium** |
| 24 | SQL injection | python-sql 1.5.1 | CVE-2024-9774 | production | **medium** |

---

## API REST

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/projects` | GET/POST | Listar/crear proyectos |
| `/api/projects/{id}` | GET/PUT/DELETE | Gestión de proyecto |
| `/api/projects/{id}/analyze` | POST | Ejecutar análisis |
| `/api/projects/{id}/findings` | GET | Obtener hallazgos |
| `/api/projects/{id}/graph` | GET | Grafo de dependencias |
| `/api/projects/{id}/sbom` | GET | Exportar SBOM CycloneDX |
| `/api/projects/{id}/export` | GET | Exportar (JSON/CSV/PDF) |
| `/api/projects/{id}/metrics` | GET | Métricas de ranking |
| `/api/projects/{id}/ground-truth` | GET | Verdad de terreno |
| `/api/settings` | GET/PUT | Configuración global |
| `/api/settings/weights` | PUT | Actualizar pesos del modelo |
| `/api/experiment/statistics` | POST | Estadísticas experimentales |

Documentación interactiva: **http://localhost:8000/docs**

---

## Tests

```powershell
# Backend
cd backend
pytest

# Frontend
cd frontend
npm run test

# Cobertura
npm run test:coverage
```

---

## Validación de expertos

Instrumentos preparados para validar las prioridades esperadas con un panel de 3-5 expertos:

- `docs/validacion/formulario_validacion.md` — Formulario de evaluación
- `docs/validacion/rubrica_evaluacion.md` — Rúbrica de criterios
- `docs/validacion/instrucciones_expertos.md` — Instrucciones para el panel
- `scripts/fleiss_kappa.py` — Calculadora de concordancia inter-evaluadores

```powershell
# Ejemplo con Fleiss' kappa
python scripts/fleiss_kappa.py --input evaluacion_expertos.csv --output resultados_kappa.json
```

---

## Investigación

Este proyecto acompaña un artículo de investigación con las siguientes hipótesis:

| ID | Hipótesis |
|----|-----------|
| H1 | El ranking contextual supera en calidad (Precision@k, NDCG@k) al ranking solo-CVSS |
| H2 | Las alertas con explicación reducen el tiempo de triage |
| H3 | El modelo alcanza concordancia aceptable (Kendall's tau) con expertos |
| H4 | La plataforma identifica más dependencias vulnerables que un inventario manual |

Documentación científica completa en `docs/`.

---

## Licencia

MIT

---

## Contacto

Para preguntas o contribuciones, abrir un issue en el repositorio.

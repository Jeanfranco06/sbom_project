"""Carga el corpus experimental en SecSBOM mediante la API (Fase A.4).

Para cada caso del corpus (corpus/caso_*):
  1. Crea el proyecto via POST /api/projects (o lo actualiza si ya existe).
  2. Registra/actualiza la verdad de terreno via PUT /api/projects/{id}/ground-truth.

Opciones:
  --seed-fixtures  Copia corpus/fixtures (OSV/KEV/EPSS) al directorio de datos
                   del servidor, habilitando el analisis en modo offline.
  --data-dir       Directorio de datos del servidor (por defecto <repo>/data).
  --analyze        Tras cargar, ejecuta el analisis offline de cada proyecto.
  --base-url       URL base de la API (por defecto http://127.0.0.1:8000).

Uso tipico (con el servidor en marcha):
    python scripts/load_corpus.py --seed-fixtures --analyze

La sesion de validacion con expertos (A.4) es una tarea humana; tras ella,
editar los ground_truth.json y re-ejecutar este script para actualizar etiquetas.
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CORPUS_DIR = ROOT / "corpus"
VALID_ENV = {"production", "staging", "development"}
VALID_CRIT = {"high", "medium", "low"}
VALID_PRIO = {"critical", "high", "medium", "low", "info"}


class ApiError(Exception):
    pass


def _request(method: str, url: str, payload: dict | list | None = None) -> dict | list:
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    if data is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read()
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode(errors="replace")[:500]
        raise ApiError(f"{method} {url} -> HTTP {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise ApiError(f"{method} {url} -> {exc}. ¿Esta el servidor en marcha?") from exc


def validate_case(case_dir: Path) -> dict:
    """Lee y valida el ground_truth.json de un caso."""
    gt_file = case_dir / "ground_truth.json"
    if not gt_file.exists():
        raise ApiError(f"Falta {gt_file}")
    payload = json.loads(gt_file.read_text(encoding="utf-8"))
    project = payload.get("project") or {}
    items = payload.get("ground_truth") or []
    if not project.get("name"):
        raise ApiError(f"{gt_file}: project.name requerido")
    if project.get("environment") not in VALID_ENV:
        raise ApiError(f"{gt_file}: environment invalido")
    if project.get("data_criticality") not in VALID_CRIT:
        raise ApiError(f"{gt_file}: data_criticality invalido")
    if not items:
        raise ApiError(f"{gt_file}: ground_truth vacio")
    for item in items:
        if item.get("expected_priority") not in VALID_PRIO:
            raise ApiError(f"{gt_file}: expected_priority invalido en {item.get('vuln_id')}")
        if not item.get("vuln_id"):
            raise ApiError(f"{gt_file}: vuln_id requerido")
    return payload


def upsert_project(base_url: str, project: dict, path: str) -> int:
    """Crea el proyecto o actualiza su contexto si ya existe. Devuelve el id."""
    body = {
        "name": project["name"],
        "path": path,
        "description": project.get("description", ""),
        "environment": project["environment"],
        "internet_exposed": bool(project["internet_exposed"]),
        "data_criticality": project["data_criticality"],
    }
    try:
        created = _request("POST", f"{base_url}/api/projects", body)
        return int(created["id"])
    except ApiError as exc:
        if "HTTP 409" not in str(exc):
            raise
    # Ya existe: localizar por nombre y actualizar contexto
    projects = _request("GET", f"{base_url}/api/projects")
    match = next((p for p in projects if p.get("name") == project["name"]), None)
    if match is None:
        raise ApiError(f"Conflicto 409 pero no se encontro el proyecto {project['name']}")
    pid = int(match["id"])
    _request("PATCH", f"{base_url}/api/projects/{pid}", body)
    return pid


def seed_fixtures(data_dir: Path) -> None:
    """Copia los fixtures del corpus al directorio de datos del servidor."""
    fixtures = CORPUS_DIR / "fixtures"
    targets = {
        fixtures / "osv": data_dir / "cache" / "osv",
        fixtures / "kev": data_dir / "snapshots" / "kev",
        fixtures / "epss": data_dir / "snapshots" / "epss",
    }
    for src, dst in targets.items():
        if not src.exists():
            raise ApiError(f"No existe {src}. Ejecuta primero scripts/build_corpus_fixtures.py")
        dst.mkdir(parents=True, exist_ok=True)
        count = 0
        for f in src.iterdir():
            if f.is_file():
                shutil.copy(f, dst / f.name)
                count += 1
        print(f"  fixtures {src.name}: {count} archivos -> {dst}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Carga el corpus SecSBOM via API")
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--seed-fixtures", action="store_true")
    parser.add_argument("--data-dir", default=str(ROOT / "data"))
    parser.add_argument("--analyze", action="store_true")
    args = parser.parse_args()

    case_dirs = sorted(p for p in CORPUS_DIR.glob("caso_*") if p.is_dir())
    if not case_dirs:
        print("No se encontraron casos en corpus/caso_*", file=sys.stderr)
        return 1

    if args.seed_fixtures:
        print("Sembrando fixtures en el directorio de datos del servidor...")
        seed_fixtures(Path(args.data_dir))

    print(f"Cargando {len(case_dirs)} casos en {args.base_url}...")
    for case_dir in case_dirs:
        payload = validate_case(case_dir)
        project = payload["project"]
        pid = upsert_project(args.base_url, project, str(case_dir.resolve()))
        result = _request(
            "PUT", f"{args.base_url}/api/projects/{pid}/ground-truth", payload["ground_truth"]
        )
        print(f"  {case_dir.name}: proyecto id={pid}, ground truth={result.get('count')} casos")
        if args.analyze:
            analysis = _request(
                "POST", f"{args.base_url}/api/projects/{pid}/analyze?mode=offline"
            )
            print(f"    analisis offline id={analysis.get('id')} status={analysis.get('status')}")

    print("Corpus cargado correctamente.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

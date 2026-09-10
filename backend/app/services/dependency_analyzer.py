"""Analizador de dependencias para proyectos Python, PHP y Node.js.

Soporta:
  - requirements.txt  (Python, dependencias directas)
  - pyproject.toml    (Python, dependencias directas, PEP 621 o Poetry)
  - Pipfile.lock      (Python, resolucion completa con grafo)
  - poetry.lock       (Python, resolucion completa con grafo)
  - composer.lock     (PHP/Composer, resolucion completa con grafo)
  - package-lock.json (Node.js/npm, resolucion completa con grafo)

El resultado describe dependencias directas y transitivas, su profundidad en el
grafo, si pertenecen a desarrollo, su categoria y su ecosistema de paquetes
(PyPI, Packagist o npm) para correlacionar con OSV.
"""
from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

try:
    import tomllib  # Python 3.11+
except ModuleNotFoundError:  # pragma: no cover
    try:
        import tomli as tomllib  # type: ignore[no-redef]
    except ModuleNotFoundError:  # pragma: no cover
        tomllib = None  # type: ignore[assignment]


@dataclass
class ResolvedPackage:
    name: str
    version: str
    is_direct: bool = False
    is_dev: bool = False
    category: str = "main"
    source: str = "manifest"
    ecosystem: str = "PyPI"
    dependencies: list[str] = field(default_factory=list)


class DependencyAnalysisError(Exception):
    pass


_REQ_RE = re.compile(
    r"^\s*([A-Za-z0-9_.\-]+)\s*((?:\[[^\]]*\])?)(==|>=|<=|~=|!=|<|>|===)?\s*([A-Za-z0-9_.\-+!*]*)\s*(?:;.*)?$"
)


def normalize_name(name: str) -> str:
    return name.strip().lower().replace("_", "-")


def _parse_version_eq(constraint: str, version: str) -> str:
    """Devuelve la version exacta si el constraint es compatible, o ''."""
    v = version.strip()
    if constraint == "==" and v:
        return v
    return ""


def parse_requirements(lines: Iterable[str]) -> list[ResolvedPackage]:
    """Parsea requirements.txt. Solo se fijan versiones exactas (==)."""
    result: list[ResolvedPackage] = []
    for raw in lines:
        line = raw.strip()
        if not line or line.startswith("#") or line.startswith("-") or line.startswith("--"):
            continue
        if line.startswith("-e") or "@" in line.split("#")[0]:
            continue
        m = _REQ_RE.match(line.split("#")[0])
        if not m:
            continue
        name = normalize_name(m.group(1))
        constraint = m.group(3) or ""
        version = _parse_version_eq(constraint, m.group(4) or "")
        result.append(ResolvedPackage(name=name, version=version, is_direct=True, source="requirements.txt"))
    return result


def parse_pyproject(toml_content: bytes, source_name: str = "pyproject.toml") -> list[ResolvedPackage]:
    """Parsea dependencias directas de pyproject.toml (PEP 621 o Poetry)."""
    if tomllib is None:  # pragma: no cover
        return []
    doc = tomllib.loads(toml_content.decode("utf-8"))
    result: list[ResolvedPackage] = []

    project = doc.get("project", {}) or {}
    for dep in project.get("dependencies", []) or []:
        name, version, _extras = _split_requirement(dep)
        result.append(ResolvedPackage(name=name, version=version, is_direct=True, source=source_name))
    for _group, deps in (project.get("optional-dependencies", {}) or {}).items():
        for dep in deps or []:
            name, version, _extras = _split_requirement(dep)
            result.append(ResolvedPackage(name=name, version=version, is_direct=True, source=source_name))

    poetry = doc.get("tool", {}).get("poetry", {}) or {}
    for key, dep in (poetry.get("dependencies", {}) or {}).items():
        if key.lower() == "python":
            continue
        name, version = _poetry_dep(key, dep)
        result.append(ResolvedPackage(name=name, version=version, is_direct=True, source=source_name))
    for group_name, group in (poetry.get("group", {}) or {}).items():
        for key, dep in (group.get("dependencies", {}) or {}).items():
            if key.lower() == "python":
                continue
            name, version = _poetry_dep(key, dep)
            result.append(
                ResolvedPackage(
                    name=name, version=version, is_direct=True, is_dev=True,
                    category="dev", source=source_name,
                )
            )
    return result


def _poetry_dep(key: str, dep) -> tuple[str, str]:
    if isinstance(dep, str):
        value = dep.strip()
        # Version simple sin operador -> version; constraint -> vacio (lo resuelve el lockfile)
        if any(c in value for c in "<>!~^*="):
            return normalize_name(key), ""
        return normalize_name(key), value
    if isinstance(dep, dict):
        version = str(dep.get("version", ""))
        return normalize_name(key), version
    return normalize_name(key), ""


def _split_requirement(requirement: str) -> tuple[str, str, str]:
    """Divide 'numpy[extra]==1.2' en (numpy, '1.2', 'extra')."""
    req = requirement.strip()
    marker = req.find(";")
    if marker != -1:
        req = req[:marker]
    base = req
    extras = ""
    b = req.find("[")
    if b != -1:
        e = req.find("]")
        extras = req[b + 1:e]
        base = req[:b] + req[e + 1:]
    m = re.match(r"^\s*([A-Za-z0-9_.\-]+)\s*(.*)$", base)
    name = normalize_name(m.group(1)) if m else normalize_name(base)
    rest = (m.group(2) if m else "").strip()
    vm = re.match(r"^(==|>=|<=|~=|!=|<|>|===)\s*([^\s,]+)", rest)
    if vm and vm.group(1) == "==":
        version = vm.group(2)
    else:
        version = ""
    return name, version, extras


def parse_poetry_lock(path: Path, direct_names: set[str]) -> list[ResolvedPackage]:
    """Parsea poetry.lock vr>=2. Devuelve todos los paquetes resueltos."""
    if tomllib is None:
        raise DependencyAnalysisError("Se requiere Python 3.11+ para leer poetry.lock")
    with path.open("rb") as fh:
        doc = tomllib.load(fh)

    packages: dict[str, ResolvedPackage] = {}
    for pkg in doc.get("package", []) or []:
        name = normalize_name(pkg.get("name", ""))
        version = str(pkg.get("version", ""))
        category = pkg.get("category", "main")
        optional = pkg.get("optional", False)
        deps = list((pkg.get("dependencies", {}) or {}).keys())
        p = ResolvedPackage(
            name=name,
            version=version,
            is_direct=name in direct_names,
            is_dev=(category == "dev" or optional),
            category="dev" if (category == "dev" or optional) else "main",
            source="poetry.lock",
            dependencies=[normalize_name(d) for d in deps],
        )
        # Las dependencias de Python se ignoran en el grafo
        p.dependencies = [d for d in p.dependencies if d != "python"]
        packages[name] = p
    return list(packages.values())


def parse_pipfile_lock(path: Path, direct_names: set[str]) -> list[ResolvedPackage]:
    """Parsea Pipfile.lock con grafo de dependencias."""
    try:
        doc = json.loads(path.read_text(encoding="utf-8", errors="ignore"))
    except json.JSONDecodeError as exc:
        raise DependencyAnalysisError("No se pudo leer Pipfile.lock como JSON valido") from exc

    packages: dict[str, ResolvedPackage] = {}
    for category in ("default", "develop"):
        is_dev = category == "develop"
        for name, meta in (doc.get(category, {}) or {}).items():
            normalized = normalize_name(name)
            if isinstance(meta, dict):
                version = str(meta.get("version", "")).lstrip("==")
            else:
                version = ""
            deps = list(meta.get("dependencies", {}).keys()) if isinstance(meta, dict) else []
            packages[normalized] = ResolvedPackage(
                name=normalized,
                version=version,
                is_direct=normalized in direct_names,
                is_dev=is_dev,
                category="dev" if is_dev else "main",
                source="Pipfile.lock",
                dependencies=[normalize_name(d) for d in deps],
            )
    return list(packages.values())


def parse_csproj(content: bytes, source_name: str = "project.csproj") -> list[ResolvedPackage]:
    """Parsea dependencias directas (PackageReference) de archivos .csproj."""
    import xml.etree.ElementTree as ET
    result: list[ResolvedPackage] = []
    try:
        root = ET.fromstring(content)
        for elem in root.iter("PackageReference"):
            name = elem.get("Include") or elem.get("Update")
            version = elem.get("Version")
            if name and version:
                result.append(ResolvedPackage(
                    name=name, version=version, is_direct=True,
                    source=source_name, ecosystem="NuGet"
                ))
    except ET.ParseError:
        pass
    return result


def parse_packages_lock_json(path: Path) -> list[ResolvedPackage]:
    """Parsea packages.lock.json de NuGet."""
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return []
        
    packages: dict[str, ResolvedPackage] = {}
    deps_section = data.get("dependencies", {})
    
    for tfm, packages_dict in deps_section.items():
        if not isinstance(packages_dict, dict):
            continue
        for name, meta in packages_dict.items():
            if not isinstance(meta, dict):
                continue
                
            resolved = str(meta.get("resolved", ""))
            dep_type = meta.get("type", "Direct")
            is_direct = (dep_type == "Direct")
            pkg_deps = list(meta.get("dependencies", {}).keys())
            
            packages[name] = ResolvedPackage(
                name=name,
                version=resolved,
                is_direct=is_direct,
                is_dev=False,
                category="main",
                source="packages.lock.json",
                ecosystem="NuGet",
                dependencies=pkg_deps,
            )
            
    return list(packages.values())


def _resolve_depths(packages: list[ResolvedPackage]) -> tuple[list[ResolvedPackage], list[tuple[str, str]]]:
    """Calcula profundidad (BFS) y aristas del grafo de dependencias."""
    index = {p.name: p for p in packages}
    edges: list[tuple[str, str]] = []
    for p in packages:
        for dname in p.dependencies:
            if dname in index:
                edges.append((p.name, dname))

    for p in packages:
        p.depth = 0 if p.is_direct else -1

    changed = True
    while changed:
        changed = False
        for src, dst in edges:
            src_p = index.get(src)
            dst_p = index.get(dst)
            if dst_p is None or src_p is None:
                continue
            base = src_p.depth
            if base < 0:
                continue
            nd = base + 1
            if dst_p.depth == -1 or nd < dst_p.depth:
                dst_p.depth = nd
                changed = True

    # Paquetes no alcanzables: se consideran transitivas con profundidad alta.
    max_depth = max((p.depth for p in packages if p.depth >= 0), default=0)
    for p in packages:
        if p.depth == -1:
            p.depth = max_depth + 1
            p.is_direct = False
    return packages, edges


def parse_composer_lock(path: Path) -> list[ResolvedPackage]:
    """Parsea composer.lock de PHP."""
    try:
        data = json.loads(path.read_text(encoding="utf-8", errors="ignore"))
    except json.JSONDecodeError:
        return []

    packages_dict: dict[str, ResolvedPackage] = {}
    
    # dependencies in composer.lock are found in "packages" and "packages-dev"
    for category_key, is_dev in [("packages", False), ("packages-dev", True)]:
        if category_key in data:
            for pkg in data[category_key]:
                if not isinstance(pkg, dict):
                    continue
                name = pkg.get("name", "")
                if not name:
                    continue
                version = pkg.get("version", "").lstrip("v")
                deps = list(pkg.get("require", {}).keys())
                
                packages_dict[name] = ResolvedPackage(
                    name=name, version=version, is_direct=True, is_dev=is_dev, # Direct cannot easily be determined without composer.json
                    category="dev" if is_dev else "main", source=str(path.name),
                    ecosystem="Packagist", dependencies=deps
                )

    return list(packages_dict.values())


def parse_package_lock_json(path: Path) -> list[ResolvedPackage]:
    """Parsea package-lock.json de npm."""
    try:
        data = json.loads(path.read_text(encoding="utf-8", errors="ignore"))
    except json.JSONDecodeError:
        return []

    packages_dict: dict[str, ResolvedPackage] = {}
    
    if "packages" in data:
        for pkg_path, meta in data["packages"].items():
            if not pkg_path or not isinstance(meta, dict):
                continue
                
            name = pkg_path.split("node_modules/")[-1]
            version = meta.get("version", "")
            is_dev = meta.get("dev", False)
            deps = list(meta.get("dependencies", {}).keys())
            
            root_meta = data["packages"].get("")
            is_direct = False
            if root_meta:
                root_deps = list(root_meta.get("dependencies", {}).keys()) + list(root_meta.get("devDependencies", {}).keys())
                if name in root_deps:
                    is_direct = True

            packages_dict[name] = ResolvedPackage(
                name=name, version=version, is_direct=is_direct, is_dev=is_dev,
                category="dev" if is_dev else "main", source=str(path.name),
                ecosystem="npm", dependencies=deps
            )
    elif "dependencies" in data:
        for name, meta in data["dependencies"].items():
            if not isinstance(meta, dict):
                continue
            version = meta.get("version", "")
            is_dev = meta.get("dev", False)
            deps = list(meta.get("requires", {}).keys())
            packages_dict[name] = ResolvedPackage(
                name=name, version=version, is_direct=True, is_dev=is_dev,
                category="dev" if is_dev else "main", source=str(path.name),
                ecosystem="npm", dependencies=deps
            )

    return list(packages_dict.values())


SKIP_DIRS = {"node_modules", ".venv", "venv", ".git", "__pycache__", ".tox", ".mypy_cache"}


def _safe_rglob(root: Path, pattern: str):
    """Busca archivos recursivamente sin entrar en directorios pesados (node_modules, .venv, etc.)."""
    suffix = pattern[1:] if pattern.startswith("*") else None
    for dirpath, dirnames, filenames in os.walk(root):
        # Excluir directorios pesados in-place para que walk no los traverse
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fname in filenames:
            if fname == pattern or (suffix and fname.endswith(suffix)):
                yield Path(dirpath) / fname


def analyze_project_dir(project_path: str) -> tuple[list[ResolvedPackage], list[tuple[str, str]]]:
    """Analiza un directorio de forma recursiva y devuelve (paquetes resueltos, aristas del grafo)."""
    root = Path(project_path)
    if not root.exists() or not root.is_dir():
        raise DependencyAnalysisError(f"El directorio del proyecto no existe: {project_path}")

    direct_only: list[ResolvedPackage] = []
    lock_packages: list[ResolvedPackage] = []
    manifest_found = False

    # 1. Dependencias directas (requirements.txt, pyproject.toml, Pipfile, .csproj)
    for req_file in _safe_rglob(root, "requirements.txt"):
        manifest_found = True
        direct_only.extend(parse_requirements(req_file.read_text(encoding="utf-8", errors="ignore").splitlines()))

    for pyproject in _safe_rglob(root, "pyproject.toml"):
        manifest_found = True
        direct_only.extend(parse_pyproject(pyproject.read_bytes(), source_name=pyproject.name))

    for pipfile in _safe_rglob(root, "Pipfile"):
        manifest_found = True
        try:
            doc = tomllib.loads(pipfile.read_text(encoding="utf-8", errors="ignore"))
            for kind in ("packages", "dev-packages"):
                is_dev = kind == "dev-packages"
                for name in (doc.get(kind, {}) or {}).keys():
                    n = normalize_name(name)
                    direct_only.append(ResolvedPackage(name=n, version="", is_direct=True, is_dev=is_dev, category="dev" if is_dev else "main", source=pipfile.name))
        except Exception:
            pass

    for csproj_file in _safe_rglob(root, "*.csproj"):
        manifest_found = True
        direct_only.extend(parse_csproj(csproj_file.read_bytes(), source_name=csproj_file.name))

    # 2. Lockfiles (poetry.lock, Pipfile.lock, packages.lock.json, package-lock.json)
    direct_names = {normalize_name(p.name) for p in direct_only}

    for lock in _safe_rglob(root, "poetry.lock"):
        manifest_found = True
        lock_packages.extend(parse_poetry_lock(lock, direct_names))

    for lock in _safe_rglob(root, "Pipfile.lock"):
        manifest_found = True
        lock_packages.extend(parse_pipfile_lock(lock, direct_names))

    for lock in _safe_rglob(root, "packages.lock.json"):
        manifest_found = True
        lock_packages.extend(parse_packages_lock_json(lock))

    for lock in _safe_rglob(root, "package-lock.json"):
        manifest_found = True
        lock_packages.extend(parse_package_lock_json(lock))

    for lock in _safe_rglob(root, "composer.lock"):
        manifest_found = True
        lock_packages.extend(parse_composer_lock(lock))

    if not manifest_found:
        raise DependencyAnalysisError(
            "No se encontraron archivos de dependencias en el proyecto. "
            "Formatos soportados: requirements.txt, pyproject.toml, Pipfile (Python), "
            "package-lock.json (JavaScript/Node.js), *.csproj, packages.lock.json (.NET), "
            "composer.lock (PHP)."
        )

    # 3. Combinar paquetes (deduplicar por nombre)
    by_name: dict[str, ResolvedPackage] = {}
    for p in lock_packages:
        existing = by_name.get(p.name)
        if existing is None:
            by_name[p.name] = p
    for d in direct_only:
        resolved = by_name.get(d.name)
        if resolved:
            resolved.is_direct = True
            if d.is_dev:
                resolved.is_dev = True
                resolved.category = "dev"
        else:
            by_name[d.name] = d

    packages, edges = _resolve_depths(list(by_name.values()))
    return packages, edges

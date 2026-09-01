"""Pruebas del analizador de dependencias."""
import json
from pathlib import Path

import pytest

from app.services.dependency_analyzer import (
    analyze_project_dir,
    parse_pipfile_lock,
    parse_poetry_lock,
    parse_pyproject,
    parse_requirements,
)


def test_parse_requirements_basic():
    lines = [
        "# comentario",
        "-r requirements-base.txt",
        "Flask==2.2.3",
        "requests>=2.20",
        "numpy[ml]==1.21.0",
        "pandas; python_version >= '3.8'",
        "-e .",
    ]
    pkgs = parse_requirements(lines)
    by_name = {p.name: p for p in pkgs}
    assert set(by_name.keys()) == {"flask", "requests", "numpy", "pandas"}
    assert by_name["flask"].version == "2.2.3"
    assert by_name["requests"].version == ""  # constraint no exacta
    assert by_name["numpy"].version == "1.21.0"
    assert all(p.is_direct for p in pkgs)


def test_parse_pyproject_pep621_and_poetry(tmp_path):
    content = b"""
[project]
name = "demo"
dependencies = ["fastapi==0.100.0", "uvicorn[standard]>=0.23"]

[project.optional-dependencies]
dev = ["pytest==7.4.0"]

[tool.poetry.dependencies]
flask = "2.2.3"

[tool.poetry.group.dev.dependencies]
black = "23.1.0"
"""
    pkgs = parse_pyproject(content)
    by_name = {p.name: p for p in pkgs}
    assert by_name["fastapi"].version == "0.100.0"
    assert by_name["pytest"].version == "7.4.0"
    assert by_name["flask"].version == "2.2.3"
    assert by_name["black"].is_dev is True


def test_parse_poetry_lock_grafo(tmp_path):
    lock = tmp_path / "poetry.lock"
    lock.write_text(
        """
[[package]]
name = "requests"
version = "2.20.0"
category = "main"
optional = false
python-versions = ">=2.7"
dependencies = { urllib3 = "*" }

[[package]]
name = "urllib3"
version = "1.24.0"
category = "main"
optional = false
python-versions = ">=2.7"

[[package]]
name = "black"
version = "23.1.0"
category = "dev"
optional = false
python-versions = ">=3.8"
""",
        encoding="utf-8",
    )
    pkgs = parse_poetry_lock(lock, direct_names={"requests"})
    by_name = {p.name: p for p in pkgs}
    assert by_name["requests"].is_direct is True
    assert by_name["urllib3"].is_direct is False
    assert by_name["urllib3"].is_dev is False
    assert by_name["black"].is_dev is True


def test_analyze_project_dir_orquesta(tmp_path):
    (tmp_path / "requirements.txt").write_text("requests==2.20.0\n", encoding="utf-8")
    packages, edges = analyze_project_dir(str(tmp_path))
    assert len(packages) == 1
    assert packages[0].name == "requests"
    assert packages[0].version == "2.20.0"


def test_analyze_project_dir_con_lockfile(tmp_path):
    (tmp_path / "requirements.txt").write_text("requests==2.20.0\n", encoding="utf-8")
    (tmp_path / "poetry.lock").write_text(
        """
[[package]]
name = "requests"
version = "2.20.0"
category = "main"
optional = false
dependencies = { urllib3 = "*" }

[[package]]
name = "urllib3"
version = "1.24.0"
category = "main"
optional = false
""",
        encoding="utf-8",
    )
    packages, edges = analyze_project_dir(str(tmp_path))
    by_name = {p.name: p for p in packages}
    assert by_name["requests"].is_direct is True
    assert by_name["urllib3"].is_direct is False
    assert by_name["urllib3"].depth == 1
    assert ("requests", "urllib3") in edges


def test_analyze_project_dir_sin_manifiestos(tmp_path):
    with pytest.raises(Exception):
        analyze_project_dir(str(tmp_path / "no_existe"))
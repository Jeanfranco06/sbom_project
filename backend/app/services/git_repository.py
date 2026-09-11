"""Clonado seguro y trazable de repositorios Git."""
from __future__ import annotations

import base64
import os
import re
import shutil
import subprocess
import uuid
from pathlib import Path
from urllib.parse import urlparse


class GitRepositoryError(RuntimeError):
    """Error controlado al validar, clonar o inspeccionar un repositorio."""


def validate_git_url(url: str) -> str:
    value = url.strip()
    parsed = urlparse(value)
    is_https = parsed.scheme == "https" and bool(parsed.hostname)
    is_ssh = value.startswith("git@github.com:")
    if not (is_https or is_ssh):
        raise GitRepositoryError("La URL Git debe usar HTTPS o SSH (git@host:owner/repo.git)")
    if is_https and parsed.hostname not in {"github.com", "www.github.com"}:
        raise GitRepositoryError("Solo se admiten repositorios de GitHub")
    if parsed.username or parsed.password:
        raise GitRepositoryError("No incluyas credenciales en la URL; usa GITHUB_TOKEN o SSH")
    if any(char in value for char in ("\r", "\n", "\x00")):
        raise GitRepositoryError("La URL Git contiene caracteres no validos")
    return value


def _validate_ref(ref: str | None) -> str | None:
    if ref is None:
        return None
    value = ref.strip()
    if not value or len(value) > 255 or re.search(r"[\x00-\x1f\x7f]", value):
        raise GitRepositoryError("La rama, tag o commit indicado no es valido")
    return value


def _git_environment(token: str | None) -> dict[str, str]:
    env = os.environ.copy()
    env["GIT_TERMINAL_PROMPT"] = "0"
    if token:
        credentials = base64.b64encode(f"x-access-token:{token}".encode()).decode()
        env["GIT_CONFIG_COUNT"] = "1"
        env["GIT_CONFIG_KEY_0"] = "http.https://github.com/.extraheader"
        env["GIT_CONFIG_VALUE_0"] = f"Authorization: basic {credentials}"
    return env


def clone_repository(
    url: str,
    destination: Path,
    ref: str | None = None,
    token: str | None = None,
) -> tuple[Path, str]:
    """Crea un checkout inmutable sin tocar ejecuciones anteriores."""
    normalized_url = validate_git_url(url)
    normalized_ref = _validate_ref(ref)
    checkout_root = destination.parent / f".{destination.name}-checkouts"
    checkout_root.mkdir(parents=True, exist_ok=True)
    checkout_id = uuid.uuid4().hex
    published = checkout_root / checkout_id
    staging = checkout_root / f".{checkout_id}.staging"
    command = ["git", "clone", "--depth", "1", "--no-tags", "--single-branch"]
    if normalized_ref:
        command.extend(["--branch", normalized_ref])
    command.extend([normalized_url, str(staging)])

    try:
        result = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
            timeout=900,
            env=_git_environment(token),
        )
        if result.returncode != 0:
            detail = (result.stderr or result.stdout).strip()[-2000:]
            raise GitRepositoryError(f"No se pudo clonar el repositorio: {detail}")

        commit = subprocess.run(
            ["git", "-C", str(staging), "rev-parse", "HEAD"],
            check=True,
            capture_output=True,
            text=True,
            timeout=30,
            env=_git_environment(token),
        ).stdout.strip()
        staging.replace(published)
        return published, commit
    except subprocess.TimeoutExpired as exc:
        raise GitRepositoryError("El clonado del repositorio excedio el tiempo limite") from exc
    except subprocess.CalledProcessError as exc:
        detail = (exc.stderr or exc.stdout or "").strip()[-2000:]
        raise GitRepositoryError(f"No se pudo obtener el commit del repositorio: {detail}") from exc
    except FileNotFoundError as exc:
        raise GitRepositoryError("Git no esta instalado o no esta disponible en el PATH") from exc
    finally:
        if staging.exists():
            shutil.rmtree(staging, ignore_errors=True)

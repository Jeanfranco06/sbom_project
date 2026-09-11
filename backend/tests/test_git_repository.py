from pathlib import Path
from types import SimpleNamespace

import pytest

from app.services import git_repository
from app.services.git_repository import GitRepositoryError, clone_repository, validate_git_url


def test_validate_github_https_url():
    assert validate_git_url("https://github.com/acme/project.git") == "https://github.com/acme/project.git"


def test_validate_git_url_rejects_non_github_https():
    with pytest.raises(GitRepositoryError, match="GitHub"):
        validate_git_url("https://gitlab.com/acme/project.git")


def test_validate_git_url_accepts_ssh():
    assert validate_git_url("git@github.com:acme/project.git").startswith("git@github.com:")


def test_clone_keeps_previous_checkout(monkeypatch, tmp_path):
    destination = tmp_path / "4"
    destination.mkdir()
    (destination / "old-file.txt").write_text("keep", encoding="utf-8")

    def fake_run(command, **kwargs):
        if command[0] == "git" and command[1] == "clone":
            Path(command[-1]).mkdir(parents=True)
            return SimpleNamespace(returncode=0, stdout="", stderr="")
        return SimpleNamespace(returncode=0, stdout="a" * 40 + "\n", stderr="")

    monkeypatch.setattr(git_repository.subprocess, "run", fake_run)
    checkout, commit = clone_repository("https://github.com/acme/project.git", destination)

    assert checkout.is_dir()
    assert commit == "a" * 40
    assert (destination / "old-file.txt").read_text(encoding="utf-8") == "keep"

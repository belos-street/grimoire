from __future__ import annotations

import os

from grimoire.fs import path_exists
from grimoire.generator import add_skill, add_skills
from grimoire.manifest import get_installed_status, read_manifest
from tests.helpers import link_target, write_skill


def setup_project(tmp_path, monkeypatch):
    skills_dir = tmp_path / "skills"
    target_dir = tmp_path / "project" / ".agents" / "skills"
    skills_dir.mkdir(parents=True)
    write_skill(skills_dir, "alpha")
    monkeypatch.setenv("GRIMOIRE_HOME", str(skills_dir))
    return skills_dir, target_dir


def test_copies_a_skill_and_records_it_in_the_manifest(tmp_path, monkeypatch):
    _, target_dir = setup_project(tmp_path, monkeypatch)

    [result] = add_skills(["alpha"], target_dir)

    assert result.status == "added"
    assert result.mode == "copy"
    assert path_exists(target_dir / "alpha" / "SKILL.md")

    entry = read_manifest(target_dir)["skills"]["alpha"]
    assert entry["mode"] == "copy"
    assert get_installed_status(target_dir, "alpha", entry) == "ok"


def test_skips_existing_skills_unless_force_is_used(tmp_path, monkeypatch):
    skills_dir, target_dir = setup_project(tmp_path, monkeypatch)
    add_skills(["alpha"], target_dir)

    [skipped] = add_skills(["alpha"], target_dir)
    assert skipped.status == "skipped"

    (skills_dir / "alpha" / "SKILL.md").write_text(
        "updated source", encoding="utf-8"
    )
    [updated] = add_skills(["alpha"], target_dir, force=True)
    assert updated.status == "updated"


def test_installs_symlinks_in_link_mode(tmp_path, monkeypatch):
    skills_dir, target_dir = setup_project(tmp_path, monkeypatch)

    [result] = add_skills(["alpha"], target_dir, link=True)

    assert result.mode == "link"
    installed = target_dir / "alpha"
    assert os.path.islink(installed)
    assert link_target(installed) == str(skills_dir / "alpha")

    assert read_manifest(target_dir)["skills"]["alpha"]["mode"] == "link"


def test_replaces_a_copy_with_a_symlink_when_forced(tmp_path, monkeypatch):
    _, target_dir = setup_project(tmp_path, monkeypatch)
    add_skills(["alpha"], target_dir)

    add_skills(["alpha"], target_dir, link=True, force=True)

    installed = target_dir / "alpha"
    assert os.path.islink(installed)
    assert read_manifest(target_dir)["skills"]["alpha"]["mode"] == "link"


def test_reports_unknown_skills_as_failed(tmp_path, monkeypatch):
    _, target_dir = setup_project(tmp_path, monkeypatch)

    [result] = add_skills(["missing"], target_dir)

    assert result.status == "failed"
    assert result.error == "Skill not found"


def test_add_skill_wraps_a_single_install(tmp_path, monkeypatch):
    _, target_dir = setup_project(tmp_path, monkeypatch)

    result = add_skill("alpha", target_dir)

    assert result.status == "added"
    assert result.skill_name == "alpha"

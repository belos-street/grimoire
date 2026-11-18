from __future__ import annotations

import os
import shutil

from grimoire.fs import copy_dir
from grimoire.manifest import (
    get_installed_status,
    hash_dir,
    list_untracked,
    read_manifest,
    write_manifest,
)
from tests.helpers import link_target


def copy_entry(source, digest: str) -> dict:
    return {
        "source": str(source),
        "mode": "copy",
        "entryFile": "SKILL.md",
        "installedAt": "1970-01-01T00:00:00.000Z",
        "hash": digest,
    }


def test_hash_is_stable_and_changes_with_content(tmp_path):
    (tmp_path / "SKILL.md").write_text("v1", encoding="utf-8")
    first = hash_dir(tmp_path)
    second = hash_dir(tmp_path)
    assert second == first

    (tmp_path / "SKILL.md").write_text("v2", encoding="utf-8")
    assert hash_dir(tmp_path) != first


def test_hash_ignores_ds_store(tmp_path):
    (tmp_path / "SKILL.md").write_text("v1", encoding="utf-8")
    before = hash_dir(tmp_path)
    (tmp_path / ".DS_Store").write_text("noise", encoding="utf-8")
    assert hash_dir(tmp_path) == before


def test_read_manifest_returns_empty_when_missing(tmp_path):
    assert read_manifest(tmp_path) == {"version": 1, "skills": {}}


def test_manifest_round_trips(tmp_path):
    manifest = {
        "version": 1,
        "skills": {"alpha": copy_entry("/source/alpha", "abc")},
    }

    write_manifest(tmp_path, manifest)
    assert read_manifest(tmp_path) == manifest


def test_lists_untracked_directories_only(tmp_path):
    manifest = {
        "version": 1,
        "skills": {"alpha": copy_entry("/source/alpha", "abc")},
    }

    (tmp_path / "alpha").mkdir(parents=True)
    (tmp_path / "custom").mkdir(parents=True)
    (tmp_path / ".hidden").mkdir(parents=True)
    (tmp_path / ".grimoire.json").write_text("{}", encoding="utf-8")

    assert list_untracked(tmp_path, manifest) == ["custom"]


def test_detects_ok_modified_outdated_and_missing_copies(tmp_path):
    source = tmp_path / "source" / "alpha"
    target = tmp_path / "target"
    source.mkdir(parents=True)
    (source / "SKILL.md").write_text("v1", encoding="utf-8")
    target.mkdir(parents=True)

    installed = target / "alpha"
    copy_dir(source, installed)
    entry = copy_entry(source, hash_dir(source))

    assert get_installed_status(target, "alpha", entry) == "ok"

    (installed / "SKILL.md").write_text("local edit", encoding="utf-8")
    assert get_installed_status(target, "alpha", entry) == "modified"

    copy_dir(source, installed)
    (source / "SKILL.md").write_text("v2", encoding="utf-8")
    assert get_installed_status(target, "alpha", entry) == "outdated"

    shutil.rmtree(installed)
    assert get_installed_status(target, "alpha", entry) == "missing"


def test_detects_ok_modified_and_broken_links(tmp_path):
    source = tmp_path / "source" / "alpha"
    target = tmp_path / "target"
    source.mkdir(parents=True)
    (source / "SKILL.md").write_text("v1", encoding="utf-8")
    target.mkdir(parents=True)

    installed = target / "alpha"
    os.symlink(source, installed, target_is_directory=True)
    entry = {
        "source": str(source),
        "mode": "link",
        "entryFile": "SKILL.md",
        "installedAt": "1970-01-01T00:00:00.000Z",
        "hash": hash_dir(source),
    }

    assert link_target(installed) == str(source)
    assert get_installed_status(target, "alpha", entry) == "ok"

    other = tmp_path / "other"
    other.mkdir(parents=True)
    os.unlink(installed)
    os.symlink(other, installed, target_is_directory=True)
    assert get_installed_status(target, "alpha", entry) == "modified"

    os.unlink(installed)
    os.symlink(tmp_path / "missing", installed, target_is_directory=True)
    assert get_installed_status(target, "alpha", entry) == "missing"

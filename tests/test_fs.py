from __future__ import annotations

import os

from tests.helpers import link_target

from grimoire.fs import (
    copy_dir,
    create_symlink,
    ensure_dir,
    path_exists,
    remove_path,
)


def test_copy_dir_copies_nested_files(tmp_path):
    source = tmp_path / "source"
    dest = tmp_path / "dest"
    (source / "nested").mkdir(parents=True)
    (source / "root.txt").write_text("root", encoding="utf-8")
    (source / "nested" / "child.txt").write_text("child", encoding="utf-8")

    copy_dir(source, dest)

    assert (dest / "root.txt").read_text(encoding="utf-8") == "root"
    assert (dest / "nested" / "child.txt").read_text(encoding="utf-8") == "child"


def test_ensure_dir_creates_nested_directories(tmp_path):
    directory = tmp_path / "a" / "b" / "c"
    ensure_dir(directory)
    assert directory.is_dir()


def test_create_symlink_points_at_the_source(tmp_path):
    source = tmp_path / "source"
    link = tmp_path / "links" / "source"
    source.mkdir(parents=True)
    (source / "file.txt").write_text("content", encoding="utf-8")

    create_symlink(source, link)

    assert os.path.islink(link)
    assert link_target(link) == str(source)
    assert (link / "file.txt").read_text(encoding="utf-8") == "content"


def test_remove_path_removes_a_symlink_without_deleting_its_target(tmp_path):
    source = tmp_path / "source"
    link = tmp_path / "link"
    source.mkdir(parents=True)
    (source / "file.txt").write_text("content", encoding="utf-8")
    os.symlink(source, link, target_is_directory=True)

    remove_path(link)

    assert not path_exists(link)
    assert (source / "file.txt").read_text(encoding="utf-8") == "content"


def test_remove_path_removes_directories_and_ignores_missing_paths(tmp_path):
    directory = tmp_path / "dir"
    nested = directory / "nested"
    nested.mkdir(parents=True)
    (nested / "file.txt").write_text("content", encoding="utf-8")

    remove_path(directory)
    assert not path_exists(directory)

    remove_path(tmp_path / "missing")

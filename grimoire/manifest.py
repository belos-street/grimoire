from __future__ import annotations

import hashlib
import json
import os
import stat
from pathlib import Path
from typing import Any, Literal

InstallMode = Literal["copy", "link"]
SkillStatus = Literal["ok", "outdated", "modified", "missing"]

MANIFEST_FILE = ".grimoire.json"


def manifest_path(target_dir: str | Path) -> Path:
    return Path(target_dir) / MANIFEST_FILE


def read_manifest(target_dir: str | Path) -> dict[str, Any]:
    try:
        raw = manifest_path(target_dir).read_text(encoding="utf-8")
        parsed = json.loads(raw)
        if not isinstance(parsed, dict):
            raise ValueError("manifest must be an object")
        return {"version": 1, "skills": parsed.get("skills") or {}}
    except (OSError, ValueError):
        return {"version": 1, "skills": {}}


def write_manifest(target_dir: str | Path, manifest: dict[str, Any]) -> None:
    target = manifest_path(target_dir)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def _entry_sort_key(path: Path) -> tuple[str, str]:
    return (path.name.casefold(), path.name)


def _relative(path: Path, base: Path) -> str:
    return path.relative_to(base).as_posix()


def hash_dir(directory: str | Path) -> str:
    digest = hashlib.sha256()
    _hash_entries(digest, Path(directory), Path(directory))
    return digest.hexdigest()


def _hash_entries(digest: Any, directory: Path, base: Path) -> None:
    try:
        entries = sorted(directory.iterdir(), key=_entry_sort_key)
    except OSError:
        digest.update(f"missing:{_relative(directory, base)}\n".encode())
        return

    for entry in entries:
        if entry.name == ".DS_Store":
            continue

        rel_path = _relative(entry, base)

        if entry.is_symlink():
            try:
                target = os.readlink(entry)
            except OSError:
                target = ""
            digest.update(f"link:{rel_path}:{target}\n".encode())
        elif entry.is_dir():
            digest.update(f"dir:{rel_path}\n".encode())
            _hash_entries(digest, entry, base)
        else:
            try:
                content = entry.read_bytes()
            except OSError:
                digest.update(f"unreadable:{rel_path}\n".encode())
                continue
            digest.update(f"file:{rel_path}:".encode())
            digest.update(content)
            digest.update(b"\n")


def get_installed_status(
    target_dir: str | Path, name: str, entry: dict[str, Any]
) -> SkillStatus:
    installed = Path(target_dir) / name

    try:
        stats = os.lstat(installed)
    except OSError:
        return "missing"

    if entry.get("mode") == "link":
        if not stat.S_ISLNK(stats.st_mode):
            return "modified"
        try:
            installed.stat()
        except OSError:
            return "missing"
        try:
            link_target = os.readlink(installed)
        except OSError:
            link_target = ""
        return "ok" if _same_target(link_target, entry.get("source", "")) else "modified"

    if not stat.S_ISDIR(stats.st_mode):
        return "modified"

    if hash_dir(installed) != entry.get("hash"):
        return "modified"

    source = entry.get("source", "")
    if not source or not Path(source).is_dir():
        return "outdated"

    if hash_dir(source) != entry.get("hash"):
        return "outdated"

    return "ok"


def strip_extended_prefix(path: str) -> str:
    """Drop the Windows ``\\\\?\\`` / ``\\\\?\\UNC\\`` prefix from a path."""
    if path.startswith("\\\\?\\UNC\\"):
        return "\\\\" + path[len("\\\\?\\UNC\\") :]
    if path.startswith("\\\\?\\"):
        return path[len("\\\\?\\") :]
    return path


def _same_target(left: str, right: str) -> bool:
    return os.path.normcase(strip_extended_prefix(left)) == os.path.normcase(
        strip_extended_prefix(right)
    )


def list_untracked(
    target_dir: str | Path, manifest: dict[str, Any]
) -> list[str]:
    try:
        entries = list(Path(target_dir).iterdir())
    except OSError:
        return []

    tracked = manifest.get("skills") or {}
    names = [
        entry.name
        for entry in entries
        if entry.name != MANIFEST_FILE
        and not entry.name.startswith(".")
        and (entry.is_symlink() or entry.is_dir())
        and entry.name not in tracked
    ]
    return sorted(names, key=lambda name: (name.casefold(), name))

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .fs import copy_dir, create_symlink, ensure_dir, path_exists, remove_path
from .manifest import InstallMode, hash_dir, read_manifest, write_manifest
from .skill import get_skill_by_name


@dataclass
class AddResult:
    skill_name: str
    status: str
    path: str | None = None
    entry_file: str | None = None
    description: str | None = None
    mode: InstallMode | None = None
    reason: str | None = None
    error: str | None = None

    def to_dict(self) -> dict[str, Any]:
        data: dict[str, Any] = {
            "skillName": self.skill_name,
            "status": self.status,
        }
        for attribute, key in (
            ("path", "path"),
            ("entry_file", "entryFile"),
            ("description", "description"),
            ("mode", "mode"),
            ("reason", "reason"),
            ("error", "error"),
        ):
            value = getattr(self, attribute)
            if value is not None:
                data[key] = value
        return data


def _now() -> str:
    return (
        datetime.now(timezone.utc)
        .isoformat(timespec="milliseconds")
        .replace("+00:00", "Z")
    )


def add_skills(
    skills: list[str],
    target_dir: str | Path,
    force: bool = False,
    link: bool = False,
) -> list[AddResult]:
    target = Path(target_dir)
    manifest = read_manifest(target)
    results: list[AddResult] = []
    manifest_changed = False

    for skill_name in skills:
        skill = get_skill_by_name(skill_name)

        if skill is None:
            results.append(
                AddResult(
                    skill_name=skill_name,
                    status="failed",
                    error="Skill not found",
                )
            )
            continue

        dest_path = target / skill.name
        exists = path_exists(dest_path)
        mode: InstallMode = "link" if link else "copy"

        if exists and not force:
            results.append(
                AddResult(
                    skill_name=skill.name,
                    status="skipped",
                    path=str(dest_path),
                    entry_file=skill.entry_file,
                    description=skill.description,
                    mode=mode,
                )
            )
            continue

        try:
            ensure_dir(target)
            if exists:
                remove_path(dest_path)
            if link:
                create_symlink(skill.path, dest_path)
            else:
                copy_dir(skill.path, dest_path)

            manifest["skills"][skill.name] = {
                "source": str(skill.path),
                "mode": mode,
                "entryFile": skill.entry_file,
                "installedAt": _now(),
                "hash": hash_dir(skill.path),
            }
            manifest_changed = True

            results.append(
                AddResult(
                    skill_name=skill.name,
                    status="updated" if exists else "added",
                    path=str(dest_path),
                    entry_file=skill.entry_file,
                    description=skill.description,
                    mode=mode,
                )
            )
        except OSError as error:
            results.append(
                AddResult(
                    skill_name=skill.name,
                    status="failed",
                    error=str(error),
                )
            )

    if manifest_changed:
        write_manifest(target, manifest)

    return results


def add_skill(
    skill_name: str,
    target_dir: str | Path,
    force: bool = False,
    link: bool = False,
) -> AddResult:
    results = add_skills([skill_name], target_dir, force=force, link=link)
    return results[0] if results else AddResult(
        skill_name=skill_name,
        status="failed",
        error="Unknown error",
    )

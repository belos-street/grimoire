from __future__ import annotations

import os
from pathlib import Path

from grimoire.manifest import strip_extended_prefix


def link_target(path: str | Path) -> str:
    return strip_extended_prefix(os.readlink(path))


def write_skill(
    skills_dir: str | Path,
    dir_name: str,
    *,
    entry_file: str = "SKILL.md",
    name: str | None = None,
    description: str | None = None,
    body: str = "",
    reference_dir: str | None = "references",
    references: dict[str, str] | None = None,
) -> Path:
    skill_dir = Path(skills_dir) / dir_name
    skill_dir.mkdir(parents=True, exist_ok=True)

    skill_name = name or dir_name
    skill_description = description or (
        f"{dir_name} skill used by unit tests with a sufficiently long description."
    )

    content = "\n".join(
        [
            "---",
            f"name: {skill_name}",
            f"description: {skill_description}",
            "---",
            "",
            f"# {dir_name}",
            "",
            body,
        ]
    )
    (skill_dir / entry_file).write_text(content, encoding="utf-8")

    if reference_dir is not None:
        target_dir = skill_dir / reference_dir
        target_dir.mkdir(parents=True, exist_ok=True)
        for file_name, file_content in (
            references or {"topic.md": "# Topic\n"}
        ).items():
            (target_dir / file_name).write_text(file_content, encoding="utf-8")

    return skill_dir

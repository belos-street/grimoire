from __future__ import annotations

import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path

REFERENCE_DIRS = ["references", "reference", "rules"]
MULTILINE_KEYS = {"description", "title", "when_to_use", "summary"}

_FRONTMATTER = re.compile(r"^---\r?\n(.*?)\r?\n---", re.S)
_QUOTED = re.compile(r"^[\"'](.*)[\"']$")
_INDENTED = re.compile(r"^\s+")
_ENTRY_FILE = re.compile(r"^skill\.md$", re.I)


@dataclass
class Skill:
    name: str
    description: str
    path: Path
    entry_file: str
    reference_count: int
    frontmatter: dict[str, str]


def parse_frontmatter(content: str) -> dict[str, str]:
    match = _FRONTMATTER.match(content)
    if not match:
        return {}

    frontmatter: dict[str, str] = {}
    lines = match.group(1).splitlines()
    index = 0

    while index < len(lines):
        line = lines[index]
        colon = line.find(":")
        if colon == -1:
            index += 1
            continue

        key = line[:colon].strip()
        if not key:
            index += 1
            continue

        raw_value = line[colon + 1 :].strip()
        quoted = _QUOTED.match(raw_value)
        value = quoted.group(1) if quoted else raw_value

        if not value and key in MULTILINE_KEYS:
            collected: list[str] = []
            next_index = index + 1

            while next_index < len(lines):
                next_line = lines[next_index]
                if not next_line.strip() or not _INDENTED.match(next_line):
                    break
                collected.append(next_line.strip())
                next_index += 1

            if collected:
                value = " ".join(collected)
                index = next_index - 1

        if value:
            frontmatter[key] = value

        index += 1

    return frontmatter


def get_skills_dir() -> Path:
    package_dir = Path(__file__).resolve().parent
    source_dir = package_dir.parent / "skills"

    candidates: list[str] = [
        os.environ.get("GRIMOIRE_HOME", ""),
        str(source_dir),
        str(package_dir / "skills"),
        str(Path.cwd() / "skills"),
    ]

    for candidate in candidates:
        if candidate and Path(candidate).is_dir():
            return Path(candidate).resolve()

    return source_dir


def _entry_file(files: list[Path]) -> Path | None:
    for file in sorted(files, key=lambda item: (item.name.casefold(), item.name)):
        if _ENTRY_FILE.match(file.name):
            return file
    return None


def _count_references(skill_path: Path) -> int:
    for dir_name in REFERENCE_DIRS:
        reference_dir = skill_path / dir_name
        if not reference_dir.is_dir():
            continue
        return len([entry for entry in reference_dir.iterdir() if entry.name.endswith(".md")])
    return 0


def _read_skill(skill_path: Path) -> Skill:
    entry_path: Path | None = None
    description = ""
    frontmatter: dict[str, str] = {}

    try:
        files = [entry for entry in skill_path.iterdir() if entry.is_file()]
        entry_path = _entry_file(files)
        if entry_path is not None:
            content = entry_path.read_text(encoding="utf-8")
            frontmatter = parse_frontmatter(content)
            description = frontmatter.get("description", "")
            if not description:
                fallback = re.search(r"description:\s*(.+)", content)
                description = fallback.group(1).strip() if fallback else ""
    except OSError:
        description = ""
        frontmatter = {}

    return Skill(
        name=skill_path.name,
        description=description,
        path=skill_path,
        entry_file=entry_path.name if entry_path else "SKILL.md",
        reference_count=_count_references(skill_path),
        frontmatter=frontmatter,
    )


def get_all_skills() -> list[Skill]:
    skills_dir = get_skills_dir()

    try:
        entries = sorted(
            (entry for entry in skills_dir.iterdir() if entry.is_dir()),
            key=lambda entry: (entry.name.casefold(), entry.name),
        )
    except OSError as error:
        print(f"Error reading skills directory: {error}", file=sys.stderr)
        return []

    return [_read_skill(entry) for entry in entries]


def get_skill_by_name(name: str) -> Skill | None:
    for skill in get_all_skills():
        if skill.name == name:
            return skill
    return None

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .skill import REFERENCE_DIRS, Skill, get_all_skills

_CODE_BLOCK = re.compile(r"```.*?```", re.S)
_LINK = re.compile(r"\]\(([^)]+)\)")
_REMOTE_LINK = re.compile(r"^(https?:|mailto:|#)", re.I)
_ENTRY_FILE = re.compile(r"^skill\.md$", re.I)


@dataclass
class LintResult:
    name: str
    errors: list[str]
    warnings: list[str]

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "errors": self.errors,
            "warnings": self.warnings,
        }


def lint_skills(names: list[str] | None = None) -> list[LintResult]:
    skills = get_all_skills()

    if not names:
        return [lint_skill(skill) for skill in skills]

    results: list[LintResult] = []
    for name in names:
        skill = next((item for item in skills if item.name == name), None)
        if skill is None:
            results.append(
                LintResult(name=name, errors=[f'Skill "{name}" 不存在'], warnings=[])
            )
        else:
            results.append(lint_skill(skill))
    return results


def lint_skill(skill: Skill) -> LintResult:
    errors: list[str] = []
    warnings: list[str] = []
    entry_path = skill.path / skill.entry_file

    try:
        content = entry_path.read_text(encoding="utf-8")
    except OSError:
        errors.append(f"缺少主文件 {skill.entry_file}")
        return LintResult(name=skill.name, errors=errors, warnings=warnings)

    name = skill.frontmatter.get("name", "")
    description = skill.frontmatter.get("description", "")

    if not name:
        errors.append("frontmatter 缺少 name")
    elif name != skill.name:
        errors.append(f'frontmatter name "{name}" 与目录名不一致')

    if not description:
        errors.append("frontmatter 缺少 description")
    elif len(description) < 30:
        warnings.append("description 过短，建议写清使用场景与触发词")

    if not _has_reference_dir(skill.path) and not _has_nested_skills(skill.path):
        warnings.append("缺少 references/（或 reference/、rules/）目录")

    for link in _extract_markdown_links(content):
        if _REMOTE_LINK.match(link):
            continue

        raw_path = link.split("#")[0]
        if not raw_path or not raw_path.lower().endswith(".md"):
            continue

        try:
            os.stat(entry_path.parent / raw_path)
        except OSError:
            warnings.append(f"链接失效: {link}")

    return LintResult(name=skill.name, errors=errors, warnings=warnings)


def _has_reference_dir(skill_path: Path) -> bool:
    return any((skill_path / dir_name).is_dir() for dir_name in REFERENCE_DIRS)


def _has_nested_skills(skill_path: Path) -> bool:
    try:
        children = [entry for entry in skill_path.iterdir() if entry.is_dir()]
    except OSError:
        return False

    for child in children:
        try:
            if any(_ENTRY_FILE.match(entry.name) for entry in child.iterdir()):
                return True
        except OSError:
            continue

    return False


def _extract_markdown_links(content: str) -> list[str]:
    without_code_blocks = _CODE_BLOCK.sub("", content)
    links: dict[str, None] = {}

    for match in _LINK.finditer(without_code_blocks):
        link = match.group(1).strip()
        if link:
            links[link] = None

    return list(links)

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

from ..generator import AddResult
from ..logger import green, magenta, red, yellow

DEFAULT_TARGET = ".agents/skills"


def resolve_target(to: str = DEFAULT_TARGET) -> Path:
    return (Path.cwd() / to).resolve()


def print_json(value: Any) -> None:
    print(json.dumps(value, indent=2, ensure_ascii=False))


def parse_tags(raw: str | None) -> list[str]:
    if not raw:
        return []

    cleaned = re.sub(r"^\[|\]$", "", raw)
    tags = []
    for tag in cleaned.split(","):
        value = re.sub(r"^[\"']|[\"']$", "", tag.strip())
        if value:
            tags.append(value)
    return tags


def format_status(status: str) -> str:
    colors = {
        "ok": green,
        "outdated": yellow,
        "modified": magenta,
        "missing": red,
    }
    color = colors.get(status)
    return color(status) if color else str(status)


def skill_link(result: AddResult) -> str:
    if not result.path or not result.entry_file:
        return result.skill_name

    target = Path(result.path) / result.entry_file
    try:
        link = Path(os.path.relpath(target, Path.cwd())).as_posix()
    except ValueError:
        link = target.as_posix()

    return f"[{result.skill_name}]({link})"


def table_cell(text: str | None) -> str:
    if not text:
        return "-"

    clean = re.sub(r"\s+", " ", text).replace("|", "\\|")
    return f"{clean[:77]}…" if len(clean) > 80 else clean

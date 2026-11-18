from __future__ import annotations

from argparse import Namespace

from ..generator import add_skills
from ..logger import dim, error, info, success, warn
from ..skill import get_all_skills
from .shared import print_json, resolve_target, skill_link, table_cell


def _prompt_skills() -> list[str]:
    skills = get_all_skills()
    if not skills:
        warn("No skills found")
        return []

    print("Choose skills:")
    for index, skill in enumerate(skills, start=1):
        suffix = f" - {skill.description}" if skill.description else ""
        print(f"  {index}. {skill.name}{suffix}")

    try:
        raw = input("Enter numbers separated by commas (empty to cancel): ").strip()
    except (EOFError, KeyboardInterrupt):
        print()
        return []

    if not raw:
        return []

    selected: list[str] = []
    for part in raw.split(","):
        value = part.strip()
        if not value.isdigit():
            continue
        index = int(value) - 1
        if 0 <= index < len(skills) and skills[index].name not in selected:
            selected.append(skills[index].name)
    return selected


def run_add(args: Namespace) -> int:
    target_dir = resolve_target(args.to)
    selected = list(args.skills or [])

    if not selected:
        if args.json:
            print_json(
                {
                    "ok": False,
                    "error": "No skills specified. Usage: grimoire add <skill...> --json",
                }
            )
            return 1

        selected = _prompt_skills()
        if not selected:
            warn("No skills selected")
            return 0

    results = add_skills(
        selected,
        target_dir,
        force=bool(args.force),
        link=bool(args.link),
    )

    if args.json:
        failed = any(result.status == "failed" for result in results)
        print_json(
            {
                "ok": not failed,
                "target": str(target_dir),
                "results": [result.to_dict() for result in results],
            }
        )
        return 1 if failed else 0

    for result in results:
        if result.status in ("added", "updated"):
            suffix = " (linked)" if result.mode == "link" else ""
            success(f"  {result.skill_name}: {result.status}{suffix}")
        elif result.status == "skipped":
            warn(
                f"  {result.skill_name}: already exists, skipped "
                "(use --force to overwrite)"
            )
        else:
            error(f"  {result.skill_name}: failed - {result.error}")

    changed = [
        result for result in results if result.status in ("added", "updated")
    ]
    if not changed:
        return 0

    print()
    success(f"Done! {len(changed)} skill(s) installed to {target_dir}")
    print()
    info("Add these rows to the skill table in AGENTS.md:")
    print()
    for result in changed:
        print(f"| {skill_link(result)} | {table_cell(result.description)} |")
    print()
    return 0

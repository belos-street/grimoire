from __future__ import annotations

from argparse import Namespace

from ..logger import bold_cyan, dim_text, error
from ..skill import get_skill_by_name


def run_info(args: Namespace) -> int:
    skill = get_skill_by_name(args.skill)

    if skill is None:
        error(f'Skill "{args.skill}" not found')
        return 0

    print(f"\n{bold_cyan(skill.name)}\n")

    if skill.description:
        print(dim_text("Description:"), skill.description)

    print(dim_text("Path:"), skill.path)
    print(dim_text("Entry:"), skill.entry_file)
    print(dim_text("References:"), skill.reference_count, "files")

    if skill.frontmatter:
        print(dim_text("\n--- Frontmatter ---"))
        for key, value in skill.frontmatter.items():
            print(dim_text(f"  {key}:"), value)

    print()
    return 0

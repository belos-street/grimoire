from __future__ import annotations

from argparse import Namespace

from ..logger import blue, dim_text, info, warn
from ..skill import get_all_skills
from .shared import parse_tags, print_json


def run_list(args: Namespace) -> int:
    skills = get_all_skills()

    if args.json:
        print_json(
            [
                {
                    "name": skill.name,
                    "description": skill.description,
                    "tags": parse_tags(skill.frontmatter.get("tags")),
                    "references": skill.reference_count,
                    "entryFile": skill.entry_file,
                }
                for skill in skills
            ]
        )
        return 0

    if not skills:
        warn("No skills found")
        return 0

    info("Available skills:")
    for skill in skills:
        description = f" - {skill.description}" if skill.description else ""
        print("  " + blue(skill.name), dim_text(description))

    print(dim_text(f"\nTotal: {len(skills)} skills"))
    return 0

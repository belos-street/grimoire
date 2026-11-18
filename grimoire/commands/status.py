from __future__ import annotations

from argparse import Namespace

from ..logger import blue, dim, dim_text, info, warn
from ..manifest import get_installed_status, list_untracked, read_manifest
from .shared import format_status, print_json, resolve_target


def run_status(args: Namespace) -> int:
    target_dir = resolve_target(args.to)
    manifest = read_manifest(target_dir)
    entries = sorted(
        (manifest.get("skills") or {}).items(),
        key=lambda item: (item[0].casefold(), item[0]),
    )

    skills = [
        {
            "name": name,
            "status": get_installed_status(target_dir, name, entry),
            "mode": entry.get("mode"),
            "path": str(target_dir / name),
        }
        for name, entry in entries
    ]

    untracked = list_untracked(target_dir, manifest)
    ok = all(skill["status"] == "ok" for skill in skills)

    if args.json:
        print_json(
            {
                "ok": ok,
                "target": str(target_dir),
                "skills": skills,
                "untracked": untracked,
            }
        )
        return 0

    if not skills:
        warn(f"No tracked skills in {target_dir}")
    else:
        info(f"Skills in {target_dir}:")
        for skill in skills:
            print(
                "  " + blue(skill["name"]),
                format_status(skill["status"]),
                dim_text(f"({skill['mode']})"),
            )

    if untracked:
        dim(f"Untracked (not managed by grimoire): {', '.join(untracked)}")

    return 0

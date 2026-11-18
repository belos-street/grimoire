from __future__ import annotations

from argparse import Namespace

from ..generator import AddResult, add_skill
from ..logger import error, success, warn
from ..manifest import get_installed_status, read_manifest
from .shared import print_json, resolve_target


def run_sync(args: Namespace) -> int:
    target_dir = resolve_target(args.to)
    manifest = read_manifest(target_dir)
    names = sorted(
        (manifest.get("skills") or {}).keys(),
        key=lambda name: (name.casefold(), name),
    )

    if not names:
        if args.json:
            print_json({"ok": True, "target": str(target_dir), "results": []})
        else:
            warn(f"No tracked skills in {target_dir}")
        return 0

    results: list[AddResult] = []
    for name in names:
        entry = manifest["skills"][name]
        status = get_installed_status(target_dir, name, entry)
        installed_path = str(target_dir / name)

        if status == "ok":
            results.append(
                AddResult(
                    skill_name=name,
                    status="skipped",
                    path=installed_path,
                    entry_file=entry.get("entryFile"),
                    mode=entry.get("mode"),
                    reason="already up to date",
                )
            )
            continue

        if status == "modified" and not args.force:
            results.append(
                AddResult(
                    skill_name=name,
                    status="skipped",
                    path=installed_path,
                    entry_file=entry.get("entryFile"),
                    mode=entry.get("mode"),
                    reason="modified locally; use --force to overwrite",
                )
            )
            continue

        results.append(
            add_skill(name, target_dir, force=True, link=entry.get("mode") == "link")
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
            success(f"  {result.skill_name}: {result.status}")
        elif result.status == "skipped":
            warn(
                f"  {result.skill_name}: skipped - "
                f"{result.reason or 'no change'}"
            )
        else:
            error(f"  {result.skill_name}: failed - {result.error}")

    return 0

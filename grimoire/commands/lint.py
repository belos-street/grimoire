from __future__ import annotations

from argparse import Namespace

from ..lint import lint_skills
from ..logger import blue, dim, error, success, warn
from .shared import print_json


def run_lint(args: Namespace) -> int:
    results = lint_skills(args.skills or None)
    error_count = sum(len(result.errors) for result in results)
    warning_count = sum(len(result.warnings) for result in results)

    if args.json:
        print_json(
            {
                "ok": error_count == 0,
                "errorCount": error_count,
                "warningCount": warning_count,
                "results": [result.to_dict() for result in results],
            }
        )
        return 1 if error_count > 0 else 0

    for result in results:
        if not result.errors and not result.warnings:
            success(f"{result.name}: ok")
            continue

        print(blue(result.name))
        for message in result.errors:
            error(f"  {message}")
        for message in result.warnings:
            warn(f"  {message}")

    dim(f"\n{error_count} error(s), {warning_count} warning(s)")
    return 1 if error_count > 0 else 0

from __future__ import annotations

import argparse
from typing import Callable, Sequence

from . import __version__
from .commands.add import run_add
from .commands.info import run_info
from .commands.lint import run_lint
from .commands.list import run_list
from .commands.shared import DEFAULT_TARGET
from .commands.status import run_status
from .commands.sync import run_sync


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="grimoire",
        description="Install curated AI Agent skills into .agents/skills",
    )
    parser.add_argument("-V", "--version", action="version", version=__version__)

    subparsers = parser.add_subparsers(dest="command", required=True)

    list_parser = subparsers.add_parser(
        "list", help="List all available skills"
    )
    list_parser.add_argument(
        "--json",
        action="store_true",
        help="output as JSON for agent consumption",
    )
    list_parser.set_defaults(handler=run_list)

    add_parser = subparsers.add_parser(
        "add",
        help=(
            "Add skills to a project "
            "(non-interactive when skill names are given)"
        ),
    )
    add_parser.add_argument("skills", nargs="*", help="skill names")
    add_parser.add_argument(
        "--to",
        default=DEFAULT_TARGET,
        help="target skills directory, relative to current directory",
    )
    add_parser.add_argument(
        "--force",
        action="store_true",
        help="overwrite already installed skills",
    )
    add_parser.add_argument(
        "--link",
        action="store_true",
        help="symlink skills instead of copying (local development)",
    )
    add_parser.add_argument(
        "--json",
        action="store_true",
        help="output JSON for agent consumption",
    )
    add_parser.set_defaults(handler=run_add)

    status_parser = subparsers.add_parser(
        "status", help="Show install status of tracked skills"
    )
    status_parser.add_argument(
        "--to",
        default=DEFAULT_TARGET,
        help="target skills directory, relative to current directory",
    )
    status_parser.add_argument(
        "--json",
        action="store_true",
        help="output JSON for agent consumption",
    )
    status_parser.set_defaults(handler=run_status)

    sync_parser = subparsers.add_parser(
        "sync",
        help=(
            "Update outdated skills "
            "(local modifications are kept unless --force)"
        ),
    )
    sync_parser.add_argument(
        "--to",
        default=DEFAULT_TARGET,
        help="target skills directory, relative to current directory",
    )
    sync_parser.add_argument(
        "--force",
        action="store_true",
        help="overwrite locally modified skills",
    )
    sync_parser.add_argument(
        "--json",
        action="store_true",
        help="output JSON for agent consumption",
    )
    sync_parser.set_defaults(handler=run_sync)

    lint_parser = subparsers.add_parser(
        "lint",
        help="Validate skill frontmatter, reference directories and links",
    )
    lint_parser.add_argument("skills", nargs="*", help="skill names")
    lint_parser.add_argument(
        "--json",
        action="store_true",
        help="output JSON for agent consumption",
    )
    lint_parser.set_defaults(handler=run_lint)

    info_parser = subparsers.add_parser(
        "info", help="Show detailed information about a skill"
    )
    info_parser.add_argument("skill", help="skill name")
    info_parser.set_defaults(handler=run_info)

    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    handler: Callable[[argparse.Namespace], int] = args.handler
    try:
        return handler(args)
    except KeyboardInterrupt:
        return 130

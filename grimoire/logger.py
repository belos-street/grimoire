from __future__ import annotations

import os
import sys

_COLOR_ENABLED = sys.stdout.isatty() and "NO_COLOR" not in os.environ


def _style(code: str, text: str) -> str:
    if not _COLOR_ENABLED:
        return text
    return f"\033[{code}m{text}\033[0m"


def blue(text: str) -> str:
    return _style("34", text)


def green(text: str) -> str:
    return _style("32", text)


def yellow(text: str) -> str:
    return _style("33", text)


def red(text: str) -> str:
    return _style("31", text)


def magenta(text: str) -> str:
    return _style("35", text)


def dim_text(text: str) -> str:
    return _style("2", text)


def bold_cyan(text: str) -> str:
    return _style("1;36", text)


def info(message: str) -> None:
    print(f"{blue('ℹ')} {message}")


def success(message: str) -> None:
    print(f"{green('✓')} {message}")


def warn(message: str) -> None:
    print(f"{yellow('⚠')} {message}")


def error(message: str) -> None:
    print(f"{red('✗')} {message}")


def dim(message: str) -> None:
    print(dim_text(message))

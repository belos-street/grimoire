from __future__ import annotations

import os
import shutil
from pathlib import Path


def copy_dir(src: str | Path, dest: str | Path) -> None:
    src_path = Path(src)
    dest_path = Path(dest)

    if not src_path.exists():
        raise FileNotFoundError(f"Source directory does not exist: {src_path}")

    dest_path.mkdir(parents=True, exist_ok=True)

    for entry in src_path.iterdir():
        target = dest_path / entry.name
        if entry.is_dir() and not entry.is_symlink():
            copy_dir(entry, target)
        else:
            shutil.copyfile(entry, target)


def ensure_dir(directory: str | Path) -> None:
    Path(directory).mkdir(parents=True, exist_ok=True)


def path_exists(path: str | Path) -> bool:
    return os.path.lexists(path)


def create_symlink(src: str | Path, dest: str | Path) -> None:
    dest_path = Path(dest)
    ensure_dir(dest_path.parent)
    os.symlink(src, dest_path, target_is_directory=True)


def remove_path(path: str | Path) -> None:
    try:
        if os.path.islink(path) or not os.path.isdir(path):
            os.unlink(path)
        else:
            shutil.rmtree(path)
    except FileNotFoundError:
        pass

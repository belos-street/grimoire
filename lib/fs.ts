import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  rmSync,
  symlinkSync,
  unlinkSync
} from 'fs'
import { join, dirname } from 'path'

export function copyDir(src: string, dest: string): void {
  if (!existsSync(src)) {
    throw new Error(`Source directory does not exist: ${src}`)
  }

  mkdirSync(dest, { recursive: true })

  const entries = readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = join(src, entry.name)
    const destPath = join(dest, entry.name)

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

export function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

export function pathExists(path: string): boolean {
  try {
    lstatSync(path)
    return true
  } catch {
    return false
  }
}

export function createSymlink(src: string, dest: string): void {
  ensureDir(dirname(dest))
  symlinkSync(src, dest, 'dir')
}

export function removePath(path: string): void {
  try {
    const stats = lstatSync(path)
    if (stats.isDirectory() && !stats.isSymbolicLink()) {
      rmSync(path, { recursive: true, force: true })
    } else {
      unlinkSync(path)
    }
  } catch {
    // Path does not exist; nothing to remove.
  }
}

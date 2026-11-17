import { copyFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'fs'
import { join } from 'path'

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

export function fileExists(path: string): boolean {
  return existsSync(path)
}

export function removeDir(dir: string): void {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true })
  }
}

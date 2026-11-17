import { createHash } from 'crypto'
import { lstat, mkdir, readFile, readdir, readlink, stat, writeFile } from 'fs/promises'
import { join, relative } from 'path'

export type InstallMode = 'copy' | 'link'

export interface InstalledSkill {
  source: string
  mode: InstallMode
  entryFile: string
  installedAt: string
  hash: string
}

export interface Manifest {
  version: 1
  skills: Record<string, InstalledSkill>
}

export type SkillStatus = 'ok' | 'outdated' | 'modified' | 'missing'

const MANIFEST_FILE = '.skill-kit.json'

export function manifestPath(targetDir: string): string {
  return join(targetDir, MANIFEST_FILE)
}

export async function readManifest(targetDir: string): Promise<Manifest> {
  try {
    const raw = await readFile(manifestPath(targetDir), 'utf-8')
    const parsed = JSON.parse(raw) as Partial<Manifest>
    return {
      version: 1,
      skills: parsed.skills ?? {}
    }
  } catch {
    return { version: 1, skills: {} }
  }
}

export async function writeManifest(
  targetDir: string,
  manifest: Manifest
): Promise<void> {
  await mkdir(targetDir, { recursive: true })
  await writeFile(
    manifestPath(targetDir),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf-8'
  )
}

export async function hashDir(dir: string): Promise<string> {
  const hash = createHash('sha256')
  await hashEntries(hash, dir, dir)
  return hash.digest('hex')
}

async function hashEntries(
  hash: ReturnType<typeof createHash>,
  dir: string,
  base: string
): Promise<void> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    hash.update(`missing:${relative(base, dir)}\n`)
    return
  }

  entries.sort((a, b) => a.name.localeCompare(b.name))

  for (const entry of entries) {
    if (entry.name === '.DS_Store') continue

    const fullPath = join(dir, entry.name)
    const relPath = relative(base, fullPath).split('\\').join('/')

    if (entry.isDirectory()) {
      hash.update(`dir:${relPath}\n`)
      await hashEntries(hash, fullPath, base)
    } else if (entry.isSymbolicLink()) {
      const target = await readlink(fullPath).catch(() => '')
      hash.update(`link:${relPath}:${target}\n`)
    } else {
      hash.update(`file:${relPath}:`)
      hash.update(await readFile(fullPath))
      hash.update('\n')
    }
  }
}

export async function getInstalledStatus(
  targetDir: string,
  name: string,
  entry: InstalledSkill
): Promise<SkillStatus> {
  const installedPath = join(targetDir, name)

  let stats
  try {
    stats = await lstat(installedPath)
  } catch {
    return 'missing'
  }

  if (entry.mode === 'link') {
    if (!stats.isSymbolicLink()) return 'modified'
    try {
      await stat(installedPath)
    } catch {
      return 'missing'
    }
    const linkTarget = await readlink(installedPath).catch(() => '')
    return linkTarget === entry.source ? 'ok' : 'modified'
  }

  if (!stats.isDirectory()) return 'modified'

  const installedHash = await hashDir(installedPath)
  if (installedHash !== entry.hash) return 'modified'

  const sourceHash = await hashDir(entry.source)
  if (sourceHash !== entry.hash) return 'outdated'

  return 'ok'
}

export async function listUntracked(
  targetDir: string,
  manifest: Manifest
): Promise<string[]> {
  let entries
  try {
    entries = await readdir(targetDir, { withFileTypes: true })
  } catch {
    return []
  }

  return entries
    .filter((entry) => entry.name !== MANIFEST_FILE && !entry.name.startsWith('.'))
    .filter((entry) => entry.isDirectory() || entry.isSymbolicLink())
    .map((entry) => entry.name)
    .filter((name) => !(name in manifest.skills))
    .sort((a, b) => a.localeCompare(b))
}

import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { mkdir, rm, symlink, writeFile } from 'fs/promises'
import { join } from 'path'
import { copyDir } from '../fs'
import {
  getInstalledStatus,
  hashDir,
  listUntracked,
  readManifest,
  writeManifest,
  type InstalledSkill
} from '../manifest'
import { cleanup, makeTempDir } from './helpers'

function copyEntry(source: string, hash: string): InstalledSkill {
  return {
    source,
    mode: 'copy',
    entryFile: 'SKILL.md',
    installedAt: new Date(0).toISOString(),
    hash
  }
}

describe('manifest hashing', () => {
  let root: string

  beforeEach(async () => {
    root = await makeTempDir('skill-kit-manifest')
  })

  afterEach(async () => {
    await cleanup(root)
  })

  test('is stable and changes when content changes', async () => {
    await writeFile(join(root, 'SKILL.md'), 'v1')
    const first = await hashDir(root)
    const second = await hashDir(root)
    expect(second).toBe(first)

    await writeFile(join(root, 'SKILL.md'), 'v2')
    expect(await hashDir(root)).not.toBe(first)
  })

  test('ignores .DS_Store', async () => {
    await writeFile(join(root, 'SKILL.md'), 'v1')
    const before = await hashDir(root)
    await writeFile(join(root, '.DS_Store'), 'noise')
    expect(await hashDir(root)).toBe(before)
  })
})

describe('manifest persistence', () => {
  let root: string
  let targetDir: string

  beforeEach(async () => {
    root = await makeTempDir('skill-kit-manifest')
    targetDir = join(root, '.agents', 'skills')
  })

  afterEach(async () => {
    await cleanup(root)
  })

  test('returns an empty manifest when none exists', async () => {
    expect(await readManifest(targetDir)).toEqual({ version: 1, skills: {} })
  })

  test('round-trips manifest entries', async () => {
    const manifest = {
      version: 1 as const,
      skills: {
        alpha: copyEntry('/source/alpha', 'abc')
      }
    }

    await writeManifest(targetDir, manifest)
    expect(await readManifest(targetDir)).toEqual(manifest)
  })

  test('lists untracked directories only', async () => {
    const manifest = {
      version: 1 as const,
      skills: { alpha: copyEntry('/source/alpha', 'abc') }
    }

    await mkdir(join(targetDir, 'alpha'), { recursive: true })
    await mkdir(join(targetDir, 'custom'), { recursive: true })
    await mkdir(join(targetDir, '.hidden'), { recursive: true })
    await writeFile(join(targetDir, '.skill-kit.json'), '{}')

    expect(await listUntracked(targetDir, manifest)).toEqual(['custom'])
  })
})

describe('installed status', () => {
  let root: string
  let sourceDir: string
  let targetDir: string

  beforeEach(async () => {
    root = await makeTempDir('skill-kit-status')
    sourceDir = join(root, 'source', 'alpha')
    targetDir = join(root, 'target')
    await mkdir(sourceDir, { recursive: true })
    await writeFile(join(sourceDir, 'SKILL.md'), 'v1')
    await mkdir(targetDir, { recursive: true })
  })

  afterEach(async () => {
    await cleanup(root)
  })

  test('detects ok, modified, outdated and missing copies', async () => {
    const installed = join(targetDir, 'alpha')
    copyDir(sourceDir, installed)
    const entry = copyEntry(sourceDir, await hashDir(sourceDir))

    expect(await getInstalledStatus(targetDir, 'alpha', entry)).toBe('ok')

    await writeFile(join(installed, 'SKILL.md'), 'local edit')
    expect(await getInstalledStatus(targetDir, 'alpha', entry)).toBe('modified')

    await rm(installed, { recursive: true })
    copyDir(sourceDir, installed)
    await writeFile(join(sourceDir, 'SKILL.md'), 'v2')
    expect(await getInstalledStatus(targetDir, 'alpha', entry)).toBe('outdated')

    await rm(installed, { recursive: true })
    expect(await getInstalledStatus(targetDir, 'alpha', entry)).toBe('missing')
  })

  test('detects ok, modified and broken links', async () => {
    const installed = join(targetDir, 'alpha')
    await symlink(sourceDir, installed, 'dir')
    const entry: InstalledSkill = {
      source: sourceDir,
      mode: 'link',
      entryFile: 'SKILL.md',
      installedAt: new Date(0).toISOString(),
      hash: await hashDir(sourceDir)
    }

    expect(await getInstalledStatus(targetDir, 'alpha', entry)).toBe('ok')

    const other = join(root, 'other')
    await mkdir(other, { recursive: true })
    await rm(installed)
    await symlink(other, installed, 'dir')
    expect(await getInstalledStatus(targetDir, 'alpha', entry)).toBe('modified')

    await rm(installed)
    await symlink(join(root, 'missing'), installed, 'dir')
    expect(await getInstalledStatus(targetDir, 'alpha', entry)).toBe('missing')
  })
})

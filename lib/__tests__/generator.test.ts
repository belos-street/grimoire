import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { lstat, mkdir, readlink, writeFile } from 'fs/promises'
import { join } from 'path'
import { addSkill, addSkills } from '../generator'
import { getInstalledStatus, readManifest } from '../manifest'
import { pathExists } from '../fs'
import { cleanup, makeTempDir, writeSkill } from './helpers'

describe('skill installation', () => {
  let root: string
  let skillsDir: string
  let targetDir: string
  let previousHome: string | undefined

  beforeEach(async () => {
    previousHome = process.env.SKILL_KIT_HOME
    root = await makeTempDir('skill-kit-generator')
    skillsDir = join(root, 'skills')
    targetDir = join(root, 'project', '.agents', 'skills')
    await mkdir(skillsDir, { recursive: true })
    await writeSkill(skillsDir, 'alpha')
    process.env.SKILL_KIT_HOME = skillsDir
  })

  afterEach(async () => {
    if (previousHome === undefined) {
      delete process.env.SKILL_KIT_HOME
    } else {
      process.env.SKILL_KIT_HOME = previousHome
    }
    await cleanup(root)
  })

  test('copies a skill and records it in the manifest', async () => {
    const [result] = await addSkills({ skills: ['alpha'], targetDir })

    expect(result?.status).toBe('added')
    expect(result?.mode).toBe('copy')
    expect(await pathExists(join(targetDir, 'alpha', 'SKILL.md'))).toBe(true)

    const manifest = await readManifest(targetDir)
    const entry = manifest.skills.alpha
    expect(entry?.mode).toBe('copy')
    expect(entry).toBeDefined()

    expect(await getInstalledStatus(targetDir, 'alpha', entry!)).toBe('ok')
  })

  test('skips existing skills unless force is used', async () => {
    await addSkills({ skills: ['alpha'], targetDir })

    const [skipped] = await addSkills({ skills: ['alpha'], targetDir })
    expect(skipped?.status).toBe('skipped')

    await writeFile(join(skillsDir, 'alpha', 'SKILL.md'), 'updated source')
    const [updated] = await addSkills({
      skills: ['alpha'],
      targetDir,
      force: true
    })
    expect(updated?.status).toBe('updated')
  })

  test('installs symlinks in link mode', async () => {
    const [result] = await addSkills({
      skills: ['alpha'],
      targetDir,
      link: true
    })

    expect(result?.mode).toBe('link')
    const installed = join(targetDir, 'alpha')
    expect((await lstat(installed)).isSymbolicLink()).toBe(true)
    expect(await readlink(installed)).toBe(join(skillsDir, 'alpha'))

    const manifest = await readManifest(targetDir)
    expect(manifest.skills.alpha?.mode).toBe('link')
  })

  test('replaces a copy with a symlink when forced', async () => {
    await addSkills({ skills: ['alpha'], targetDir })
    await addSkills({ skills: ['alpha'], targetDir, link: true, force: true })

    const installed = join(targetDir, 'alpha')
    expect((await lstat(installed)).isSymbolicLink()).toBe(true)
    expect((await readManifest(targetDir)).skills.alpha?.mode).toBe('link')
  })

  test('reports unknown skills as failed', async () => {
    const [result] = await addSkills({ skills: ['missing'], targetDir })

    expect(result?.status).toBe('failed')
    expect(result?.error).toBe('Skill not found')
  })

  test('addSkill wraps a single install', async () => {
    const result = await addSkill('alpha', targetDir)
    expect(result.status).toBe('added')
    expect(result.skillName).toBe('alpha')
  })
})

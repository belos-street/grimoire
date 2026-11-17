import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { lintSkills, type LintResult } from '../lint'
import { cleanup, makeTempDir, writeSkill } from './helpers'

describe('skill lint', () => {
  let root: string
  let skillsDir: string
  let previousHome: string | undefined

  beforeEach(async () => {
    previousHome = process.env.SKILL_KIT_HOME
    root = await makeTempDir('skill-kit-lint')
    skillsDir = join(root, 'skills')
    await mkdir(skillsDir, { recursive: true })
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

  function findResult(results: LintResult[], name: string): LintResult {
    const result = results.find((item) => item.name === name)
    expect(result).toBeDefined()
    return result!
  }

  test('accepts a well-formed skill', async () => {
    await writeSkill(skillsDir, 'good', {
      body: 'See [topic](references/topic.md).',
      references: { 'topic.md': '# Topic' }
    })

    const [result] = await lintSkills(['good'])
    expect(result?.errors).toEqual([])
    expect(result?.warnings).toEqual([])
  })

  test('reports name mismatch, missing description and bad links', async () => {
    const skillDir = join(skillsDir, 'bad')
    await mkdir(skillDir, { recursive: true })
    await writeFile(
      join(skillDir, 'SKILL.md'),
      [
        '---',
        'name: wrong-name',
        '---',
        '# Bad',
        'See [missing](references/missing.md).'
      ].join('\n')
    )

    const [result] = await lintSkills(['bad'])
    expect(result?.errors).toContain(
      'frontmatter name "wrong-name" 与目录名不一致'
    )
    expect(result?.errors).toContain('frontmatter 缺少 description')
    expect(result?.warnings).toContain('缺少 references/（或 reference/、rules/）目录')
    expect(result?.warnings).toContain('链接失效: references/missing.md')
  })

  test('accepts nested skills as an alternative to a references directory', async () => {
    const skillDir = join(skillsDir, 'shell')
    await mkdir(join(skillDir, 'child'), { recursive: true })
    await writeFile(
      join(skillDir, 'SKILL.md'),
      [
        '---',
        'name: shell',
        'description: A shell skill containing nested skills for testing.',
        '---',
        '# Shell'
      ].join('\n')
    )
    await writeFile(
      join(skillDir, 'child', 'SKILL.md'),
      '---\nname: child\ndescription: Child skill.\n---\n'
    )

    const [result] = await lintSkills(['shell'])
    expect(result?.warnings).not.toContain(
      '缺少 references/（或 reference/、rules/）目录'
    )
  })

  test('reports unknown skill names', async () => {
    const [result] = await lintSkills(['missing'])
    expect(result?.errors).toContain('Skill "missing" 不存在')
  })

  test('lints all skills when no names are given', async () => {
    await writeSkill(skillsDir, 'alpha')
    await writeSkill(skillsDir, 'beta')

    const results = await lintSkills()
    expect(results.map((result) => result.name)).toEqual(['alpha', 'beta'])
    expect(findResult(results, 'beta').errors).toEqual([])
  })
})

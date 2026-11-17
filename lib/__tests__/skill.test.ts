import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { getAllSkills, getSkillByName, getSkillsDir } from '../skill'
import { cleanup, makeTempDir, withSkillsHome, writeSkill } from './helpers'

describe('skill scanning', () => {
  let root: string
  let skillsDir: string

  beforeEach(async () => {
    root = await makeTempDir('skill-kit-skill')
    skillsDir = join(root, 'skills')
    await mkdir(skillsDir, { recursive: true })
  })

  afterEach(async () => {
    await cleanup(root)
  })

  test('reads lowercase skill.md and counts references', async () => {
    await writeSkill(skillsDir, 'alpha', {
      entryFile: 'skill.md',
      references: { 'one.md': '# One', 'two.md': '# Two' }
    })

    await withSkillsHome(skillsDir, async () => {
      const skills = await getAllSkills()
      expect(skills).toHaveLength(1)
      expect(skills[0]?.name).toBe('alpha')
      expect(skills[0]?.entryFile).toBe('skill.md')
      expect(skills[0]?.referenceCount).toBe(2)
      expect(skills[0]?.description).toContain('unit tests')
    })
  })

  test('reads uppercase SKILL.md and multiline descriptions', async () => {
    const skillDir = join(skillsDir, 'beta')
    await mkdir(join(skillDir, 'references'), { recursive: true })
    await writeFile(
      join(skillDir, 'SKILL.md'),
      [
        '---',
        'name: beta',
        'description:',
        '  A multiline description that should be joined',
        '  into a single string for agent discovery.',
        '---',
        '# Beta'
      ].join('\n')
    )

    await withSkillsHome(skillsDir, async () => {
      const [skill] = await getAllSkills()
      expect(skill?.entryFile).toBe('SKILL.md')
      expect(skill?.description).toBe(
        'A multiline description that should be joined into a single string for agent discovery.'
      )
    })
  })

  test('counts rules directories used by third-party skills', async () => {
    await writeSkill(skillsDir, 'gamma', {
      referenceDir: 'rules',
      references: { 'rule.md': '# Rule' }
    })

    await withSkillsHome(skillsDir, async () => {
      const [skill] = await getAllSkills()
      expect(skill?.referenceCount).toBe(1)
    })
  })

  test('sorts skills and finds one by name', async () => {
    await writeSkill(skillsDir, 'zeta')
    await writeSkill(skillsDir, 'alpha')

    await withSkillsHome(skillsDir, async () => {
      const skills = await getAllSkills()
      expect(skills.map((skill) => skill.name)).toEqual(['alpha', 'zeta'])
      expect((await getSkillByName('zeta'))?.name).toBe('zeta')
      expect(await getSkillByName('missing')).toBeNull()
    })
  })

  test('honors SKILL_KIT_HOME', async () => {
    await withSkillsHome(skillsDir, async () => {
      expect(await getSkillsDir()).toBe(skillsDir)
    })
  })
})

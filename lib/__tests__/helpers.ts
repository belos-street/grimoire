import { mkdir, mkdtemp, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

export interface SkillFixtureOptions {
  entryFile?: 'SKILL.md' | 'skill.md'
  name?: string
  description?: string
  body?: string
  referenceDir?: 'references' | 'reference' | 'rules' | null
  references?: Record<string, string>
}

export async function makeTempDir(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), `${prefix}-`))
}

export async function writeSkill(
  skillsDir: string,
  dirName: string,
  options: SkillFixtureOptions = {}
): Promise<string> {
  const skillDir = join(skillsDir, dirName)
  await mkdir(skillDir, { recursive: true })

  const entryFile = options.entryFile ?? 'SKILL.md'
  const name = options.name ?? dirName
  const description =
    options.description ??
    `${dirName} skill used by unit tests with a sufficiently long description.`

  const content = [
    '---',
    `name: ${name}`,
    `description: ${description}`,
    '---',
    '',
    `# ${dirName}`,
    '',
    options.body ?? ''
  ].join('\n')

  await writeFile(join(skillDir, entryFile), content, 'utf-8')

  if (options.referenceDir !== null) {
    const referenceDir = options.referenceDir ?? 'references'
    await mkdir(join(skillDir, referenceDir), { recursive: true })

    const references = options.references ?? { 'topic.md': '# Topic\n' }
    for (const [fileName, fileContent] of Object.entries(references)) {
      await writeFile(join(skillDir, referenceDir, fileName), fileContent, 'utf-8')
    }
  }

  return skillDir
}

export async function withSkillsHome<T>(
  skillsDir: string,
  fn: () => Promise<T>
): Promise<T> {
  const previous = process.env.SKILL_KIT_HOME
  process.env.SKILL_KIT_HOME = skillsDir

  try {
    return await fn()
  } finally {
    if (previous === undefined) {
      delete process.env.SKILL_KIT_HOME
    } else {
      process.env.SKILL_KIT_HOME = previous
    }
  }
}

export async function cleanup(root: string): Promise<void> {
  await rm(root, { recursive: true, force: true })
}

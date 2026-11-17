import { readdir, readFile, stat } from 'fs/promises'
import { join } from 'path'

const REFERENCE_DIRS = ['references', 'reference', 'rules']

export interface Skill {
  name: string
  description: string
  path: string
  entryFile: string
  referenceCount: number
  frontmatter: Record<string, string>
}

function parseFrontmatter(content: string): Record<string, string> {
  const frontmatter: Record<string, string> = {}

  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match || !match[1]) return frontmatter

  const lines = match[1].split('\n')
  const multilineKeys = new Set(['description', 'title', 'when_to_use', 'summary'])

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue

    const key = line.slice(0, colonIndex).trim()
    if (!key) continue

    const rawValue = line.slice(colonIndex + 1).trim()
    let value = rawValue.replace(/^["'](.*)["']$/, '$1')

    if (!value && multilineKeys.has(key)) {
      const collected: string[] = []
      let nextIndex = i + 1

      while (nextIndex < lines.length) {
        const nextLine = lines[nextIndex] ?? ''
        if (nextLine.trim() === '' || !/^\s+/.test(nextLine)) break
        collected.push(nextLine.trim())
        nextIndex++
      }

      if (collected.length > 0) {
        value = collected.join(' ')
        i = nextIndex - 1
      }
    }

    if (value) {
      frontmatter[key] = value
    }
  }

  return frontmatter
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory()
  } catch {
    return false
  }
}

export async function getSkillsDir(): Promise<string> {
  const sourceDir = join(import.meta.dir, '..', '..', 'skills')
  const candidates = [
    process.env.SKILL_KIT_HOME,
    join(import.meta.dir, '..', '..', 'skills'),
    join(import.meta.dir, '..', 'skills'),
    join(import.meta.dir, 'skills'),
    join(process.cwd(), 'skills')
  ]

  for (const dir of candidates) {
    if (dir && (await isDirectory(dir))) return dir
  }

  return sourceDir
}

export async function getAllSkills(): Promise<Skill[]> {
  const skillsDir = await getSkillsDir()

  try {
    const entries = await readdir(skillsDir, { withFileTypes: true })
    const skills: Skill[] = []

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const skillPath = join(skillsDir, entry.name)
      let description = ''
      let frontmatter: Record<string, string> = {}
      let entryFile = ''

      try {
        const files = await readdir(skillPath)
        const mainFile = files.find((file) => /^skill\.md$/i.test(file))

        if (mainFile) {
          entryFile = mainFile
          const content = await readFile(join(skillPath, mainFile), 'utf-8')
          frontmatter = parseFrontmatter(content)
          description =
            frontmatter.description ||
            content.match(/description:\s*(.+)/)?.[1]?.trim() ||
            ''
        }
      } catch {
        description = ''
        frontmatter = {}
      }

      let referenceCount = 0
      for (const dirName of REFERENCE_DIRS) {
        try {
          const refEntries = await readdir(join(skillPath, dirName))
          referenceCount = refEntries.filter((file) => file.endsWith('.md')).length
          break
        } catch {
          continue
        }
      }

      skills.push({
        name: entry.name,
        description,
        path: skillPath,
        entryFile: entryFile || 'SKILL.md',
        referenceCount,
        frontmatter
      })
    }

    return skills.sort((a, b) => a.name.localeCompare(b.name))
  } catch (error) {
    console.error('Error reading skills directory:', error)
    return []
  }
}

export async function getSkillByName(name: string): Promise<Skill | null> {
  const skills = await getAllSkills()
  return skills.find((s) => s.name === name) || null
}

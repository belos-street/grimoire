import { readFile, readdir, stat } from 'fs/promises'
import { dirname, join } from 'path'
import { getAllSkills, type Skill } from './skill'

export interface LintResult {
  name: string
  errors: string[]
  warnings: string[]
}

const REFERENCE_DIRS = ['references', 'reference', 'rules']

export async function lintSkills(names?: string[]): Promise<LintResult[]> {
  const skills = await getAllSkills()

  if (!names || names.length === 0) {
    return Promise.all(skills.map((skill) => lintSkill(skill)))
  }

  const results: LintResult[] = []
  for (const name of names) {
    const skill = skills.find((item) => item.name === name)
    results.push(
      skill
        ? await lintSkill(skill)
        : { name, errors: [`Skill "${name}" 不存在`], warnings: [] }
    )
  }
  return results
}

async function lintSkill(skill: Skill): Promise<LintResult> {
  const errors: string[] = []
  const warnings: string[] = []
  const entryPath = join(skill.path, skill.entryFile)

  let content = ''
  try {
    content = await readFile(entryPath, 'utf-8')
  } catch {
    errors.push(`缺少主文件 ${skill.entryFile}`)
    return { name: skill.name, errors, warnings }
  }

  const { name, description } = skill.frontmatter

  if (!name) {
    errors.push('frontmatter 缺少 name')
  } else if (name !== skill.name) {
    errors.push(`frontmatter name "${name}" 与目录名不一致`)
  }

  if (!description) {
    errors.push('frontmatter 缺少 description')
  } else if (description.length < 30) {
    warnings.push('description 过短，建议写清使用场景与触发词')
  }

  if (!(await hasReferenceDir(skill.path)) && !(await hasNestedSkills(skill.path))) {
    warnings.push('缺少 references/（或 reference/、rules/）目录')
  }

  for (const link of extractMarkdownLinks(content)) {
    if (/^(https?:|mailto:|#)/i.test(link)) continue

    const [rawPath] = link.split('#')
    if (!rawPath || !rawPath.toLowerCase().endsWith('.md')) continue

    try {
      await stat(join(dirname(entryPath), rawPath))
    } catch {
      warnings.push(`链接失效: ${link}`)
    }
  }

  return { name: skill.name, errors, warnings }
}

async function hasReferenceDir(skillPath: string): Promise<boolean> {
  for (const dirName of REFERENCE_DIRS) {
    try {
      if ((await stat(join(skillPath, dirName))).isDirectory()) return true
    } catch {
      continue
    }
  }
  return false
}

async function hasNestedSkills(skillPath: string): Promise<boolean> {
  try {
    const entries = await readdir(skillPath, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const files = await readdir(join(skillPath, entry.name)).catch(() => [])
      if (files.some((file) => /^skill\.md$/i.test(file))) return true
    }
  } catch {
    return false
  }
  return false
}

function extractMarkdownLinks(content: string): string[] {
  const withoutCodeBlocks = content.replace(/```[\s\S]*?```/g, '')
  const links = new Set<string>()
  const pattern = /\]\(([^)]+)\)/g

  for (const match of withoutCodeBlocks.matchAll(pattern)) {
    const link = match[1]?.trim()
    if (link) links.add(link)
  }

  return [...links]
}

import { getSkillByName } from '../skill/index'
import { copyDir, fileExists, ensureDir, removeDir } from '../fs/index'
import { join } from 'path'

export interface AddOptions {
  skills: string[]
  targetDir: string
  force?: boolean
}

export interface AddResult {
  skillName: string
  status: 'added' | 'updated' | 'skipped' | 'failed'
  path?: string
  entryFile?: string
  description?: string
  error?: string
}

export async function addSkills(options: AddOptions): Promise<AddResult[]> {
  const { skills: skillNames, targetDir, force = false } = options
  const results: AddResult[] = []

  for (const skillName of skillNames) {
    const skill = await getSkillByName(skillName)

    if (!skill) {
      results.push({
        skillName,
        status: 'failed',
        error: 'Skill not found'
      })
      continue
    }

    const destPath = join(targetDir, skill.name)
    const exists = fileExists(destPath)

    if (exists && !force) {
      results.push({
        skillName: skill.name,
        status: 'skipped',
        path: destPath,
        entryFile: skill.entryFile,
        description: skill.description
      })
      continue
    }

    try {
      ensureDir(targetDir)
      if (exists) removeDir(destPath)
      copyDir(skill.path, destPath)
      results.push({
        skillName: skill.name,
        status: exists ? 'updated' : 'added',
        path: destPath,
        entryFile: skill.entryFile,
        description: skill.description
      })
    } catch (error) {
      results.push({
        skillName: skill.name,
        status: 'failed',
        error: String(error)
      })
    }
  }

  return results
}

export async function addSkill(
  skillName: string,
  targetDir: string,
  force = false
): Promise<AddResult> {
  const results = await addSkills({
    skills: [skillName],
    targetDir,
    force
  })
  return (
    results[0] ?? {
      skillName,
      status: 'failed' as const,
      error: 'Unknown error'
    }
  )
}

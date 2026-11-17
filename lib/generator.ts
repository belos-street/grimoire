import { getSkillByName } from './skill'
import {
  copyDir,
  createSymlink,
  ensureDir,
  pathExists,
  removePath
} from './fs'
import {
  hashDir,
  readManifest,
  writeManifest,
  type InstallMode
} from './manifest'
import { join } from 'path'

export interface AddOptions {
  skills: string[]
  targetDir: string
  force?: boolean
  link?: boolean
}

export interface AddResult {
  skillName: string
  status: 'added' | 'updated' | 'skipped' | 'failed'
  path?: string
  entryFile?: string
  description?: string
  mode?: InstallMode
  reason?: string
  error?: string
}

export async function addSkills(options: AddOptions): Promise<AddResult[]> {
  const {
    skills: skillNames,
    targetDir,
    force = false,
    link = false
  } = options
  const manifest = await readManifest(targetDir)
  const results: AddResult[] = []
  let manifestChanged = false

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
    const exists = pathExists(destPath)
    const mode: InstallMode = link ? 'link' : 'copy'

    if (exists && !force) {
      results.push({
        skillName: skill.name,
        status: 'skipped',
        path: destPath,
        entryFile: skill.entryFile,
        description: skill.description,
        mode
      })
      continue
    }

    try {
      ensureDir(targetDir)
      if (exists) removePath(destPath)
      if (link) {
        createSymlink(skill.path, destPath)
      } else {
        copyDir(skill.path, destPath)
      }

      manifest.skills[skill.name] = {
        source: skill.path,
        mode,
        entryFile: skill.entryFile,
        installedAt: new Date().toISOString(),
        hash: await hashDir(skill.path)
      }
      manifestChanged = true

      results.push({
        skillName: skill.name,
        status: exists ? 'updated' : 'added',
        path: destPath,
        entryFile: skill.entryFile,
        description: skill.description,
        mode
      })
    } catch (error) {
      results.push({
        skillName: skill.name,
        status: 'failed',
        error: String(error)
      })
    }
  }

  if (manifestChanged) {
    await writeManifest(targetDir, manifest)
  }

  return results
}

export async function addSkill(
  skillName: string,
  targetDir: string,
  force = false,
  link = false
): Promise<AddResult> {
  const results = await addSkills({
    skills: [skillName],
    targetDir,
    force,
    link
  })
  return (
    results[0] ?? {
      skillName,
      status: 'failed' as const,
      error: 'Unknown error'
    }
  )
}

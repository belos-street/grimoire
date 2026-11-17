import { Command } from 'commander'
import chalk from 'chalk'
import { join } from 'path'
import { logger } from '../logger'
import {
  getInstalledStatus,
  listUntracked,
  readManifest,
  type SkillStatus
} from '../manifest'
import { DEFAULT_TARGET, formatStatus, printJson, resolveTarget } from './shared'

interface StatusCommandOptions {
  to: string
  json?: boolean
}

export function registerStatusCommand(program: Command): void {
  program
    .command('status')
    .description('Show install status of tracked skills')
    .option(
      '--to <dir>',
      'target skills directory, relative to current directory',
      DEFAULT_TARGET
    )
    .option('--json', 'output JSON for agent consumption', false)
    .action(async (options: StatusCommandOptions) => {
      const targetDir = resolveTarget(options.to)
      const manifest = await readManifest(targetDir)
      const entries = Object.entries(manifest.skills).sort(([a], [b]) =>
        a.localeCompare(b)
      )

      const skills: {
        name: string
        status: SkillStatus
        mode: string
        path: string
      }[] = []

      for (const [name, entry] of entries) {
        skills.push({
          name,
          status: await getInstalledStatus(targetDir, name, entry),
          mode: entry.mode,
          path: join(targetDir, name)
        })
      }

      const untracked = await listUntracked(targetDir, manifest)
      const ok = skills.every((skill) => skill.status === 'ok')

      if (options.json) {
        printJson({ ok, target: targetDir, skills, untracked })
        return
      }

      if (skills.length === 0) {
        logger.warn(`No tracked skills in ${targetDir}`)
      } else {
        logger.info(`Skills in ${targetDir}:`)
        for (const skill of skills) {
          console.log(
            '  ' + chalk.blue(skill.name),
            formatStatus(skill.status),
            chalk.dim(`(${skill.mode})`)
          )
        }
      }

      if (untracked.length > 0) {
        logger.dim(`Untracked (not managed by skill-kit): ${untracked.join(', ')}`)
      }
    })
}

import { Command } from 'commander'
import { join } from 'path'
import { logger } from '../logger'
import { addSkill, type AddResult } from '../generator'
import { getInstalledStatus, readManifest } from '../manifest'
import { DEFAULT_TARGET, printJson, resolveTarget } from './shared'

interface SyncCommandOptions {
  to: string
  force?: boolean
  json?: boolean
}

export function registerSyncCommand(program: Command): void {
  program
    .command('sync')
    .description(
      'Update outdated skills (local modifications are kept unless --force)'
    )
    .option(
      '--to <dir>',
      'target skills directory, relative to current directory',
      DEFAULT_TARGET
    )
    .option('--force', 'overwrite locally modified skills', false)
    .option('--json', 'output JSON for agent consumption', false)
    .action(async (options: SyncCommandOptions) => {
      const targetDir = resolveTarget(options.to)
      const manifest = await readManifest(targetDir)
      const names = Object.keys(manifest.skills).sort((a, b) => a.localeCompare(b))

      if (names.length === 0) {
        if (options.json) {
          printJson({ ok: true, target: targetDir, results: [] })
        } else {
          logger.warn(`No tracked skills in ${targetDir}`)
        }
        return
      }

      const results: AddResult[] = []
      for (const name of names) {
        const entry = manifest.skills[name]
        if (!entry) continue

        const status = await getInstalledStatus(targetDir, name, entry)

        if (status === 'ok') {
          results.push({
            skillName: name,
            status: 'skipped',
            path: join(targetDir, name),
            entryFile: entry.entryFile,
            mode: entry.mode,
            reason: 'already up to date'
          })
          continue
        }

        if (status === 'modified' && !options.force) {
          results.push({
            skillName: name,
            status: 'skipped',
            path: join(targetDir, name),
            entryFile: entry.entryFile,
            mode: entry.mode,
            reason: 'modified locally; use --force to overwrite'
          })
          continue
        }

        results.push(await addSkill(name, targetDir, true, entry.mode === 'link'))
      }

      if (options.json) {
        printJson({
          ok: results.every((result) => result.status !== 'failed'),
          target: targetDir,
          results
        })
        if (results.some((result) => result.status === 'failed')) {
          process.exitCode = 1
        }
        return
      }

      for (const result of results) {
        if (result.status === 'added' || result.status === 'updated') {
          logger.success(`  ${result.skillName}: ${result.status}`)
        } else if (result.status === 'skipped') {
          logger.warn(
            `  ${result.skillName}: skipped - ${result.reason ?? 'no change'}`
          )
        } else {
          logger.error(`  ${result.skillName}: failed - ${result.error}`)
        }
      }
    })
}

import { Command } from 'commander'
import prompts from 'prompts'
import { getAllSkills } from '../skill'
import { logger } from '../logger'
import { addSkills } from '../generator'
import { DEFAULT_TARGET, printJson, resolveTarget, skillLink, tableCell } from './shared'

interface AddCommandOptions {
  to: string
  force?: boolean
  link?: boolean
  json?: boolean
}

export function registerAddCommand(program: Command): void {
  program
    .command('add [skills...]')
    .description(
      'Add skills to a project (non-interactive when skill names are given)'
    )
    .option(
      '--to <dir>',
      'target skills directory, relative to current directory',
      DEFAULT_TARGET
    )
    .option('--force', 'overwrite already installed skills', false)
    .option('--link', 'symlink skills instead of copying (local development)', false)
    .option('--json', 'output JSON for agent consumption', false)
    .action(async (skillNames: string[], options: AddCommandOptions) => {
      const targetDir = resolveTarget(options.to)

      let selected = skillNames
      if (selected.length === 0) {
        if (options.json) {
          printJson({
            ok: false,
            error: 'No skills specified. Usage: skill-kit add <skill...> --json'
          })
          process.exitCode = 1
          return
        }

        const skills = await getAllSkills()
        if (skills.length === 0) {
          logger.warn('No skills found')
          return
        }

        const response = await prompts({
          type: 'multiselect',
          name: 'skills',
          message: 'Choose skills:',
          choices: skills.map((skill) => ({
            title: skill.name,
            value: skill.name,
            selected: false
          })),
          hint: '- Space to select, Enter to confirm'
        })

        selected = response.skills ?? []
        if (selected.length === 0) {
          logger.warn('No skills selected')
          return
        }
      }

      const results = await addSkills({
        skills: selected,
        targetDir,
        force: Boolean(options.force),
        link: Boolean(options.link)
      })

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
          const suffix = result.mode === 'link' ? ' (linked)' : ''
          logger.success(`  ${result.skillName}: ${result.status}${suffix}`)
        } else if (result.status === 'skipped') {
          logger.warn(
            `  ${result.skillName}: already exists, skipped (use --force to overwrite)`
          )
        } else {
          logger.error(`  ${result.skillName}: failed - ${result.error}`)
        }
      }

      const changed = results.filter(
        (result) => result.status === 'added' || result.status === 'updated'
      )
      if (changed.length === 0) return

      console.log()
      logger.success(`Done! ${changed.length} skill(s) installed to ${targetDir}`)
      console.log()
      logger.info('Add these rows to the skill table in AGENTS.md:')
      console.log()
      for (const result of changed) {
        console.log(`| ${skillLink(result)} | ${tableCell(result.description)} |`)
      }
      console.log()
    })
}

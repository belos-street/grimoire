import { Command } from 'commander'
import chalk from 'chalk'
import prompts from 'prompts'
import { cwd } from 'process'
import { join, relative, resolve } from 'path'
import { getAllSkills, getSkillByName } from '../skill/index'
import { logger } from '../logger/index'
import { addSkills, type AddResult } from '../generator/index'

interface AddCommandOptions {
  to: string
  force?: boolean
  json?: boolean
}

export class CLI {
  private program: Command

  constructor() {
    this.program = new Command()
    this.setup()
  }

  private setup() {
    this.program
      .name('skill-kit')
      .description('CLI tool for managing skill documentation')
      .version('1.0.0')

    this.program
      .command('list')
      .description('List all available skills')
      .option('--json', 'output as JSON for agent consumption')
      .action(async (options: { json?: boolean }) => {
        const skills = await getAllSkills()

        if (options.json) {
          console.log(
            JSON.stringify(
              skills.map((skill) => ({
                name: skill.name,
                description: skill.description,
                tags: this.parseTags(skill.frontmatter.tags),
                references: skill.referenceCount,
                entryFile: skill.entryFile
              })),
              null,
              2
            )
          )
          return
        }

        if (skills.length === 0) {
          logger.warn('No skills found')
          return
        }

        logger.info('Available skills:')
        for (const skill of skills) {
          const desc = skill.description ? ` - ${skill.description}` : ''
          console.log('  ' + chalk.blue(skill.name), chalk.dim(desc))
        }

        logger.dim(`\nTotal: ${skills.length} skills`)
      })

    this.program
      .command('add [skills...]')
      .description(
        'Add skills to a project (non-interactive when skill names are given)'
      )
      .option(
        '--to <dir>',
        'target skills directory, relative to current directory',
        '.agents/skills'
      )
      .option('--force', 'overwrite already installed skills', false)
      .option('--json', 'output JSON for agent consumption', false)
      .action(async (skillNames: string[], options: AddCommandOptions) => {
        const targetDir = resolve(cwd(), options.to)

        let selected = skillNames
        if (selected.length === 0) {
          if (options.json) {
            console.log(
              JSON.stringify({
                ok: false,
                error: 'No skills specified. Usage: skill-kit add <skill...> --json'
              })
            )
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
          force: Boolean(options.force)
        })

        if (options.json) {
          console.log(
            JSON.stringify(
              {
                ok: results.every((result) => result.status !== 'failed'),
                target: targetDir,
                results
              },
              null,
              2
            )
          )
          if (results.some((result) => result.status === 'failed')) {
            process.exitCode = 1
          }
          return
        }

        for (const result of results) {
          if (result.status === 'added') {
            logger.success(`  ${result.skillName}: added`)
          } else if (result.status === 'updated') {
            logger.success(`  ${result.skillName}: updated`)
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
          console.log(`| ${this.skillLink(result)} | ${this.tableCell(result.description)} |`)
        }
        console.log()
      })

    this.program
      .command('info <skill>')
      .description('Show detailed information about a skill')
      .action(async (skillName: string) => {
        const skill = await getSkillByName(skillName)

        if (!skill) {
          logger.error(`Skill "${skillName}" not found`)
          return
        }

        console.log(`\n${chalk.bold.cyan(skill.name)}\n`)

        if (skill.description) {
          console.log(chalk.dim('Description:'), skill.description)
        }

        console.log(chalk.dim('Path:'), skill.path)
        console.log(chalk.dim('Entry:'), skill.entryFile)
        console.log(chalk.dim('References:'), skill.referenceCount, 'files')

        if (skill.frontmatter && Object.keys(skill.frontmatter).length > 0) {
          console.log(chalk.dim('\n--- Frontmatter ---'))
          for (const [key, value] of Object.entries(skill.frontmatter)) {
            console.log(chalk.dim(`  ${key}:`), value)
          }
        }

        console.log()
      })
  }

  private parseTags(raw?: string): string[] {
    if (!raw) return []
    return raw
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map((tag) => tag.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean)
  }

  private skillLink(result: AddResult): string {
    if (!result.path || !result.entryFile) return result.skillName
    const link = relative(cwd(), join(result.path, result.entryFile)).replace(
      /\\/g,
      '/'
    )
    return `[${result.skillName}](${link})`
  }

  private tableCell(text?: string): string {
    if (!text) return '-'
    const clean = text.replace(/\s+/g, ' ').replace(/\|/g, '\\|')
    return clean.length > 80 ? `${clean.slice(0, 77)}…` : clean
  }

  public run(args: string[] = process.argv) {
    this.program.parse(args)
  }
}

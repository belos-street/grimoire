import { Command } from 'commander'
import chalk from 'chalk'
import { logger } from '../logger'
import { lintSkills } from '../lint'
import { printJson } from './shared'

interface LintCommandOptions {
  json?: boolean
}

export function registerLintCommand(program: Command): void {
  program
    .command('lint [skills...]')
    .description('Validate skill frontmatter, reference directories and links')
    .option('--json', 'output JSON for agent consumption', false)
    .action(async (skillNames: string[], options: LintCommandOptions) => {
      const results = await lintSkills(skillNames)
      const errorCount = results.reduce(
        (sum, result) => sum + result.errors.length,
        0
      )
      const warningCount = results.reduce(
        (sum, result) => sum + result.warnings.length,
        0
      )

      if (options.json) {
        printJson({ ok: errorCount === 0, errorCount, warningCount, results })
        if (errorCount > 0) process.exitCode = 1
        return
      }

      for (const result of results) {
        if (result.errors.length === 0 && result.warnings.length === 0) {
          logger.success(`${result.name}: ok`)
          continue
        }

        console.log(chalk.blue(result.name))
        for (const error of result.errors) {
          logger.error(`  ${error}`)
        }
        for (const warning of result.warnings) {
          logger.warn(`  ${warning}`)
        }
      }

      logger.dim(`\n${errorCount} error(s), ${warningCount} warning(s)`)
      if (errorCount > 0) process.exitCode = 1
    })
}

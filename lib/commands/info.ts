import { Command } from 'commander'
import chalk from 'chalk'
import { getSkillByName } from '../skill'
import { logger } from '../logger'

export function registerInfoCommand(program: Command): void {
  program
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

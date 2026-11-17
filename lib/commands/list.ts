import { Command } from 'commander'
import chalk from 'chalk'
import { getAllSkills } from '../skill'
import { logger } from '../logger'
import { parseTags, printJson } from './shared'

export function registerListCommand(program: Command): void {
  program
    .command('list')
    .description('List all available skills')
    .option('--json', 'output as JSON for agent consumption')
    .action(async (options: { json?: boolean }) => {
      const skills = await getAllSkills()

      if (options.json) {
        printJson(
          skills.map((skill) => ({
            name: skill.name,
            description: skill.description,
            tags: parseTags(skill.frontmatter.tags),
            references: skill.referenceCount,
            entryFile: skill.entryFile
          }))
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
}

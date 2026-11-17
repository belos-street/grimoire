import { Command } from 'commander'
import { registerAddCommand } from './commands/add'
import { registerInfoCommand } from './commands/info'
import { registerLintCommand } from './commands/lint'
import { registerListCommand } from './commands/list'
import { registerStatusCommand } from './commands/status'
import { registerSyncCommand } from './commands/sync'

export class CLI {
  private program: Command

  constructor() {
    this.program = new Command()
    this.program
      .name('skill-kit')
      .description('CLI tool for managing skill documentation')
      .version('1.0.0')

    registerListCommand(this.program)
    registerAddCommand(this.program)
    registerStatusCommand(this.program)
    registerSyncCommand(this.program)
    registerLintCommand(this.program)
    registerInfoCommand(this.program)
  }

  public run(args: string[] = process.argv) {
    this.program.parse(args)
  }
}

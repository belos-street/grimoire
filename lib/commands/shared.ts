import chalk from 'chalk'
import { cwd } from 'process'
import { join, relative, resolve } from 'path'
import type { AddResult } from '../generator'
import type { SkillStatus } from '../manifest'

export const DEFAULT_TARGET = '.agents/skills'

export function resolveTarget(to: string = DEFAULT_TARGET): string {
  return resolve(cwd(), to)
}

export function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2))
}

export function parseTags(raw?: string): string[] {
  if (!raw) return []
  return raw
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((tag) => tag.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean)
}

export function formatStatus(status: SkillStatus): string {
  switch (status) {
    case 'ok':
      return chalk.green(status)
    case 'outdated':
      return chalk.yellow(status)
    case 'modified':
      return chalk.magenta(status)
    case 'missing':
      return chalk.red(status)
    default:
      return String(status)
  }
}

export function skillLink(result: AddResult): string {
  if (!result.path || !result.entryFile) return result.skillName
  const link = relative(cwd(), join(result.path, result.entryFile)).replace(
    /\\/g,
    '/'
  )
  return `[${result.skillName}](${link})`
}

export function tableCell(text?: string): string {
  if (!text) return '-'
  const clean = text.replace(/\s+/g, ' ').replace(/\|/g, '\\|')
  return clean.length > 80 ? `${clean.slice(0, 77)}…` : clean
}

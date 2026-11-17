import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { lstat, mkdir, readFile, readlink, symlink, writeFile } from 'fs/promises'
import { join } from 'path'
import {
  copyDir,
  createSymlink,
  ensureDir,
  pathExists,
  removePath
} from '../fs'
import { cleanup, makeTempDir } from './helpers'

describe('fs helpers', () => {
  let root: string

  beforeEach(async () => {
    root = await makeTempDir('skill-kit-fs')
  })

  afterEach(async () => {
    await cleanup(root)
  })

  test('copyDir copies nested files', async () => {
    const source = join(root, 'source')
    const dest = join(root, 'dest')
    await mkdir(join(source, 'nested'), { recursive: true })
    await writeFile(join(source, 'root.txt'), 'root')
    await writeFile(join(source, 'nested', 'child.txt'), 'child')

    copyDir(source, dest)

    expect(await readFile(join(dest, 'root.txt'), 'utf-8')).toBe('root')
    expect(await readFile(join(dest, 'nested', 'child.txt'), 'utf-8')).toBe(
      'child'
    )
  })

  test('ensureDir creates nested directories', async () => {
    const dir = join(root, 'a', 'b', 'c')
    ensureDir(dir)
    expect((await lstat(dir)).isDirectory()).toBe(true)
  })

  test('createSymlink points at the source', async () => {
    const source = join(root, 'source')
    const link = join(root, 'links', 'source')
    await mkdir(source, { recursive: true })
    await writeFile(join(source, 'file.txt'), 'content')

    createSymlink(source, link)

    expect((await lstat(link)).isSymbolicLink()).toBe(true)
    expect(await readlink(link)).toBe(source)
    expect(await readFile(join(link, 'file.txt'), 'utf-8')).toBe('content')
  })

  test('removePath removes a symlink without deleting its target', async () => {
    const source = join(root, 'source')
    const link = join(root, 'link')
    await mkdir(source, { recursive: true })
    await writeFile(join(source, 'file.txt'), 'content')
    await symlink(source, link, 'dir')

    removePath(link)

    expect(await pathExists(link)).toBe(false)
    expect(await readFile(join(source, 'file.txt'), 'utf-8')).toBe('content')
  })

  test('removePath removes directories recursively and ignores missing paths', async () => {
    const dir = join(root, 'dir')
    await mkdir(join(dir, 'nested'), { recursive: true })
    await writeFile(join(dir, 'nested', 'file.txt'), 'content')

    removePath(dir)
    expect(await pathExists(dir)).toBe(false)

    removePath(join(root, 'missing'))
  })
})

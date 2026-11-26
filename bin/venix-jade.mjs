#!/usr/bin/env node
// The `venix-jade` command. In the published package `dist/shared` is plain
// JavaScript; in this repository, before a build, Node runs the source itself.
import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'

const built = new URL('../dist/shared/audit/cli.js', import.meta.url)

async function load() {
  if (existsSync(built)) return import(built.href)

  // The source imports without extensions, which Node alone doesn't resolve
  registerHooks({
    resolve(specifier, context, next) {
      try {
        return next(specifier, context)
      }
      catch (error) {
        if (!specifier.startsWith('.')) throw error
        return next(`${specifier}.ts`, context)
      }
    },
  })
  return import(new URL('../src/shared/audit/cli.ts', import.meta.url).href)
}

const { run } = await load()
process.exit(await run(process.argv.slice(2)))

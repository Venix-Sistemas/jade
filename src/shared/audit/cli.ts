// src/shared/audit/cli.ts
// The `venix-jade` command. Node only: nothing of the module or the app imports it.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { auditCode } from './code'
import type { CodeFinding, SourceFile } from './code'
import { auditTheme, listThemes } from './page'
import type { PageIssue } from './page'
import { withClaudeBlock } from './claude'

const HELP = `venix-jade: checks how a project uses the Jade colors

  venix-jade audit [folders...]       the code (default: the current folder)
  venix-jade audit --url <address>    also the page on screen, on every theme (repeatable)
      --no-code                       only the pages
      --json                          the findings as JSON
  venix-jade claude                   adds the color guide to this project's CLAUDE.md

Exits with 1 when there is an error. \`jade-audit-ignore\` in a comment on a line,
or the line above, keeps the code audit quiet about it.`

const SKIPPED_FOLDERS = new Set(['node_modules', '.nuxt', '.output', '.git', 'dist', 'coverage', '.data'])
const SOURCES = /\.(?:vue|css|scss|less)$/

function collect(path: string, files: string[] = []): string[] {
  if (statSync(path).isFile()) {
    if (SOURCES.test(path)) files.push(path)
    return files
  }
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIPPED_FOLDERS.has(entry.name)) continue
    if (entry.isDirectory() || SOURCES.test(entry.name)) collect(join(path, entry.name), files)
  }
  return files
}

/** Playwright, from the project first: it is optional, only the page audit needs it. */
async function loadBrowser() {
  const require = createRequire(pathToFileURL(join(process.cwd(), 'package.json')))
  for (const name of ['playwright', 'playwright-core']) {
    let found: string
    try {
      found = require.resolve(name)
    }
    catch {
      continue
    }
    const playwright = await import(pathToFileURL(found).href)
    const chromium = playwright.chromium ?? playwright.default.chromium
    // Its own browser when installed, else the one on the machine
    for (const channel of [undefined, 'chrome', 'msedge']) {
      try {
        return await chromium.launch(channel ? { channel } : {})
      }
      catch { /* the next one */ }
    }
    throw new Error('No browser to open the page with. Install one: npx playwright install chromium')
  }
  throw new Error('The page audit needs Playwright: npm install -D playwright')
}

type ScreenIssue = PageIssue & { url: string, themes: string[] }

async function auditPages(urls: string[]): Promise<{ issues: ScreenIssue[], themes: number }> {
  const browser = await loadBrowser()
  const found = new Map<string, ScreenIssue>()
  let themes = 0
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    for (const url of urls) {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 120_000 })
      const ids: string[] = await page.evaluate(listThemes)
      if (!ids.length) throw new Error(`No Jade theme on ${url}`)
      themes = Math.max(themes, ids.length)
      for (const theme of ids) {
        for (const issue of await page.evaluate(auditTheme, theme) as PageIssue[]) {
          const key = `${url} ${issue.selector} ${issue.colorToken} ${issue.backgroundToken}`
          const known = found.get(key)
          if (known) {
            if (!known.themes.includes(theme)) known.themes.push(theme)
            if (issue.ratio < known.ratio) Object.assign(known, issue)
          }
          else {
            found.set(key, { ...issue, url, themes: [theme] })
          }
        }
      }
    }
  }
  finally {
    await browser.close()
  }
  return { issues: [...found.values()].sort((a, b) => a.ratio - b.ratio), themes }
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

function printCode(findings: CodeFinding[], files: number) {
  let current = ''
  for (const finding of findings) {
    if (finding.file !== current) console.log(`\n${current = finding.file}`)
    console.log(`  ${finding.line}  ${finding.severity}  ${finding.rule}\n      ${finding.code}\n      ${finding.message}`)
  }
  const errors = findings.filter(finding => finding.severity === 'error').length
  console.log(`\nCode: ${plural(errors, 'error')}, ${plural(findings.length - errors, 'warning')} in ${plural(files, 'file')}.`)
}

function printPages(issues: ScreenIssue[], themes: number) {
  for (const issue of issues) {
    console.log(`\n${issue.selector}  "${issue.text}"\n  ${issue.ratio}:1, needs ${issue.min}:1  ${issue.color}${issue.colorToken ? ` (${issue.colorToken})` : ''} on ${issue.background}${issue.backgroundToken ? ` (${issue.backgroundToken})` : ''}`)
    console.log(`  ${plural(issue.themes.length, 'theme')}: ${issue.themes.slice(0, 6).join(', ')}${issue.themes.length > 6 ? '…' : ''}  ${issue.url}\n  ${issue.fix}`)
  }
  console.log(`\nScreen: ${plural(issues.length, 'text')} short of the contrast, over ${plural(themes, 'theme variant')}.`)
}

export async function run(argv: string[]): Promise<number> {
  const [command, ...rest] = argv

  if (command === 'claude') {
    const file = resolve('CLAUDE.md')
    writeFileSync(file, withClaudeBlock(existsSync(file) ? readFileSync(file, 'utf-8') : ''))
    console.log(`The Jade color guide is now in ${file}`)
    return 0
  }
  if (command !== 'audit') {
    console.log(HELP)
    return command && command !== 'help' && command !== '--help' ? 1 : 0
  }

  const urls: string[] = []
  const paths: string[] = []
  for (let i = 0; i < rest.length; i++) {
    const argument = rest[i]!
    if (argument === '--url' && rest[i + 1]) urls.push(rest[++i]!)
    else if (!argument.startsWith('--')) paths.push(argument)
    else if (argument !== '--no-code' && argument !== '--json') {
      console.error(`Unknown option: ${argument}`)
      return 1
    }
  }

  const json = rest.includes('--json')
  let code: CodeFinding[] = []
  if (!rest.includes('--no-code')) {
    const missing = paths.find(path => !existsSync(path))
    if (missing) {
      console.error(`No such file or folder: ${missing}`)
      return 1
    }
    const files: SourceFile[] = (paths.length ? paths : ['.']).flatMap(path => collect(resolve(path)))
      .map(path => ({ path: relative(process.cwd(), path).replaceAll('\\', '/'), content: readFileSync(path, 'utf-8') }))
    code = auditCode(files)
    if (!json) printCode(code, files.length)
  }

  let screen: ScreenIssue[] = []
  if (urls.length) {
    try {
      const result = await auditPages(urls)
      screen = result.issues
      if (!json) printPages(screen, result.themes)
    }
    catch (error) {
      console.error((error as Error).message)
      return 1
    }
  }

  if (json) console.log(JSON.stringify({ code, screen }, null, 2))
  return screen.length || code.some(finding => finding.severity === 'error') ? 1 : 0
}

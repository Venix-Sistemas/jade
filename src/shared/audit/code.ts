// src/shared/audit/code.ts
// The audit of the source code (`venix-jade audit`): color uses that are
// legible only by luck. Pure functions over the text of the files.
import { COLOR_PROPERTIES } from '../constants'
import { TOKEN_NAMES, TOKEN_ROLES } from '../token-names'

export type Severity = 'error' | 'warning'

export type CodeRule = 'brand-text' | 'on-mismatch' | 'fixed-color' | 'unknown-var' | 'faded' | 'mixed-color'

export interface CodeFinding {
  file: string
  line: number
  severity: Severity
  rule: CodeRule
  /** The declaration that was found, as written. */
  code: string
  message: string
}

export interface SourceFile {
  path: string
  content: string
}

interface Declaration {
  property: string
  value: string
  line: number
}

interface Rule {
  selector: string
  declarations: Declaration[]
}

/** On a line, or the one above it, keeps the audit quiet about it. */
export const IGNORE_MARK = 'jade-audit-ignore'

const KNOWN = new Set<string>([
  ...TOKEN_NAMES,
  ...COLOR_PROPERTIES,
  'scheme',
  'inverse',
])
/** Families of variables that aren't colors of a theme, with open-ended names. */
const OPEN_FAMILIES = ['cursor-', 'scrollbar-', 'font-']

const ROLES = TOKEN_ROLES as readonly string[]
const NAMED_COLORS = /(?<![\w-])(?:white|black|red|blue|green|yellow|orange|purple|pink|gray|grey|silver|navy|teal|brown|gold|lime|cyan|magenta)(?![\w-])/i
const LITERAL_COLOR = /#[\da-f]{3,8}(?![\w-])|(?<![\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/i

const TEXT_PROPERTIES = ['color', '-webkit-text-fill-color']
const BACKGROUND_PROPERTIES = ['background', 'background-color']
const BORDER_PROPERTIES = /^(?:border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?(?:-color)?|outline(?:-color)?|fill|stroke)$/

/** The CSS of a file as rules, with the line of each declaration. Nested rules (SCSS) are kept apart. */
export function parseRules(css: string, firstLine = 1): Rule[] {
  const rules: Rule[] = []
  const stack: Rule[] = [{ selector: '', declarations: [] }]
  let buffer = ''
  let line = firstLine
  let startLine = firstLine
  let depth = 0
  let quote = ''

  const declare = () => {
    const match = /^\s*(-{0,2}[a-z][\w-]*)\s*:([\s\S]*)$/i.exec(buffer)
    if (match) stack.at(-1)!.declarations.push({ property: match[1]!.startsWith('--') ? match[1]! : match[1]!.toLowerCase(), value: match[2]!.trim(), line: startLine })
    buffer = ''
  }

  for (let i = 0; i < css.length; i++) {
    const char = css[i]!
    if (char === '\n') line++

    if (quote) {
      buffer += char
      if (char === quote && css[i - 1] !== '\\') quote = ''
      continue
    }
    if (char === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2)
      const comment = css.slice(i, end < 0 ? css.length : end + 2)
      line += comment.split('\n').length - 1
      i += comment.length - 1
      continue
    }
    // A line comment (SCSS, Less): not the `//` of a URL
    if (char === '/' && css[i + 1] === '/' && !buffer.trim()) {
      const end = css.indexOf('\n', i)
      i = (end < 0 ? css.length : end) - 1
      continue
    }

    if (!buffer.trim()) startLine = line
    if (char === '"' || char === '\'') quote = char
    if (char === '(') depth++
    if (char === ')') depth--

    if (char === '{' && depth === 0) {
      const rule = { selector: buffer.trim(), declarations: [] }
      rules.push(rule)
      stack.push(rule)
      buffer = ''
    }
    else if (char === '}' && depth === 0) {
      declare()
      if (stack.length > 1) stack.pop()
    }
    else if (char === ';' && depth === 0) {
      declare()
    }
    else {
      buffer += char
    }
  }
  return rules
}

/** The CSS in a file: the whole of a stylesheet; the `<style>` blocks and `style="…"` of a component. */
function cssOf(file: SourceFile): Rule[] {
  if (!file.path.endsWith('.vue')) return parseRules(file.content)

  const rules: Rule[] = []
  const lineAt = (index: number) => file.content.slice(0, index).split('\n').length
  for (const block of file.content.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) {
    rules.push(...parseRules(block[1]!, lineAt(block.index + block[0].indexOf('>') + 1)))
  }
  // Static `style="…"` attributes; a bound one is an expression, not CSS
  for (const attribute of file.content.matchAll(/(?<![:\w-])style="([^"{}]*)"/g)) {
    rules.push(...parseRules(`inline{${attribute[1]}}`, lineAt(attribute.index)))
  }
  return rules
}

/** The name of every `var()` a value reads first: fallbacks only apply without it. */
function readsOf(value: string): string[] {
  const names: string[] = []
  let depth = 0
  const fallbackAt: number[] = []
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '(') depth++
    else if (value[i] === ')') {
      if (fallbackAt.at(-1) === depth) fallbackAt.pop()
      depth--
    }
    else if (value[i] === ',' && /var\(\s*--[\w-]+\s*$/.test(value.slice(0, i))) {
      fallbackAt.push(depth)
    }
    else if (!fallbackAt.length && value.startsWith('var(', i)) {
      const name = /^var\(\s*(--[\w-]+)/.exec(value.slice(i))?.[1]
      if (name) names.push(name)
    }
  }
  return names
}

/** The value with its `var()` calls taken out, fallbacks included. */
function withoutVars(value: string): string {
  let result = value
  let previous = ''
  while (previous !== result) {
    previous = result
    result = result.replace(/var\((?:[^()]|\([^()]*\))*\)/g, ' ')
  }
  return result
}

/** The role of a variable that is a theme color as it is (a fill or a seed), or `null`. */
function brandRole(name: string): string | null {
  const match = /^--(?:jade|color)-(?:fill-)?([a-z]+)(?:-hover)?$/.exec(name)
  return match && ROLES.includes(match[1]!) ? match[1]! : null
}

const onRole = (name: string): string | null => /^--jade-on-([a-z]+)$/.exec(name)?.[1] ?? null

/** The closest known name, for a variable that doesn't exist. */
function closest(name: string): string {
  const distance = (a: string, b: string) => {
    const row = Array.from({ length: b.length + 1 }, (_, i) => i)
    for (let i = 1; i <= a.length; i++) {
      let last = row[0]!
      row[0] = i
      for (let j = 1; j <= b.length; j++) {
        const keep = row[j]!
        row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, last + (a[i - 1] === b[j - 1] ? 0 : 1))
        last = keep
      }
    }
    return row[b.length]!
  }
  // The same words in another order (`primary-text` for `text-primary`) count as closest
  const words = (value: string) => value.split('-').sort().join('-')
  return [...KNOWN].find(known => words(known) === words(name))
    ?? [...KNOWN].reduce((best, known) => distance(name, known) < distance(name, best) ? known : best)
}

export function auditCode(files: SourceFile[]): CodeFinding[] {
  const parsed = files.map(file => ({ file, rules: cssOf(file) }))

  // The project's own variables, to follow `color: var(--my-title)` to what it reads
  const definitions = new Map<string, string[]>()
  for (const { rules } of parsed) {
    for (const rule of rules) {
      for (const { property, value } of rule.declarations) {
        if (property.startsWith('--') && !property.startsWith('--jade-')) definitions.set(property, [...definitions.get(property) ?? [], value])
      }
    }
  }
  const resolve = (value: string, seen = new Set<string>()): string[] => readsOf(value).flatMap((name) => {
    if (/^--(?:jade|color)-/.test(name) || seen.has(name)) return [name]
    seen.add(name)
    return (definitions.get(name) ?? []).flatMap(own => resolve(own, seen))
  })

  const findings: CodeFinding[] = []
  for (const { file, rules } of parsed) {
    const lines = file.content.split('\n')
    const ignored = (line: number) => [line - 1, line - 2].some(i => lines[i]?.includes(IGNORE_MARK))
    const report = (declaration: Declaration, severity: Severity, rule: CodeRule, message: string) => {
      if (!ignored(declaration.line)) findings.push({ file: file.path, line: declaration.line, severity, rule, code: `${declaration.property}: ${declaration.value}`, message })
    }

    // Variables that don't exist, wherever they are read: markup and scripts too
    lines.forEach((text, index) => {
      for (const [, name] of text.matchAll(/var\(\s*--jade-([a-z][a-z0-9-]*)(?=\s*[,)])/g)) {
        if (KNOWN.has(name!) || OPEN_FAMILIES.some(family => name!.startsWith(family))) continue
        report({ property: 'var', value: `--jade-${name}`, line: index + 1 }, 'error', 'unknown-var', `\`--jade-${name}\` doesn't exist. Did you mean \`--jade-${closest(name!)}\`?`)
      }
      // Utility classes with an arbitrary value: `text-[var(--jade-fill-primary)]`
      for (const [found, name] of text.matchAll(/(?<![\w-])text-\[var\((--(?:jade|color)-[\w-]+)\)\]/g)) {
        const role = brandRole(name!)
        if (role) report({ property: 'class', value: found, line: index + 1 }, 'error', 'brand-text', `A theme color as text is legible only when the color helps. Use \`--jade-text-${role}\`.`)
      }
    })

    for (const rule of rules) {
      const last = (properties: string[]) => rule.declarations.filter(({ property }) => properties.includes(property)).at(-1)
      const text = last(TEXT_PROPERTIES)
      const background = last(BACKGROUND_PROPERTIES)
      const textReads = text ? resolve(text.value) : []
      const backgroundReads = background ? resolve(background.value) : []
      // A tint mixed from a theme color is not that color's fill
      const fill = background && !background.value.includes('color-mix(') ? backgroundReads.map(brandRole).find(Boolean) : undefined

      if (text && fill) {
        // A theme color behind text takes only its own `on-` color
        if (!textReads.includes(`--jade-on-${fill}`) && !/^(?:inherit|transparent)$/.test(text.value)) {
          report(text, 'error', 'on-mismatch', `Over a \`${fill}\` fill the text is \`var(--jade-on-${fill})\`.`)
        }
      }
      else if (text) {
        const role = textReads.map(brandRole).find(Boolean)
        const inverted = backgroundReads.some(name => onRole(name) === role)
        if (role && !inverted) report(text, 'error', 'brand-text', `A theme color as text is legible only when the color helps. Use \`var(--jade-text-${role})\`, or \`var(--jade-text)\` for plain text.`)
      }
      const on = textReads.map(onRole).find(Boolean)
      if (text && on && background && !fill) report(text, 'error', 'on-mismatch', `\`on-${on}\` goes only over \`var(--jade-fill-${on})\`.`)

      for (const declaration of rule.declarations) {
        const { property, value } = declaration
        if (property.startsWith('--')) continue
        const isText = TEXT_PROPERTIES.includes(property)
        const isBackground = BACKGROUND_PROPERTIES.includes(property)
        const painted = isText || isBackground || BORDER_PROPERTIES.test(property)
        const literal = painted && withoutVars(value.replace(/url\([^)]*\)/g, ' '))

        if (literal && (LITERAL_COLOR.test(literal) || NAMED_COLORS.test(literal))) {
          const use = isText ? '--jade-text' : isBackground ? '--jade-bg-subtle' : '--jade-border'
          report(declaration, isText || isBackground ? 'error' : 'warning', 'fixed-color', `A fixed color doesn't follow the theme or the mode. Use a token, such as \`var(${use})\`.`)
        }
        if ((isText || isBackground) && value.includes('color-mix(')) {
          report(declaration, 'warning', 'mixed-color', 'A mixed color has no guaranteed contrast. Use a token: `bg-<role>` is the soft tone of a color.')
        }
        if (property === 'opacity' && /^(?:0?\.\d+|\d{1,2}%)$/.test(value) && !/:disabled|\[disabled|aria-disabled|^(?:from|to|\d+%)/.test(rule.selector)) {
          report(declaration, 'warning', 'faded', 'Faded text loses contrast. Use `var(--jade-text-muted)`.')
        }
      }
    }
  }

  return findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
}

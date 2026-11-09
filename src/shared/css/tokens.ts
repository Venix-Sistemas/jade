// src/shared/css/tokens.ts
import type { ContrastLevel, ThemeColors } from '../types'
import { contrastRatio } from '../utils/contrast'
import { generateScales } from '../utils/scale'
import type { RoleScale } from '../utils/scale'
import { NEUTRAL_TOKENS, ROLE_TOKENS, TOKEN_ROLES as ROLES, roleTokenName } from '../token-names'

/**
 * The semantic color tokens of a theme variant (v1.4.0, experimental).
 *
 * Name: `--color-<property>[-<role>][-<variant>][-<state>]`, where the
 * property says what the color is for (`bg`, `text`, `fill`, `on`, `border`).
 * Each token points at a step of the generated scales, whose pairs are
 * placed to meet WCAG contrast by construction (see `utils/scale.ts`).
 *
 * Roles in this version: `primary` and `secondary`, from the variant's seeds.
 */

/** Used when a token theme variant sets no `background`. */
const FALLBACK_BACKGROUND = { light: '#FFFFFF', dark: '#121212' } as const

const tokenCache = new Map<string, Array<[string, string]>>()

/**
 * `[name, hex]` pairs, without the `--color-` prefix, in the order they are
 * written. Memoized: the CSS and the build check ask for the same variant.
 */
export function generateTokens(colors: ThemeColors, level: ContrastLevel = 'AA'): Array<[string, string]> {
  const key = JSON.stringify([colors.dark === true, colors.background, colors.primary, colors.secondary, level])
  let tokens = tokenCache.get(key)
  if (!tokens) {
    tokens = buildTokens(colors, level)
    tokenCache.set(key, tokens)
  }
  return tokens
}

function buildTokens(colors: ThemeColors, level: ContrastLevel): Array<[string, string]> {
  const mode = colors.dark === true ? 'dark' : 'light'
  const background = colors.background ?? FALLBACK_BACKGROUND[mode]

  const seeds: Record<string, string> = {}
  for (const role of ROLES) {
    const seed = colors[role]
    if (seed) seeds[role] = seed
  }

  const { neutral, roles } = generateScales(background, seeds, mode, level)
  const tokens: Array<[string, string]> = NEUTRAL_TOKENS.map(([name, step]) => [name, neutral[step - 1]!])

  const primary = roles.primary
  if (primary) tokens.push(['border-focus', primary.steps[10]!])

  for (const role of ROLES) {
    const scale: RoleScale | undefined = roles[role]
    if (!scale) continue
    for (const [name, step] of ROLE_TOKENS) {
      tokens.push([roleTokenName(name, role), scale.steps[step - 1]!])
    }
    tokens.push([`on-${role}`, scale.on])
  }

  return tokens
}

/** The `--color-*` declarations for `generateTokens`, one per line, indented for a theme block. */
export function generateTokenVars(colors: ThemeColors, level: ContrastLevel = 'AA'): string {
  return generateTokens(colors, level)
    .map(([name, value]) => `  --color-${name}: ${value};`)
    .join('\n')
}

/** A token used as text or outline, the tokens it sits on, and which kind of contrast it needs. */
type PairRule = [text: string, surfaces: string[], kind: 'text' | 'outline']

const NEUTRAL_SURFACES = ['bg', 'bg-subtle', 'bg-muted']

const NEUTRAL_RULES: PairRule[] = [
  ['text', [...NEUTRAL_SURFACES, 'bg-hover', 'bg-active'], 'text'],
  ['text-muted', NEUTRAL_SURFACES, 'text'],
  ['border-strong', ['bg', 'bg-subtle'], 'outline'],
  ['border-focus', ['bg', 'bg-subtle'], 'outline'],
]

function roleRules(role: string): PairRule[] {
  return [
    [`on-${role}`, [`fill-${role}`, `fill-${role}-hover`], 'text'],
    [`text-${role}`, [...NEUTRAL_SURFACES, `bg-${role}`], 'text'],
    [`text-${role}-strong`, [`bg-${role}-hover`, `bg-${role}-active`], 'text'],
    ['text', [`bg-${role}`, `bg-${role}-active`], 'text'],
    [`border-${role}-strong`, ['bg'], 'outline'],
  ]
}

/** WCAG 1.4.11: an outline that identifies a control needs 3:1 at both levels. */
const OUTLINE_MIN = 3
const TEXT_MIN: Record<ContrastLevel, number> = { AA: 4.5, AAA: 7 }

export interface TokenContrastIssue {
  /** The token used as text or outline. */
  text: string
  /** The token it sits on. */
  surface: string
  ratio: number
  min: number
}

/**
 * The pairs that fall short of `level`: text 4.5:1 (7:1 for AAA), outlines
 * 3:1. A pair is skipped when either token doesn't exist (a theme without
 * `secondary` has no `text-secondary`).
 */
export function checkTokenContrast(tokens: Array<[string, string]>, level: ContrastLevel): TokenContrastIssue[] {
  const byName = new Map(tokens)
  const roles = ROLES.filter(role => byName.has(`fill-${role}`))
  const issues: TokenContrastIssue[] = []

  for (const [text, surfaces, kind] of [...NEUTRAL_RULES, ...roles.flatMap(roleRules)]) {
    const foreground = byName.get(text)
    if (!foreground) continue
    const min = kind === 'text' ? TEXT_MIN[level] : OUTLINE_MIN
    for (const surface of surfaces) {
      const background = byName.get(surface)
      if (!background) continue
      const ratio = contrastRatio(foreground, background)
      if (ratio < min) issues.push({ text, surface, ratio, min })
    }
  }

  return issues
}

/** Truncated, not rounded, so a 4.496 doesn't read as a pass against 4.5. */
const formatRatio = (ratio: number) => (Math.floor(ratio * 100) / 100).toFixed(2)

/**
 * One build warning per token theme variant with pairs below `level`, or an
 * empty list when everything passes. Variants without `tokens: true` are skipped.
 */
export function findTokenContrastIssues(themes: Record<string, ThemeColors>, level: ContrastLevel): string[] {
  const messages: string[] = []

  for (const [id, colors] of Object.entries(themes)) {
    if (colors.tokens !== true) continue
    const issues = checkTokenContrast(generateTokens(colors, level), level)
    if (!issues.length) continue

    const pairs = issues
      .map(issue => `\`${issue.text}\` on \`${issue.surface}\` ${formatRatio(issue.ratio)}:1 (needs ${issue.min}:1)`)
      .join('; ')
    const hint = level === 'AAA'
      ? 'Pick another seed, or set `color.contrast` to `\'AA\'` (or `false` to skip this check).'
      : 'Pick another seed, or set `color.contrast` to `false` to skip this check.'
    messages.push(`The semantic tokens of \`${id}\` fall short of WCAG ${level}: ${pairs}. ${hint}`)
  }

  return messages
}

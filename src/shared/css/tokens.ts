// src/shared/css/tokens.ts
import type { ThemeColors } from '../types'
import { generateScales } from '../utils/scale'
import type { ContrastLevel, RoleScale } from '../utils/scale'

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

const ROLES = ['primary', 'secondary'] as const

/** Neutral tokens and the step (1–12) of the neutral scale each one uses. */
const NEUTRAL_TOKENS: Array<[name: string, step: number]> = [
  ['bg', 1],
  ['bg-subtle', 2],
  ['bg-muted', 3],
  ['bg-hover', 4],
  ['bg-active', 5],
  ['border', 6],
  ['border-strong', 9],
  ['text', 12],
  ['text-muted', 11],
  ['text-disabled', 8],
]

/** Per-role tokens and the step (1–12) of the role's scale each one uses. */
const ROLE_TOKENS: Array<[name: string, step: number]> = [
  ['fill', 9],
  ['fill-hover', 10],
  ['bg', 3],
  ['bg-hover', 4],
  ['bg-active', 5],
  ['text', 11],
  ['text-strong', 12],
  ['border', 7],
  ['border-strong', 11],
]

/** `[name, hex]` pairs, without the `--color-` prefix, in the order they are written. */
export function generateTokens(colors: ThemeColors, level: ContrastLevel = 'AA'): Array<[string, string]> {
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
      const [property, ...rest] = name.split('-')
      tokens.push([[property, role, ...rest].join('-'), scale.steps[step - 1]!])
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

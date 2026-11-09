// src/shared/token-names.ts

/**
 * Names of the semantic color tokens (v1.4.0, experimental), kept apart from
 * the code that generates their values (`css/tokens.ts`, which pulls in the
 * color engine) so the UnoCSS preset can list them without loading it.
 *
 * Name: `--color-<property>[-<role>][-<variant>][-<state>]`, where the
 * property says what the color is for (`bg`, `text`, `fill`, `on`, `border`).
 */

/** The roles that get their own tokens. */
export const TOKEN_ROLES = ['primary', 'secondary'] as const

/** Neutral tokens and the step (1–12) of the neutral scale each one uses. */
export const NEUTRAL_TOKENS: ReadonlyArray<readonly [name: string, step: number]> = [
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

/** Per-role tokens and the step (1–12) of the role's scale each one uses. `on` is not a step: white or black. */
export const ROLE_TOKENS: ReadonlyArray<readonly [name: string, step: number]> = [
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

/** `roleTokenName('fill-hover', 'primary')` → `'fill-primary-hover'`: the role goes after the property. */
export function roleTokenName(name: string, role: string): string {
  const [property, ...rest] = name.split('-')
  return [property, role, ...rest].join('-')
}

/** Every token name a theme with both roles and a primary gets, in the order they are written. */
export const TOKEN_NAMES: readonly string[] = [
  ...NEUTRAL_TOKENS.map(([name]) => name),
  'border-focus',
  ...TOKEN_ROLES.flatMap(role => [
    ...ROLE_TOKENS.map(([name]) => roleTokenName(name, role)),
    `on-${role}`,
  ]),
]

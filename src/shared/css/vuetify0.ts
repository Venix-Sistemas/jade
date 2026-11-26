// src/shared/css/vuetify0.ts
import type { ThemeColors } from '../types'
import { onColor } from '../utils/contrast'
import { tokensEnabled, TOKEN_ROLES as ROLES } from '../token-names'

const HEX = /^#(?:[\da-f]{3}|[\da-f]{6})$/i

/**
 * The colors of a variant under Vuetify0's names (`--v0-primary`,
 * `--v0-on-surface`…), pointing at the module's variables, so they follow
 * whatever those become, inside a bold panel included. With `tokens` they come
 * from the semantic tokens; without, from the theme's colors, with black or
 * white computed for the `on-*`.
 */
export function vuetify0Colors(colors: ThemeColors): Record<string, string> {
  const result: Record<string, string> = {}

  if (tokensEnabled(colors)) {
    for (const role of ROLES) {
      if (!colors[role] && !colors.primary) continue
      result[role] = `var(--jade-fill-${role})`
      result[`on-${role}`] = `var(--jade-on-${role})`
    }
    return {
      ...result,
      'background': 'var(--jade-bg)',
      'on-background': 'var(--jade-text)',
      'surface': 'var(--jade-bg-subtle)',
      'on-surface': 'var(--jade-text)',
      'divider': 'var(--jade-border)',
    }
  }

  const hex = (name: keyof ThemeColors): string | undefined => {
    const value = colors[name]
    return typeof value === 'string' && HEX.test(value) ? value : undefined
  }

  for (const role of ROLES) {
    const value = hex(role)
    if (!value) continue
    result[role] = `var(--jade-${role})`
    result[`on-${role}`] = onColor(value)
  }

  const background = hex('background')
  if (!background) return result
  const surface = hex('background2') ? 'background2' : 'background'
  const divider = hex('background3') ? 'background3' : surface
  return {
    ...result,
    'background': 'var(--jade-background)',
    'on-background': onColor(background),
    'surface': `var(--jade-${surface})`,
    'on-surface': onColor(hex(surface)!),
    'divider': `var(--jade-${divider})`,
  }
}

/** The `--v0-*` declarations of a variant, one per line. */
export function vuetify0Vars(colors: ThemeColors): string {
  return Object.entries(vuetify0Colors(colors))
    .map(([name, value]) => `  --v0-${name}: ${value};`)
    .join('\n')
}

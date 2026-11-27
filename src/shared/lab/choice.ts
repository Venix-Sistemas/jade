// src/shared/lab/choice.ts
// A visitor's choices for a theme variant (`color.lab`). No color engine here:
// this is what loads with the page.
import type { BackgroundTone, ThemeBorders, ThemeColors, ThemeMenu } from '../types'
import { chromaOf, colorWithHue, hexToOklab, normalizeHex, oklabToHex } from '../utils/oklab'
import { neutralTintOf, surfacesOf, tokensEnabled } from '../token-names'
import { toneColor } from '../utils/background-tone'
import { COLOR_PROPERTIES } from '../constants'

/** Every color of a theme can be changed. The cookie names them by position: new ones go at the end. */
export const LAB_COLORS = COLOR_PROPERTIES
export type LabColor = typeof LAB_COLORS[number]

/** The page's own colors: kept light on a light variant, dark on a dark one. */
const BACKGROUNDS: readonly LabColor[] = ['background', 'background2', 'background3']

export interface LabChoice {
  /** The bold scope: areas painted in the brand color. */
  bold: boolean
  /** `neutralTint`. */
  tint: boolean | 'vivid'
  borders: ThemeBorders
  /** The side menu; left out, it follows the theme (`menu`) and its style. */
  menu?: ThemeMenu
  /** The page's color; left out, the theme's. */
  tone?: BackgroundTone
  /** The colors the visitor changed, as `#RRGGBB`; the others are the theme's. */
  colors?: Partial<Record<LabColor, string>>
}

export type LabChoices = Record<string, LabChoice>

/** How dark a light variant's `background` may get, and how light a dark one's (OKLab lightness). */
export const BACKGROUND_LIMIT = { light: 0.92, dark: 0.25 } as const

/** More than any project's themes: a longer cookie isn't one this module wrote. */
const MAX_VARIANTS = 40

const TINTS = { g: false, s: true, v: 'vivid' } as const
const VARIANT_ID = /^[\w-]+$/

/** The color as `#RRGGBB`, or `undefined` for anything that isn't a hex color. */
export function asHex(color: unknown): string | undefined {
  if (typeof color !== 'string' || !/^#(?:[\da-f]{3}){1,2}$/i.test(color.trim())) return undefined
  return normalizeHex(color.trim()).toUpperCase()
}

/** What the variant looks like as it is, as a starting choice. */
export function choiceOf(colors: ThemeColors): LabChoice {
  return {
    bold: tokensEnabled(colors) && surfacesOf(colors) === 'bold',
    tint: neutralTintOf(colors),
    borders: colors.borders ?? 'default',
  }
}

/**
 * A `background` kept on its side: light enough on a light variant, dark
 * enough on a dark one, or no text color could be read on it.
 */
export function limitBackground(color: string, dark: boolean): string {
  const lightness = hexToOklab(color)[0]
  const limit = dark ? BACKGROUND_LIMIT.dark : BACKGROUND_LIMIT.light
  if (dark ? lightness <= limit : lightness >= limit) return color
  return colorWithHue(limit, color, chromaOf(color)) ?? oklabToHex(limit, 0, 0) ?? color
}

/** The variant with the visitor's choices over it. The semantic tokens are on: the styles are made of them. */
export function applyChoice(colors: ThemeColors, choice: LabChoice): ThemeColors {
  const result: ThemeColors = {
    ...colors,
    tokens: tokensEnabled(colors) ? colors.tokens : true,
    neutralTint: choice.tint,
    borders: choice.borders,
  }
  delete result.surfaces
  if (choice.bold) result.surfaces = 'bold'
  if (choice.menu) result.menu = choice.menu
  for (const name of LAB_COLORS) {
    const hex = asHex(choice.colors?.[name])
    if (hex) result[name] = BACKGROUNDS.includes(name) ? limitBackground(hex, colors.dark === true) : hex
  }
  // Over the theme's page colors only: one the visitor picked stays as picked
  if (choice.tone) {
    for (const name of BACKGROUNDS) {
      if (result[name] && !asHex(choice.colors?.[name])) result[name] = toneColor(result[name], result.primary, choice.tone, colors.dark === true)
    }
  }
  return result
}

/** How the cookie writes a chosen menu. */
const MENUS = { mp: 'plain', mf: 'faint', ms: 'soft', mb: 'bold' } as const
/** The same for a chosen page color. */
const TONES = { bt: 'theme', bn: 'neutral', bb: 'brand' } as const

/** The cookie: per variant, `id,bold,tint,borders`, `mp`/`mf`/`ms`/`mb` for a chosen menu, `bt`/`bn`/`bb` for a chosen page color and one `position-RRGGBB` per changed color. */
export function encodeChoices(choices: LabChoices): string {
  return Object.entries(choices)
    .filter(([id]) => VARIANT_ID.test(id))
    .map(([id, choice]) => [
      id,
      choice.bold ? '1' : '0',
      choice.tint === 'vivid' ? 'v' : choice.tint ? 's' : 'g',
      choice.borders === 'soft' ? 'q' : 'd',
      ...(choice.menu ? [`m${choice.menu.charAt(0)}`] : []),
      ...(choice.tone ? [`b${choice.tone.charAt(0)}`] : []),
      ...LAB_COLORS.flatMap((name, i) => {
        const hex = asHex(choice.colors?.[name])
        return hex ? [`${i}-${hex.slice(1)}`] : []
      }),
    ].join(','))
    .join('|')
}

/**
 * The choices in a cookie. It is the visitor's to edit and ends up in CSS, so
 * every field is checked: an entry with anything unexpected, or of a variant
 * the project doesn't have, is dropped.
 */
export function decodeChoices(value: unknown, variants: readonly string[]): LabChoices {
  const choices: LabChoices = {}
  if (typeof value !== 'string') return choices

  for (const entry of value.split('|').slice(0, MAX_VARIANTS)) {
    const parts = entry.split(',')
    if (parts.length < 4 || parts.length > 6 + LAB_COLORS.length) continue
    const [id, bold, tint, borders, ...rest] = parts as [string, string, string, string, ...string[]]
    const menu = Object.hasOwn(MENUS, rest[0] ?? '') ? MENUS[rest[0] as keyof typeof MENUS] : undefined
    const afterMenu = menu ? rest.slice(1) : rest
    const tone = Object.hasOwn(TONES, afterMenu[0] ?? '') ? TONES[afterMenu[0] as keyof typeof TONES] : undefined
    const changed = tone ? afterMenu.slice(1) : afterMenu
    if (!VARIANT_ID.test(id) || !variants.includes(id)) continue
    if (!['0', '1'].includes(bold) || !Object.hasOwn(TINTS, tint) || !['d', 'q'].includes(borders)) continue

    const choice: LabChoice = { bold: bold === '1', tint: TINTS[tint as keyof typeof TINTS], borders: borders === 'q' ? 'soft' : 'default' }
    const colors = changed.map((color) => {
      const match = /^(\d)-([\da-f]{6})$/i.exec(color)
      const name = match && LAB_COLORS[Number(match[1])]
      return name ? [name, `#${match[2]!.toUpperCase()}`] as const : null
    })
    if (colors.includes(null) || changed.length > LAB_COLORS.length) continue
    if (menu) choice.menu = menu
    if (tone) choice.tone = tone
    if (colors.length) choice.colors = Object.fromEntries(colors as (readonly [LabColor, string])[])
    choices[id] = choice
  }
  return choices
}

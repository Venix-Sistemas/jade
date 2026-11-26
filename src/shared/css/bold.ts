// src/shared/css/bold.ts
import type { ContrastLevel, ThemeColors } from '../types'
import { contrastRatio } from '../utils/contrast'
import { deriveSeeds } from '../utils/derive-seeds'
import { chromaOf, colorWithHue, hexToOklab, normalizeHex } from '../utils/oklab'
import { generateScale } from '../utils/scale'
import type { RoleScale } from '../utils/scale'
import { NEUTRAL_TOKENS, ROLE_TOKENS, TOKEN_ROLES as ROLES, roleTokenName, surfacesOf, tokensEnabled } from '../token-names'

/**
 * The `bold` surfaces of a theme variant (`surfaces: 'bold'`, the default of a
 * light one): a scope for
 * areas painted in the brand color. Inside an element with
 * `data-jade-surface="bold"` the semantic tokens are redefined on a deep tone
 * of the first seed (`primary`), so a menu, a header or a card in the brand
 * color holds text, borders and buttons that reach the same WCAG contrast as
 * the rest of the page, with no component knowing about it.
 *
 * Layout of the scope: `bg` is the brand surface; the stronger neutral
 * backgrounds (`bg-subtle` … `bg-active`) go *away* from the text color
 * (darker under white text), so contrast only grows with them; the text is
 * white (black over a light seed), `text-muted` is the lightest tone that
 * still reaches the level over `bg`. `fill-primary` flips: it becomes the text
 * color (a white button on a green panel) and `on-primary` the panel color.
 */

const WHITE = '#FFFFFF'
const BLACK = '#000000'

/** The brand surface is placed this much beyond the level for the text, so muted text has room to differ from it. */
const MUTED_HEADROOM = 1.25
/** Seeds lighter than this (OKLab lightness) get dark text on a lightened surface; the others get white on a darkened one. */
const LIGHT_SEED_FROM = 0.62
/** ...in a dark variant, where seeds are lighter on purpose, only seeds lighter than this (yellows) do. */
const LIGHT_SEED_FROM_DARK_VARIANT = 0.82
/** How far the stronger neutral backgrounds sit from the surface, as a share of the way to black (or white). */
const SURFACE_STEPS = { 'bg-subtle': 0.1, 'bg-muted': 0.18, 'bg-hover': 0.26, 'bg-active': 0.34 } as const
/** How much of a role's seed its soft backgrounds inside the scope carry. */
const ROLE_HINT = 0.15
const TEXT_MIN: Record<ContrastLevel, number> = { AA: 4.5, AAA: 7 }
/** Slack over the target, so rounding to hex never lands under it. */
const SLACK = 1.01

const parse = (hex: string): [number, number, number] =>
  [1, 3, 5].map(i => Number.parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]

/** `from` moved `t` (0–1) of the way to `to`, channel by channel. */
function mix(from: string, to: string, t: number): string {
  const a = parse(from)
  const b = parse(to)
  return `#${a.map((c, i) => Math.round(c + (b[i]! - c) * t).toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

/**
 * The tone between `from` and `toward` whose contrast over `over` is `target`.
 * `at-least` takes the side of the search that reaches it (text, outlines);
 * `about` the middle. When even the far end can't reach it, that end.
 */
function mixForRatio(from: string, toward: string, over: string, target: number, reach: 'at-least' | 'about' = 'at-least'): string {
  const ratio = (t: number) => contrastRatio(mix(from, toward, t), over)
  const increasing = ratio(1) > ratio(0)
  if ((increasing ? ratio(1) : ratio(0)) < target) return increasing ? toward : from

  let low = 0
  let high = 1
  for (let i = 0; i < 24; i++) {
    const middle = (low + high) / 2
    if (increasing === (ratio(middle) < target)) low = middle
    else high = middle
  }
  const t = reach === 'about' ? (low + high) / 2 : (increasing ? high : low)
  return mix(from, toward, t)
}

/**
 * The hover of a fill: the generated one when `on` keeps the level over it.
 * A seed about as bright as the panel leaves the scale no room to place a
 * hover on the right side, so then it is the seed moved away from `on` (darker
 * under white text, lighter under black) until the text reaches the level.
 */
function hoverKeepingText(seed: string, generated: string, on: string, min: number): string {
  if (contrastRatio(on, generated) >= min * SLACK) return generated
  const away = on === WHITE ? BLACK : WHITE
  for (let share = 0.08; share < 1; share += 0.04) {
    const candidate = mix(seed, away, share)
    if (contrastRatio(on, candidate) >= min * SLACK) return candidate
  }
  return away
}

/**
 * `shade` with as much of `seed` (up to `ROLE_HINT`) as every color in `texts`
 * still reaches the level over: a seed brighter than the shade takes contrast
 * from the text, and over a panel with little to spare that is too much.
 */
function hintKeepingText(shade: string, seed: string, texts: string[], min: number): string {
  for (let hint = ROLE_HINT; hint > 0; hint -= 0.03) {
    const candidate = mix(shade, seed, hint)
    if (texts.every(text => contrastRatio(text, candidate) >= min)) return candidate
  }
  return shade
}

/** `seed` with its lightness moved (hue and chroma kept, as far as the gamut allows) until `text` reaches `target` over it. */
function fitSurface(seed: string, text: string, target: number): string {
  if (contrastRatio(text, seed) >= target) return seed
  const direction = text === WHITE ? -1 : 1
  const chroma = chromaOf(seed)
  const L = hexToOklab(seed)[0]
  for (let step = 1; step <= 200; step++) {
    const candidate = colorWithHue(L + direction * step * 0.005, seed, chroma)
    if (candidate && contrastRatio(text, candidate) >= target) return candidate
  }
  return text === WHITE ? BLACK : WHITE
}

export interface BoldSurface {
  /** `[name, hex]` pairs, without the `--jade-` prefix, in the order of `generateTokens`. */
  tokens: Array<[string, string]>
  /** Whether the text is light on the surface (white text, dark scope): `color-scheme` and the Vuetify theme follow it. */
  dark: boolean
}

const boldCache = new Map<string, BoldSurface | null>()

/**
 * The tokens of the bold scope of a variant, or `null` when it has none: its
 * `surfaces` aren't `'bold'` (see `surfacesOf`), or it has no seed to build the
 * surface from.
 */
export function generateBoldSurface(colors: ThemeColors, level: ContrastLevel = 'AA'): BoldSurface | null {
  if (surfacesOf(colors) !== 'bold' || !tokensEnabled(colors)) return null
  const key = JSON.stringify([colors.dark === true, ROLES.map(role => colors[role]), level])
  if (!boldCache.has(key)) boldCache.set(key, buildBoldSurface(colors, level))
  return boldCache.get(key)!
}

function buildBoldSurface(colors: ThemeColors, level: ContrastLevel): BoldSurface | null {
  const first = ROLES.find(role => colors[role])
  const brand = first && colors[first]
  if (!first || !brand) return null

  // Light text on a deep tone of the seed, unless the seed is so light that
  // reaching it would mean changing its color: then dark text on a lighter one.
  // A dark variant tolerates a lighter seed (its primary is usually a light tone, so
  // it reads on the dark page) and still gets a deep panel with white text.
  const dark = hexToOklab(normalizeHex(brand))[0] < (colors.dark === true ? LIGHT_SEED_FROM_DARK_VARIANT : LIGHT_SEED_FROM)
  const text = dark ? WHITE : BLACK
  const away = dark ? BLACK : WHITE
  const min = TEXT_MIN[level]

  const surface = fitSurface(normalizeHex(brand), text, min * MUTED_HEADROOM)
  const stronger = (share: number) => mix(surface, away, share)

  const subtle = stronger(SURFACE_STEPS['bg-subtle'])
  const muted = stronger(SURFACE_STEPS['bg-muted'])
  const border = mixForRatio(surface, text, surface, 1.5, 'about')
  const borderStrong = mixForRatio(text, surface, surface, 3 * SLACK)
  const textMuted = mixForRatio(text, surface, surface, min * SLACK)
  const textDisabled = mixForRatio(text, surface, surface, 2, 'about')

  const neutralByStep: Record<string, string> = {
    'bg': surface,
    'bg-subtle': subtle,
    'bg-muted': muted,
    'bg-hover': stronger(SURFACE_STEPS['bg-hover']),
    'bg-active': stronger(SURFACE_STEPS['bg-active']),
    'border': border,
    'border-strong': borderStrong,
    'text': text,
    'text-muted': textMuted,
    'text-disabled': textDisabled,
  }
  const tokens: Array<[string, string]> = NEUTRAL_TOKENS.map(([name]) => [name, neutralByStep[name]!])
  tokens.push(['border-focus', text])

  // The roles other than the brand one are generated against this surface,
  // like any role is against the page. Only `neutral[0..2]` matters to them.
  const given: Record<string, string> = {}
  for (const role of ROLES) if (colors[role]) given[role] = colors[role]!
  const derived: Partial<Record<string, string>> = deriveSeeds(given, dark ? 'dark' : 'light')
  const neutral = [surface, subtle, muted, ...Array.from({ length: 9 }, () => text)]

  for (const role of ROLES) {
    const seed = given[role] ?? derived[role]
    if (!seed) continue

    if (role === first) {
      const fills = brandRoleTokens(role, { surface, text, subtle, muted, border, borderStrong, away, level })
      tokens.push(...fills)
      continue
    }

    const scale: RoleScale = generateScale(seed, neutral, dark ? 'dark' : 'light', level)
    // Its soft backgrounds are the panel's stronger shades with a hint of the
    // role, not the lighter steps the page version uses: they would sit
    // between the panel and the text and take contrast from it.
    const soft = (share: number, over: string[]) => hintKeepingText(stronger(share), seed, over, min)
    const [roleText, roleTextStrong] = [scale.steps[10]!, scale.steps[11]!]
    const byName: Record<string, string> = {
      'bg': soft(SURFACE_STEPS['bg-subtle'], [roleText, text]),
      'bg-hover': soft(SURFACE_STEPS['bg-muted'], [roleTextStrong]),
      'bg-active': soft(SURFACE_STEPS['bg-hover'], [roleTextStrong, text]),
    }
    byName['fill-hover'] = hoverKeepingText(seed, scale.steps[9]!, scale.on, min)
    for (const [name, step] of ROLE_TOKENS) tokens.push([roleTokenName(name, role), byName[name] ?? scale.steps[step - 1]!])
    tokens.push([`on-${role}`, scale.on])
  }

  return { tokens, dark }
}

/**
 * The role the surface is made of can't use its seed (it is the panel): its
 * fill flips to the text color, a white button on a green panel, with the
 * panel color as the text on it.
 */
function brandRoleTokens(
  role: string,
  s: { surface: string, text: string, subtle: string, muted: string, border: string, borderStrong: string, away: string, level: ContrastLevel },
): Array<[string, string]> {
  const min = TEXT_MIN[s.level]
  // Hover moves toward the panel, but stays far enough for `on-<role>` (the panel color) to keep the level on it.
  const fillHover = mixForRatio(s.text, s.surface, s.surface, min * 1.04 * SLACK)
  const pairs: Array<[string, string]> = [
    ['fill', s.text],
    ['fill-hover', fillHover],
    ['bg', s.subtle],
    ['bg-hover', s.muted],
    ['bg-active', mix(s.surface, s.away, 0.26)],
    ['text', s.text],
    ['text-strong', s.text],
    ['border', s.border],
    ['border-strong', s.borderStrong],
  ]
  return [
    ...pairs.map(([name, value]) => [roleTokenName(name, role), value] as [string, string]),
    [`on-${role}`, s.surface],
  ]
}

/** The selector of the scope, for a theme variant (`:root[data-theme='natal-light'] [data-jade-surface='bold']`). */
export function boldSelector(mode: string): string {
  return `:root[data-theme='${mode}'] [data-jade-surface='bold']`
}

/**
 * The CSS block of the bold scope of a variant, or an empty string when it has
 * none. Besides the tokens it paints the element itself (`background-color`,
 * `color`), so `<aside data-jade-surface="bold">` is a colored panel as it is.
 */
export function generateBoldCss(mode: string, colors: ThemeColors, level: ContrastLevel = 'AA', highContrast = false): string {
  const bold = generateBoldSurface(colors, level)
  if (!bold) return ''
  const vars = bold.tokens.map(([name, value]) => `  --jade-${name}: ${value};`).join('\n')
  let css = `\n/* Bold surfaces - ${mode} */\n${boldSelector(mode)} {\n`
    + `  color-scheme: ${bold.dark ? 'dark' : 'light'};\n`
    + `${vars}\n`
    // What the custom scrollbar reads inside the panel (see `css/scrollbar.ts`)
    + `  --jade-scrollbar-thumb: var(--jade-border-strong);\n`
    + `  --jade-scrollbar-thumb-hover: var(--jade-fill-primary);\n`
    + `  --jade-scrollbar-track: var(--jade-bg-subtle);\n`
    + `  --jade-scrollbar-border: var(--jade-bg-subtle);\n`
    + `  background-color: var(--jade-bg);\n`
    + `  color: var(--jade-text);\n`
    + `}\n`

  if (highContrast && level !== 'AAA') {
    const strict = generateBoldSurface(colors, 'AAA')
    const base = new Map(bold.tokens)
    const changed = strict?.tokens
      .filter(([name, value]) => base.get(name) !== value)
      .map(([name, value]) => `    --jade-${name}: ${value};`)
      .join('\n')
    if (changed) css += `@media (prefers-contrast: more) {\n  ${boldSelector(mode)} {\n${changed}\n  }\n}\n`
  }
  return css
}

// src/shared/css/faint-menu.ts
import type { ContrastLevel, ThemeColors } from '../types'
import { contrastRatio } from '../utils/contrast'
import { chromaOf, colorWithHue, hexToOklab, oklabToHex } from '../utils/oklab'
import { generateTokens } from './tokens'

/**
 * The `'faint'` side menu: the page's own tone with a trace of the brand, for
 * a menu that is barely set apart. The scale steps of `primary` are too
 * colorful for it (step 1 on a dark page is already a saturated red), so its
 * surfaces keep only a little of the primary's chroma, each a set contrast
 * away from the page.
 */

/** OKLab chroma of the surfaces: a trace of the hue. A primary with less keeps its own. */
const FAINT_CHROMA = 0.025
/** The `bg-primary` tones, a menu's selected item: a little more of the hue, so the choice shows. */
const SELECTED_CHROMA = 0.045

/** Each redefined surface and line: its contrast against the page and its chroma. */
const SURFACES = [
  ['bg', 1.05, FAINT_CHROMA],
  ['bg-subtle', 1.08, FAINT_CHROMA],
  ['bg-muted', 1.1, FAINT_CHROMA],
  ['bg-hover', 1.11, FAINT_CHROMA],
  ['bg-active', 1.17, FAINT_CHROMA],
  ['bg-primary', 1.11, SELECTED_CHROMA],
  ['bg-primary-hover', 1.13, SELECTED_CHROMA],
  ['bg-primary-active', 1.18, SELECTED_CHROMA],
  ['border', 1.25, FAINT_CHROMA],
] as const

/** What the menu's texts sit on. */
const BACKGROUNDS = SURFACES.map(([name]) => name).filter(name => name !== 'border')
const TEXT_MIN: Record<ContrastLevel, number> = { AA: 4.5, AAA: 7 }
/** WCAG 1.4.11: the outline of a form field. */
const OUTLINE_MIN = 3
/** How much OKLab lightness moves at each try. */
const STEP = 0.002

/** The first color from `L` on, going away from the page, that `passes`; the last tried when none does. */
function walk(L: number, away: 1 | -1, paint: (L: number) => string, passes: (color: string) => boolean): string {
  let color = paint(L)
  for (let next = L; !passes(color) && next > 0 && next < 1; next += away * STEP) color = paint(Math.min(1, Math.max(0, next)))
  return color
}

/**
 * The tokens a faint menu redefines, as `[name, hex]` pairs: its surfaces and
 * line, and the texts and field outline moved as far as needed to still read
 * on them at `level`. `null` without a `primary`.
 */
export function generateFaintMenu(colors: ThemeColors, level: ContrastLevel = 'AA'): Array<[string, string]> | null {
  const primary = colors.primary
  if (!primary) return null
  const page = new Map(generateTokens(colors, level))
  const background = page.get('bg')!
  const away = colors.dark === true ? 1 : -1
  const own = chromaOf(primary)

  const tinted = (chroma: number) => (L: number) => colorWithHue(L, primary, Math.min(chroma, own)) ?? oklabToHex(L, 0, 0)!
  const surfaces = new Map<string, string>(SURFACES.map(([name, ratio, chroma]) => [
    name,
    walk(hexToOklab(background)[0], away, tinted(chroma), color => contrastRatio(color, background) >= ratio),
  ]))
  const tokens: Array<[string, string]> = [...surfaces]

  // The page's texts were placed over the page's surfaces: the ones that fall
  // short here move, keeping their hue
  const move = (name: string, over: string[], min: number) => {
    const color = page.get(name)
    if (!color) return
    const [L] = hexToOklab(color)
    const own = chromaOf(color)
    const reads = (candidate: string) => over.every(surface => contrastRatio(candidate, surfaces.get(surface)!) >= min)
    if (reads(color)) return
    tokens.push([name, walk(L, away, next => colorWithHue(next, color, own) ?? oklabToHex(next, 0, 0)!, reads)])
  }

  for (const name of ['text', 'text-muted', ...[...page.keys()].filter(key => /^text-(?:primary|secondary|accent|error|info|success|warning)$/.test(key))]) {
    move(name, BACKGROUNDS, TEXT_MIN[level])
  }
  for (const name of ['border-strong', 'border-focus']) move(name, ['bg', 'bg-subtle'], OUTLINE_MIN)

  return tokens
}

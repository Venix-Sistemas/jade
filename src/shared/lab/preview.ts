// src/shared/lab/preview.ts
// The part of `color.lab` that needs the color engine, imported on demand.
import type { ContrastLevel, ThemeColors } from '../types'
import { generateBoldSurface } from '../css/bold'
import { generateThemeVars } from '../css/colors'
import { generateMenuSurface } from '../css/menu'
import { checkTokenContrast, generateTokens } from '../css/tokens'
import { applyChoice } from './choice'
import { chromaOf, colorWithHue, hexToOklab, oklabToHex } from '../utils/oklab'
import { contrastRatio } from '../utils/contrast'
import { TOKEN_ROLES } from '../token-names'
import type { LabChoice, LabChoices, LabColor } from './choice'

export interface LabBuildOptions {
  contrast: ContrastLevel
  highContrast: boolean
  legacyNames: boolean
  vuetify0: boolean
}

/**
 * What the brand and status colors keep over the page, so what a site paints
 * with them (a button, a title, an alert) can still be told apart from it.
 */
const BRAND_MIN = 3

const pairs = (colors: ThemeColors, level: ContrastLevel): string[] => {
  const tokens = generateTokens(colors, level)
  const byName = new Map(tokens)
  return [
    ...checkTokenContrast(tokens, level).map(issue => `${issue.text} / ${issue.surface}`),
    ...checkTokenContrast(generateBoldSurface(colors, level)?.tokens ?? [], level).map(issue => `bold: ${issue.text} / ${issue.surface}`),
    ...checkTokenContrast(generateMenuSurface(colors, level)?.tokens ?? [], level).map(issue => `menu: ${issue.text} / ${issue.surface}`),
    ...TOKEN_ROLES
      .filter(role => byName.has(`fill-${role}`) && contrastRatio(byName.get(`fill-${role}`)!, byName.get('bg')!) < BRAND_MIN)
      .map(role => `fill-${role} / bg`),
  ]
}

/**
 * The text and outline pairs a variant would lose the contrast level on: the
 * ones the choice brings, not those the theme already has as it is.
 */
export function lostContrast(base: ThemeColors, chosen: ThemeColors, level: ContrastLevel): string[] {
  const already = new Set(pairs({ ...base, tokens: base.tokens || true }, level))
  return pairs(chosen, level).filter(pair => !already.has(pair))
}

/** The lightness steps tried around a color (OKLab), and how many tones get the full check. */
const LIGHTNESS_STEP = 0.03
const MAX_STEPS = 30
const MAX_CHECKS = 12

/**
 * The color to use for `name` when the visitor picks `color`: itself when
 * nothing loses legibility with it, else the closest tone, of the same hue,
 * lighter or darker, that keeps everything readable. `null` when none is found.
 * What comes back may still be adjusted by `applyChoice` (a background is kept
 * on its side).
 */
export function nearestColor(base: ThemeColors, choice: LabChoice, name: LabColor, color: string, level: ContrastLevel): string | null {
  const withColor = (tone: string): ThemeColors => applyChoice(base, { ...choice, colors: { ...choice.colors, [name]: tone } })
  const passes = (tone: string): boolean => !lostContrast(base, withColor(tone), level).length
  if (passes(color)) return color

  // Cheap first filter for a brand or status color: the full check builds every scale
  const background = (TOKEN_ROLES as readonly string[]).includes(name) ? applyChoice(base, choice).background : undefined
  const lightness = hexToOklab(color)[0]
  const chroma = chromaOf(color)
  let checks = 0

  for (let step = 1; step <= MAX_STEPS; step++) {
    for (const direction of [-1, 1]) {
      const target = lightness + direction * step * LIGHTNESS_STEP
      if (target < 0 || target > 1) continue
      const tone = colorWithHue(target, color, chroma) ?? oklabToHex(target, 0, 0)
      if (!tone || (background && contrastRatio(tone, background) < BRAND_MIN)) continue
      if (passes(tone)) return tone
      if (++checks === MAX_CHECKS) return null
    }
  }
  return null
}

/** The CSS of the visitor's choices, over the built one. */
export function choicesCss(themes: Record<string, ThemeColors>, choices: LabChoices, options: LabBuildOptions): string {
  return Object.entries(choices)
    .filter(([id]) => themes[id])
    .map(([id, choice]) => generateThemeVars(id, applyChoice(themes[id]!, choice), options.contrast, options.highContrast, {
      legacyNames: options.legacyNames,
      vuetify0: options.vuetify0,
      lab: 'preview',
    }))
    .join('\n')
}

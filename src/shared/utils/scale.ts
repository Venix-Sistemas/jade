// src/shared/utils/scale.ts
import { BackgroundColor, Color, Theme } from '@adobe/leonardo-contrast-colors'
import type { CssColor } from '@adobe/leonardo-contrast-colors'
import type { ThemeMode } from '../types'
import { contrastRatio } from './contrast'
import { lightnessOf, normalizeHex, tintToward } from './oklab'

/**
 * Build-time color scales for the semantic tokens (v1.4.0, experimental).
 *
 * A scale has 12 steps, defined by their contrast ratio against the theme's
 * background (not by fixed lightness), so the same ratios work in light and
 * dark mode. Importing this file pulls in the color engine: use it only at
 * build time (module setup), never from `src/runtime/`.
 */

/** Target of the text steps: WCAG AA (4.5:1) or AAA (7:1). */
export type ContrastLevel = 'AA' | 'AAA'

export interface RoleScale {
  /** The 12 steps, light to strong, as `#RRGGBB`. Step 9 (index 8) is the seed. */
  steps: string[]
  /** Text and icon color on steps 9 and 10: white or black, whichever contrasts more. */
  on: '#FFFFFF' | '#000000'
}

export interface GeneratedScales {
  /** The neutral scale; step 1 (index 0) is exactly the background. */
  neutral: string[]
  roles: Record<string, RoleScale>
}

/** Contrast ratios of the neutral steps against the background. */
const NEUTRAL_RATIOS = [1, 1.05, 1.12, 1.2, 1.3, 1.5, 1.8, 2.3, 3, 3.5, 4.5, 12]

/** Ratios of role steps 1–8 (squeezed under the seed's own ratio when needed, see `fitUnderSeed`). */
const ROLE_RATIOS = [1.05, 1.12, 1.2, 1.3, 1.5, 1.8, 2.3, 3]

/** Gap kept between each border step and the next one, as a contrast ratio. */
const STEP_GAP = 0.01
/** Distance kept between step 8 and the seed (step 9), as a contrast ratio. */
const SEED_GAP = 0.1
/** How far the hover (step 10) sits from the seed, as a factor on its ratio. */
const HOVER_FACTOR = 1.12
/** Colored text (step 11) sits at least this much farther from the background than the seed. */
const TEXT_FACTOR = 1.15
/** Strong colored text (step 12) sits at least this much farther than the seed. */
const STRONG_TEXT_FACTOR = 1.4
/** No step is placed beyond this ratio: white on a near-black background tops out around 19.5. */
const MAX_RATIO = 15
/** WCAG 1.4.11: what a control's outline needs against what surrounds it. */
const OUTLINE_TARGET = 3
/** Extra distance asked of a text step each time it falls short of its target. */
const NUDGE = 1.01
const MAX_NUDGES = 8

const TARGETS: Record<ContrastLevel, { text: number, strongText: number }> = {
  AA: { text: 4.5, strongText: 7 },
  AAA: { text: 7, strongText: 10 },
}

/** The color engine. Swappable: nothing outside this function knows about it. */
function generateSteps(key: string, background: string, mode: ThemeMode, ratios: number[]): string[] {
  const bg = new BackgroundColor({ name: 'background', colorKeys: [background as CssColor], ratios: [1], colorSpace: 'OKLCH' })
  const color = new Color({ name: 'scale', colorKeys: [key as CssColor], ratios, colorSpace: 'OKLCH', smooth: true })
  const theme = new Theme({
    colors: [bg, color],
    backgroundColor: bg,
    lightness: Math.round(lightnessOf(background)),
    contrast: 1,
    output: 'HEX',
  })

  const generated = theme.contrastColors.at(-1) as unknown as { values: Array<{ value: string }> }
  const steps = generated.values.map(v => normalizeHex(v.value))
  if (steps.length !== ratios.length) {
    throw new Error(`[jade] The color engine returned ${steps.length} steps for ${ratios.length} ratios (${mode} mode, key ${key}).`)
  }
  return steps
}

/** The worst contrast of `text` over any of `surfaces`. */
function worstContrast(text: string, surfaces: string[]): number {
  return Math.min(...surfaces.map(surface => contrastRatio(text, surface)))
}

/**
 * Re-places a text step until it reaches `target` over every surface it can
 * sit on. Ratios are measured against the background, so a surface that is
 * itself 1.2× away from it eats into the text's margin: this closes that gap
 * with the real colors instead of a guess.
 */
function reachTarget(
  ratio: number,
  target: number,
  surfaces: string[],
  place: (ratio: number) => string,
): { ratio: number, color: string } {
  let current = Math.min(ratio, MAX_RATIO)
  let color = place(current)
  for (let i = 0; i < MAX_NUDGES && current < MAX_RATIO; i++) {
    const worst = worstContrast(color, surfaces)
    if (worst >= target) break
    current = Math.min(MAX_RATIO, current * (target / worst) * NUDGE)
    color = place(current)
  }
  return { ratio: current, color }
}

/**
 * The neutral scale: the theme's background and 11 steps leaning toward the
 * hue of `tintSeed` (usually the primary). Step 1 is exactly `background`.
 * Step 9 (outline) reaches 3:1 on steps 1–2 and step 11 (muted text) reaches
 * the level on steps 1–3; step 12 is main text.
 */
export function generateNeutralScale(
  background: string,
  tintSeed: string,
  mode: ThemeMode,
  level: ContrastLevel = 'AA',
): string[] {
  const exact = normalizeHex(background)
  const key = tintToward(exact, tintSeed)

  const ratios = [...NEUTRAL_RATIOS]
  ratios[10] = TARGETS[level].text
  const steps = generateSteps(key, key, mode, ratios)
  steps[0] = exact

  const withRatio = (index: number, ratio: number) => {
    const attempt = [...ratios]
    attempt[index] = ratio
    return generateSteps(key, key, mode, attempt)[index]!
  }

  // Step 9 outlines form fields: 3:1 on the page and on the subtle area.
  steps[8] = reachTarget(ratios[8]!, OUTLINE_TARGET, steps.slice(0, 2), r => withRatio(8, r)).color
  steps[10] = reachTarget(ratios[10]!, TARGETS[level].text, steps.slice(0, 3), r => withRatio(10, r)).color

  return steps
}

/**
 * Ratios for steps 1–8 so they never overtake the seed (step 9). A seed that
 * sits close to the background (orange on white: 2.29:1) leaves less room than
 * the default list needs, so the whole list is squeezed to fit under it
 * instead of piling the last steps up against the ceiling.
 */
function fitUnderSeed(seedRatio: number): number[] {
  const top = ROLE_RATIOS.at(-1)!
  const ceiling = seedRatio - SEED_GAP
  if (ceiling >= top) return [...ROLE_RATIOS]

  const squeeze = Math.max(0, (ceiling - 1) / (top - 1))
  return ROLE_RATIOS.map((ratio, i) => Math.max(1 + STEP_GAP * (i + 1), 1 + (ratio - 1) * squeeze))
}

/**
 * A role's 12 steps, generated against the neutral scale it sits on.
 *
 * - Step 9 is the seed itself (the engine only gets close to it).
 * - `on` is white or black, whichever contrasts more with the seed.
 * - Step 10 (hover) moves away from `on`: lighter when `on` is black, darker
 *   when it's white, so the text on it never loses contrast.
 * - Steps 11 and 12 (colored and strong colored text) reach the level over
 *   the surfaces they sit on: neutral steps 1–3 and this role's step 3 for 11,
 *   this role's steps 4–5 for 12.
 */
export function generateScale(
  seed: string,
  neutral: string[],
  mode: ThemeMode,
  level: ContrastLevel = 'AA',
): RoleScale {
  const background = neutral[0]!
  const exactSeed = normalizeHex(seed)
  const seedRatio = contrastRatio(exactSeed, background)

  const on = contrastRatio(exactSeed, '#000000') >= contrastRatio(exactSeed, '#FFFFFF') ? '#000000' : '#FFFFFF'

  // A lighter hover sits closer to a light background and farther from a dark one.
  const darkBackground = contrastRatio(background, '#000000') < contrastRatio(background, '#FFFFFF')
  const hoverFarther = (on === '#000000') === darkBackground
  const hoverRatio = Math.min(MAX_RATIO, Math.max(1.05, hoverFarther ? seedRatio * HOVER_FACTOR : seedRatio / HOVER_FACTOR))

  const targets = TARGETS[level]
  const textRatio = Math.max(targets.text, seedRatio * TEXT_FACTOR)
  const strongTextRatio = Math.max(targets.strongText, seedRatio * STRONG_TEXT_FACTOR, textRatio * TEXT_FACTOR)

  const ratios = [...fitUnderSeed(seedRatio), seedRatio, hoverRatio, textRatio, strongTextRatio]
  const steps = generateSteps(exactSeed, background, mode, ratios)
  steps[8] = exactSeed

  const withRatio = (index: number, ratio: number) => {
    const attempt = [...ratios]
    attempt[index] = ratio
    return generateSteps(exactSeed, background, mode, attempt)[index]!
  }

  const text = reachTarget(textRatio, targets.text, [neutral[0]!, neutral[1]!, neutral[2]!, steps[2]!], r => withRatio(10, r))
  steps[10] = text.color

  // Keep strong text ahead of colored text even after the colored text moved.
  const strongStart = Math.max(strongTextRatio, text.ratio * TEXT_FACTOR)
  const strong = reachTarget(strongStart, targets.text, [steps[3]!, steps[4]!], r => withRatio(11, r))
  steps[11] = strong.color

  return { steps, on }
}

/**
 * The neutral scale and one scale per role, for one theme variant.
 * `seeds` maps each role (`primary`, `secondary`…) to its seed color; the
 * neutral scale leans toward the first one.
 */
export function generateScales(
  background: string,
  seeds: Record<string, string>,
  mode: ThemeMode,
  level: ContrastLevel = 'AA',
): GeneratedScales {
  const entries = Object.entries(seeds)
  const tintSeed = entries[0]?.[1] ?? background
  const neutral = generateNeutralScale(background, tintSeed, mode, level)

  const roles: Record<string, RoleScale> = {}
  for (const [role, seed] of entries) roles[role] = generateScale(seed, neutral, mode, level)

  return { neutral, roles }
}

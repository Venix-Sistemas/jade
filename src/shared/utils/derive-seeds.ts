// src/shared/utils/derive-seeds.ts
import type { ThemeMode } from '../types'
import { chromaOf, hexToOklab, hueOf, oklchToHex } from './oklab'

/**
 * The seeds a token theme doesn't set, derived from its `primary` (v1.5.0).
 *
 * A project that gives one color gets every role: `secondary` and `accent`
 * from the primary's hue, the status roles from fixed hue conventions. The
 * derived seeds go through the same scale as the ones a theme sets, so the
 * contrast holds the same way. A seed the theme sets is never replaced.
 *
 * Colors are placed in OKLCH, where a hue turn keeps the perceived lightness,
 * and are pure functions of the primary and the mode: the same theme always
 * derives the same tokens. Hex in, hex out; no dependencies, safe to import
 * anywhere (unlike `scale.ts`, which pulls in the color engine).
 */

/** The roles that can be derived, in the order they are written. */
export const DERIVED_ROLES = ['secondary', 'accent', 'error', 'info', 'success', 'warning'] as const

type DerivedRole = typeof DERIVED_ROLES[number]
type StatusRole = Exclude<DerivedRole, 'secondary' | 'accent'>

/** How far `secondary` turns from the primary's hue (analogous: a neighbor on the wheel). */
const SECONDARY_HUE_TURN = 30
/** `accent` sits opposite the primary (complementary), and calmer. */
const ACCENT_HUE_TURN = 180
const ACCENT_CHROMA_FACTOR = 0.75
/** A primary with less OKLab chroma than this has no hue to turn (a gray, a black, a white). */
const MIN_HUE_CHROMA = 0.02

/**
 * The status seeds: OKLCH `[lightness, chroma, hue]`, per mode. The hue is the
 * convention (error red, success green, warning amber, info blue). Lightness
 * and chroma follow the mode: lighter on a dark page, deeper on a light one.
 * Warning is the lightest, since amber stays amber only when it is bright.
 */
const STATUS_SEEDS: Record<StatusRole, Record<ThemeMode, readonly [number, number, number]>> = {
  error: { light: [0.6, 0.21, 27], dark: [0.7, 0.19, 25] },
  info: { light: [0.6, 0.15, 245], dark: [0.72, 0.13, 245] },
  success: { light: [0.62, 0.16, 148], dark: [0.75, 0.17, 148] },
  warning: { light: [0.8, 0.16, 80], dark: [0.83, 0.16, 85] },
}

/**
 * The derived seeds for the roles `seeds` leaves out, as `#RRGGBB`. Nothing
 * when there is no `primary` (there is nothing to derive from). A primary
 * without a hue (a gray) gets no `secondary` or `accent`, only the status roles.
 */
export function deriveSeeds(seeds: Partial<Record<string, string>>, mode: ThemeMode): Partial<Record<DerivedRole, string>> {
  const primary = seeds.primary
  if (!primary) return {}

  const derived: Partial<Record<DerivedRole, string>> = {}
  const hue = hueOf(primary)

  if (hue !== null && chromaOf(primary) >= MIN_HUE_CHROMA) {
    const [lightness] = hexToOklab(primary)
    const chroma = chromaOf(primary)
    if (!seeds.secondary) derived.secondary = oklchToHex(lightness, chroma, (hue + SECONDARY_HUE_TURN) % 360)
    if (!seeds.accent) derived.accent = oklchToHex(lightness, chroma * ACCENT_CHROMA_FACTOR, (hue + ACCENT_HUE_TURN) % 360)
  }

  for (const role of Object.keys(STATUS_SEEDS) as StatusRole[]) {
    if (seeds[role]) continue
    const [lightness, chroma, statusHue] = STATUS_SEEDS[role][mode]
    derived[role] = oklchToHex(lightness, chroma, statusHue)
  }

  return derived
}

// src/shared/utils/oklab.ts
import { contrastRatio, relativeLuminance } from './contrast'

/**
 * Just enough of Björn Ottosson's OKLab (https://bottosson.github.io/posts/oklab/)
 * to read a hue from a seed and to tint a neutral background without moving
 * its lightness. Hex in, hex out; no dependencies.
 */

function parseHex(hex: string): [number, number, number] {
  let digits = hex.trim().replace(/^#/, '')
  if (digits.length === 3) digits = digits.replace(/./g, '$&$&')
  if (!/^[\da-f]{6}$/i.test(digits)) throw new Error(`[jade] Invalid hex color: "${hex}"`)
  return [0, 2, 4].map(i => Number.parseInt(digits.slice(i, i + 2), 16)) as [number, number, number]
}

function toLinear(channel: number): number {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function fromLinear(linear: number): number {
  const c = linear <= 0.0031308 ? linear * 12.92 : 1.055 * linear ** (1 / 2.4) - 0.055
  return Math.round(Math.min(1, Math.max(0, c)) * 255)
}

/** `#RRGGBB`, uppercase. Accepts `#RGB` too. */
export function normalizeHex(hex: string): string {
  return `#${parseHex(hex).map(c => c.toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

export function hexToOklab(hex: string): [number, number, number] {
  const [r, g, b] = parseHex(hex).map(toLinear) as [number, number, number]
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

/** The hex for an OKLab color, or `null` when it falls outside the sRGB gamut. */
export function oklabToHex(L: number, a: number, b: number): string | null {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  if (linear.some(c => c < -0.0005 || c > 1.0005)) return null
  return `#${linear.map(c => fromLinear(c).toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

/** CIELAB lightness (L*, 0–100) of a hex color. */
export function lightnessOf(hex: string): number {
  const y = relativeLuminance(hex)
  const f = y > 216 / 24389 ? Math.cbrt(y) : (24389 / 27 * y + 16) / 116
  return 116 * f - 16
}

/** OKLab chroma of a color: how far it is from a gray of the same lightness (about 0–0.4). */
export function chromaOf(hex: string): number {
  const [, a, b] = hexToOklab(hex)
  return Math.hypot(a, b)
}

/**
 * The color at OKLab lightness `L` that has the hue of `hueOf` and, as far as
 * the sRGB gamut allows, `chroma`: a chroma that doesn't fit is lowered until
 * it does. `null` when `hueOf` has no hue (a gray).
 */
export function colorWithHue(L: number, hueOf: string, chroma: number): string | null {
  const [, a, b] = hexToOklab(hueOf)
  const own = Math.hypot(a, b)
  if (own < 1e-4) return null
  for (let c = chroma; c > 0.0005; c *= 0.9) {
    const candidate = oklabToHex(L, (a / own) * c, (b / own) * c)
    if (candidate) return candidate
  }
  return oklabToHex(L, 0, 0)
}

/** Chroma tried for the tint, from strongest to none. OKLab chroma, so about 0–0.02. */
const TINT_CHROMAS = [0.012, 0.01, 0.008, 0.006, 0.004, 0.003, 0.002, 0.001]

/** How far the tinted color may drift from the background, as a contrast ratio. */
const MAX_TINT_DRIFT = 1.02

/**
 * The background nudged toward the hue of `hueSeed`: the strongest tint that
 * stays inside the sRGB gamut and within `MAX_TINT_DRIFT` of the background.
 * Returns the background itself when no tint fits (e.g. pure white or black).
 */
export function tintToward(background: string, hueSeed: string): string {
  const base = normalizeHex(background)
  const [L] = hexToOklab(base)
  const [, a, b] = hexToOklab(hueSeed)
  const chroma = Math.hypot(a, b)
  if (chroma < 1e-4) return base

  for (const c of TINT_CHROMAS) {
    const candidate = oklabToHex(L, (a / chroma) * c, (b / chroma) * c)
    if (candidate && contrastRatio(candidate, base) <= MAX_TINT_DRIFT) return candidate
  }
  return base
}

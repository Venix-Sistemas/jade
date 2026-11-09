// src/shared/utils/contrast.ts

/**
 * WCAG 2.1 contrast math (https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio).
 * Pure functions on hex colors, with no dependencies, so they are safe to use
 * both at build time and in the browser.
 */

/** Parses `#RGB` or `#RRGGBB` into 0–255 channels. Throws on anything else. */
function parseHex(hex: string): [number, number, number] {
  const match = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(hex.trim())
  if (!match) throw new Error(`[jade] Invalid hex color: "${hex}"`)

  let digits = match[1]!
  if (digits.length === 3) digits = digits.replace(/./g, '$&$&')

  return [
    Number.parseInt(digits.slice(0, 2), 16),
    Number.parseInt(digits.slice(2, 4), 16),
    Number.parseInt(digits.slice(4, 6), 16),
  ]
}

/** sRGB channel (0–255) to linear light, per the WCAG definition. */
function linearize(channel: number): number {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

/**
 * Relative luminance of a hex color: 0 for black, 1 for white.
 * E.g.: "#FFFFFF" -> 1, "#000" -> 0
 */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex)
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

/**
 * WCAG contrast ratio between two hex colors, from 1 to 21. Symmetric: the
 * order of the arguments doesn't matter.
 * E.g.: ("#000000", "#FFFFFF") -> 21
 */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

// src/shared/utils/background-tone.ts
import type { BackgroundTone, ThemePalette } from '../types'
import { chromaOf, colorWithHue, hexToOklab, oklabToHex } from './oklab'

/**
 * `backgroundTone`: whether a variant's page colors are the ones it writes
 * (`'theme'`), grays (`'neutral'`) or tinted with a trace of its `primary`
 * (`'brand'`), as a seasonal theme's are. The lightness stays, so what reads
 * on them barely changes. No color engine here: it runs with the page too.
 */

/** The colors the page is painted with. */
const BACKGROUNDS = ['background', 'background2', 'background3'] as const

/** OKLab chroma a `'brand'` background takes, per mode. A primary with less keeps its own. */
const BRAND_CHROMA = { dark: 0.025, light: 0.012 } as const
/** A primary with less chroma than this has no hue to give: its background stays gray. */
const MIN_HUE_CHROMA = 0.02
/** White holds no hue: a tinted light background sits a hair below it. */
const LIGHT_MAX_LIGHTNESS = 0.985

const isHex = (color: unknown): color is string => typeof color === 'string' && /^#(?:[\da-f]{3}){1,2}$/i.test(color)

/** `color`, a page color, in the given tone. Anything that isn't a hex color is left as it is. */
export function toneColor(color: string, primary: string | undefined, tone: BackgroundTone, dark: boolean): string {
  if (tone === 'theme' || !isHex(color)) return color
  const [lightness] = hexToOklab(color)
  const gray = () => oklabToHex(lightness, 0, 0) ?? color
  if (tone === 'neutral') return gray()
  if (!isHex(primary)) return color
  const chroma = chromaOf(primary)
  if (chroma < MIN_HUE_CHROMA) return gray()
  return colorWithHue(
    dark ? lightness : Math.min(lightness, LIGHT_MAX_LIGHTNESS),
    primary,
    Math.min(BRAND_CHROMA[dark ? 'dark' : 'light'], chroma),
  ) ?? color
}

/** The palette with its page colors in the tone; the palette itself when there is nothing to change. */
export function toneBackgrounds(palette: ThemePalette, tone: BackgroundTone | undefined, dark: boolean): ThemePalette {
  if (tone !== 'neutral' && tone !== 'brand') return palette
  const toned = { ...palette }
  for (const name of BACKGROUNDS) {
    if (toned[name]) toned[name] = toneColor(toned[name], palette.primary, tone, dark)
  }
  return toned
}

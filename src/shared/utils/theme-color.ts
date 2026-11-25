// src/shared/utils/theme-color.ts
import { COLOR_PROPERTIES } from '../constants'

/**
 * The color that drives `<meta name="theme-color">` for `color.themeColorMeta`:
 * `true` is the variant's `background`, a color name is that color, and
 * anything else (`false`, a word that is not a theme color) is `null`: the tag
 * is left alone.
 */
export function resolveThemeColorName(option: unknown): string | null {
  if (option === true) return 'background'
  if (typeof option === 'string' && (COLOR_PROPERTIES as readonly string[]).includes(option)) return option
  return null
}

/** The `theme-color` of a theme variant (a `#RRGGBB` or `#RGB`), or `null` when the variant has no such color. */
export function themeColorOf(
  themes: Record<string, Partial<Record<string, string | undefined>> | undefined>,
  variantId: string,
  colorName: string,
): string | null {
  const value = themes[variantId]?.[colorName]
  return typeof value === 'string' && value.startsWith('#') ? value : null
}

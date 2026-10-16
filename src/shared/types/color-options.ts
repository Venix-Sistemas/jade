import type { ThemeEntry } from './colors'

export interface ColorOptions {
  enabled: boolean
  apply: boolean
  /**
   * Initial choice for new visitors: a theme name (mode follows the OS), a
   * variant id like `'dark'` (that theme in that mode) or `'system'` (both
   * automatic). Default: `'dark'`.
   */
  defaultColor: string
  /**
   * Override or add themes. Use the grouped format
   * (`{ translations, icon, light: {...}, dark: {...} }`); the flat format
   * (`{ dark: true, primary, ... }`) still works but is deprecated.
   */
  themes: Record<string, Partial<ThemeEntry>>
  /**
   * Preferred variant for each theme's icon when `icon` is an object
   * (`ThemeIconFormats`). Default: `'svg'`. Falls back to `'emote'` when the
   * theme doesn't define the chosen format, or when `icon` is just a string
   * (legacy format).
   */
  iconFormat: 'emote' | 'css' | 'svg'
  /**
   * Only save the theme cookies (`venix-theme-preference`/`venix-theme-resolved`)
   * after functional-cookie consent is recorded (see `persistence.grant()`).
   * Default: `true`. Set `false` for apps without a consent banner (e.g. an
   * internal tool) so the chosen theme always survives a reload.
   */
  requireConsent: boolean
  /**
   * Seasonal themes (Carnival, Easter, Halloween, Christmas and any custom
   * one with `seasonal: true`). Default: `true`. With `false` they're
   * removed entirely: not listed in pickers and never applied by date.
   */
  seasonal: boolean
}

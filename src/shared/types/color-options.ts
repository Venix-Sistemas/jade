import type { ThemeColors } from './colors'

export interface ColorOptions {
  enabled: boolean
  apply: boolean
  defaultColor: string
  themes: Record<string, Partial<ThemeColors>>
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
}

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
}

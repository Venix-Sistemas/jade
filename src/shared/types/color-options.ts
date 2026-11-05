import type { ThemeEntry } from './colors'

export interface ColorOptions {
  enabled: boolean
  apply: boolean
  /**
   * Initial choice for new visitors: a theme name (mode follows the OS), a
   * variant id like `'dark'` (that theme in that mode) or `'system'` (both
   * automatic). Default: `'dark'`. To start on a project's own brand, add
   * that theme to `themes` and put its name here. A value that matches no
   * available theme warns at build time and falls back to `'system'`.
   */
  defaultColor: string
  /**
   * Override or add themes. Use the grouped format
   * (`{ translations, icon, light: {...}, dark: {...} }`); the flat format
   * (`{ dark: true, primary, ... }`) still works but is deprecated.
   *
   * `venix` is the brand theme of Venix Sistemas: don't change its colors.
   * For another identity (a client's brand, say), add a new theme here and
   * set `defaultColor` to its name. Overriding Venix's colors logs a build
   * warning unless `allowVenixOverride` is `true`.
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
   * Only save the theme cookies (`venix-theme-preference`, `venix-theme-mode`,
   * `venix-theme-resolved`) and the locale cookie after functional-cookie
   * consent is recorded (see `persistence.grant()`).
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
  /**
   * Override the colors of the `venix` theme without the build warning.
   * Default: `false`. Venix is the Venix Sistemas brand theme, so a project
   * with its own identity should add a theme instead (see `themes`).
   */
  allowVenixOverride: boolean
}

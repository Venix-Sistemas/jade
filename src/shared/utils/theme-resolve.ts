// src/shared/utils/theme-resolve.ts
import type { ThemeColors } from '../types'
import { NON_COLOR_PROPERTIES } from '../constants'
import { createThemeResolver } from './theme-resolver'
import type { ColorModel } from './theme-resolver'

export type { ColorModel, ThemeSelection } from './theme-resolver'

// The theme-resolution rule lives in `createThemeResolver` — a single
// implementation shared by `useVenixTheme`, the SSR and Vuetify plugins and
// (serialized) the pre-hydration script. See `theme-resolver.ts`.
export const {
  isColorTheme,
  getEasterSunday,
  isModePreference,
  isSelectableGroup,
  findVariantOwner,
  getDefaultSelection,
  normalizeThemeSelection,
  getActiveSeasonalTheme,
  resolveMode,
  resolveThemeSelection,
  resolveThemePreference,
} = createThemeResolver()

/**
 * The theme's actual color entries (hex values only) — skips metadata like
 * `dark`/`translations`/`icon`. Shared by the CSS generator and the Vuetify
 * theme registration, so both always agree on what counts as a color.
 */
export function getThemeHexColors(themeConfig: ThemeColors): Array<[string, string]> {
  const result: Array<[string, string]> = []
  for (const [key, value] of Object.entries(themeConfig)) {
    if (NON_COLOR_PROPERTIES.includes(key as typeof NON_COLOR_PROPERTIES[number])) continue
    if (typeof value === 'string' && value.startsWith('#')) result.push([key, value])
  }
  return result
}

/**
 * Best guess at the theme to render where `matchMedia` doesn't exist (SSR):
 * the resolved cookie (the variant last applied on the client) only hints
 * whether the OS prefers dark, for mode `'system'`. It's never returned as
 * is: with theme `'system'` that cookie can be from another season, or from
 * before the OS switched modes, and trusting it kept that stale theme. The
 * pre-hydration script then corrects the mode guess before the first paint.
 */
export function resolveServerTheme(
  themePreference: string | null | undefined,
  modePreference: string | null | undefined,
  resolvedHint: string | null | undefined,
  colors: ColorModel,
  now: Date = new Date(),
): string {
  const hinted = resolvedHint ? colors.themes[resolvedHint] : undefined
  const prefersDark = hinted && isColorTheme(hinted) ? hinted.dark !== false : true
  return resolveThemePreference(themePreference, modePreference, colors, prefersDark, now)
}

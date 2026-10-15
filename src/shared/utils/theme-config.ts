// src/shared/utils/theme-config.ts
import themeData from '../theme.json' with { type: 'json' }
import type { ThemeConfig, ThemeEntry, ThemeModeLabel } from '../types'
import { DEFAULT_THEME } from '../constants'
import { mergeColorThemes, normalizeColorThemes } from './merge-themes'

export interface VenixRuntimeThemeConfig {
  defaultTheme?: string
  colorThemes?: Record<string, Partial<ThemeEntry>>
}

/** `theme.json` as authored: `colors.themes` holds config entries, not resolved variants. */
interface RawColors {
  enabled?: boolean
  defaults?: boolean
  defaultColor?: string
  modes?: Record<string, ThemeModeLabel>
  themes?: Record<string, ThemeEntry>
}

/** The theme entries bundled with the module, in config format. */
export function getBaseThemeEntries(): Record<string, ThemeEntry> {
  return ((themeData.colors as RawColors | undefined)?.themes ?? {}) as Record<string, ThemeEntry>
}

/**
 * Rebuilds the full `ThemeConfig` at runtime, layering `theme.json`
 * (bundled with the module, with the "base" themes) with the customizations
 * from `runtimeConfig.public.venixTheme` (resolved at build time from the
 * module options in `nuxt.config`, see `module.ts`). Single implementation —
 * used by the composable (`useVenixTheme`), the SSR/Vuetify plugins and, at
 * build time, `customizeTheme`.
 */
export function buildResolvedTheme(runtimeThemeConfig?: VenixRuntimeThemeConfig): ThemeConfig {
  const rawColors = (themeData.colors as RawColors | undefined) ?? {}

  // `colorThemes` holds the raw overrides from `nuxt.config` (only the keys
  // the user set), so they're merged theme by theme — a shallow spread would
  // replace e.g. the whole built-in theme, dropping its `translations`, `icon`
  // and untouched colors.
  const entries = mergeColorThemes(getBaseThemeEntries(), runtimeThemeConfig?.colorThemes)

  return {
    ...(themeData as unknown as ThemeConfig),
    colors: {
      enabled: rawColors.enabled ?? true,
      defaults: rawColors.defaults ?? true,
      defaultColor: runtimeThemeConfig?.defaultTheme || rawColors.defaultColor || DEFAULT_THEME,
      modes: rawColors.modes ?? {},
      ...normalizeColorThemes(entries),
    },
  }
}

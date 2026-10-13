// src/shared/utils/theme-config.ts
import themeData from '../theme.json' with { type: 'json' }
import type { ThemeConfig, ThemeColors } from '../types'
import { DEFAULT_THEME } from '../constants'
import { mergeColorThemes } from './merge-themes'

export interface VenixRuntimeThemeConfig {
  defaultTheme?: string
  colorThemes?: Record<string, Partial<ThemeColors>>
}

/**
 * Rebuilds the full `ThemeConfig` at runtime, layering `theme.json`
 * (bundled with the module, with the "base" themes) with the customizations
 * from `runtimeConfig.public.venixTheme` (resolved at build time from the
 * module options in `nuxt.config`, see `module.ts`). Single implementation —
 * used by the composable (`useVenixTheme`) and the SSR/Vuetify plugins, which
 * used to each reimplement this merge their own way.
 */
export function buildResolvedTheme(runtimeThemeConfig?: VenixRuntimeThemeConfig): ThemeConfig {
  const defaultColors: ThemeConfig['colors'] = {
    enabled: true,
    defaults: true,
    defaultColor: DEFAULT_THEME,
    themes: {},
  }

  const baseColors = (themeData.colors as ThemeConfig['colors'] | undefined) || defaultColors

  return {
    ...(themeData as ThemeConfig),
    colors: {
      ...baseColors,
      defaultColor: runtimeThemeConfig?.defaultTheme || baseColors.defaultColor || DEFAULT_THEME,
      // `colorThemes` holds the raw overrides from `nuxt.config` (only the
      // keys the user set), so they have to be merged theme by theme — a
      // shallow spread would replace e.g. the whole built-in `dark` theme,
      // dropping its `translations`, `icon` and untouched colors.
      themes: mergeColorThemes(baseColors.themes, runtimeThemeConfig?.colorThemes),
    },
  }
}

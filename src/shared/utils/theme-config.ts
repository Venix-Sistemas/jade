// src/shared/utils/theme-config.ts
import themeData from '../theme.json' with { type: 'json' }
import type { ThemeConfig, ThemeColors } from '../types'
import { DEFAULT_THEME } from '../constants'

export interface VenixRuntimeThemeConfig {
  defaultTheme?: string
  colorThemes?: Record<string, Partial<ThemeColors>>
}

/**
 * Reconstrói o `ThemeConfig` completo em runtime, sobrepondo `theme.json`
 * (empacotado com o módulo, com os temas "base") com as customizações vindas
 * de `runtimeConfig.public.venixTheme` (resolvidas em build-time a partir das
 * opções do módulo em `nuxt.config`, ver `module.ts`). Implementação única —
 * usada pela composable (`useVenixTheme`) e pelos plugins de SSR/Vuetify, que
 * antes reimplementavam este merge cada um a sua maneira.
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
      themes: {
        ...baseColors.themes,
        ...(runtimeThemeConfig?.colorThemes || {}),
      },
    },
  }
}

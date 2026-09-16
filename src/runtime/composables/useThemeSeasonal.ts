// runtime/composables/useThemeSeasonal.ts
import type { ThemeConfig } from '../../shared/types'
import { getActiveSeasonalTheme } from '../../shared/utils/theme-resolve'

export const useThemeSeasonal = (theme: ThemeConfig) => {
  const getActiveSeasonalThemeFor = (prefersDark?: boolean): string | null =>
    getActiveSeasonalTheme(theme.colors.themes, prefersDark)

  return {
    getActiveSeasonalTheme: getActiveSeasonalThemeFor,
  }
}

// runtime/composables/useThemeSeasonal.ts
import type { ThemeConfig, ThemeMode } from '../../shared/types'
import { getActiveSeasonalTheme } from '../../shared/utils/theme-resolve'

export const useThemeSeasonal = (theme: ThemeConfig) => {
  const getActiveSeasonalThemeFor = (mode?: ThemeMode): string | null =>
    getActiveSeasonalTheme(theme.colors.groups, mode)

  return {
    getActiveSeasonalTheme: getActiveSeasonalThemeFor,
  }
}

// runtime/composables/useThemeSeasonal.ts
import type { ResolvedTheme, ThemeMode } from '../../shared/types'
import { getActiveSeasonalTheme } from '../../shared/utils/theme-resolve'

export const useThemeSeasonal = (theme: ResolvedTheme) => {
  const getActiveSeasonalThemeFor = (mode?: ThemeMode): string | null =>
    getActiveSeasonalTheme(theme.colors.groups, mode)

  return {
    getActiveSeasonalTheme: getActiveSeasonalThemeFor,
  }
}

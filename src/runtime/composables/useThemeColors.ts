// runtime/composables/useThemeColors.ts
import { computed } from 'vue'
import type { ThemeConfig } from '../../shared/types'
import { resolveThemeIcon } from '../../shared/utils/icon'
import type { ThemeIconFormat } from '../../shared/utils/icon'

export const useThemeColors = (
  theme: ThemeConfig,
  translate: (translations?: Record<string, string>, fallback?: string) => string,
  iconFormat: ThemeIconFormat = 'svg',
) => {
  const themes = computed(() => {
    const list = Object.entries(theme.colors.themes)
      .filter(([value]) => value !== 'system')
      .map(([value, themeConfig]) => ({
        value,
        name: translate(themeConfig.translations, value),
        icon: resolveThemeIcon(themeConfig.icon, iconFormat),
      }))

    const systemTheme = theme.colors.themes['system']
    if (systemTheme) {
      list.unshift({
        value: 'system',
        name: translate(systemTheme.translations, 'System'),
        icon: resolveThemeIcon(systemTheme.icon, iconFormat),
      })
    }

    return list
  })

  const themeValues = computed(() => themes.value.map(t => t.value))

  return {
    themes,
    themeValues,
  }
}

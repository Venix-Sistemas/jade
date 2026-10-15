// runtime/composables/useThemeColors.ts
import { computed } from 'vue'
import type { ThemeConfig } from '../../shared/types'
import { SYSTEM_THEME } from '../../shared/constants'
import { resolveThemeIcon } from '../../shared/utils/icon'
import type { ThemeIconFormat } from '../../shared/utils/icon'
import { isSelectableGroup } from '../../shared/utils/theme-resolve'

const MODE_ORDER = ['system', 'light', 'dark'] as const

export const useThemeColors = (
  theme: ThemeConfig,
  translate: (translations?: Record<string, string>, fallback?: string) => string,
  iconFormat: ThemeIconFormat = 'svg',
) => {
  // The selectable themes, `'system'` ("by date") first.
  const themes = computed(() => {
    const list = Object.entries(theme.colors.groups)
      .filter(([value]) => isSelectableGroup(theme.colors, value))
      .map(([value, group]) => ({
        value,
        name: translate(group.translations, value),
        icon: resolveThemeIcon(group.icon, iconFormat),
      }))

    const systemTheme = theme.colors.groups[SYSTEM_THEME]
    if (systemTheme) {
      list.unshift({
        value: SYSTEM_THEME,
        name: translate(systemTheme.translations, 'Automatic'),
        icon: resolveThemeIcon(systemTheme.icon, iconFormat),
      })
    }

    return list
  })

  const modes = computed(() => MODE_ORDER.map((value) => {
    const label = theme.colors.modes?.[value]
    return {
      value,
      name: translate(label?.translations, value),
      icon: resolveThemeIcon(label?.icon, iconFormat),
    }
  }))

  // Every concrete variant id — the values `data-theme`/class can hold.
  const themeValues = computed(() => Object.keys(theme.colors.themes))

  return {
    themes,
    modes,
    themeValues,
  }
}

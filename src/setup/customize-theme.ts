// src/setup/customize-theme.ts
import type { ThemeConfig, ThemeColors } from '../shared/types'
import type { ModuleOptions } from '../module'
import { resolveFeatureOption } from '../shared/utils/options'

export function customizeTheme(baseTheme: ThemeConfig, options: ModuleOptions): ThemeConfig {
  const customized = structuredClone(baseTheme)

  // ===== TYPOGRAPHY / SCROLLBAR / CURSOR =====
  customized.typography = resolveFeatureOption(options.typography, customized.typography)
  customized.customScrollbar = resolveFeatureOption(options.scrollbar, customized.customScrollbar)
  customized.customCursor = resolveFeatureOption(options.cursor, customized.customCursor)

  // ===== COLORS =====
  const colorOption = options.color

  if (colorOption === false) {
    customized.colors.enabled = false
  }
  else if (typeof colorOption === 'object' && colorOption !== null) {
    if (colorOption.enabled === false) {
      customized.colors.enabled = false
    }

    if (colorOption.defaultColor) {
      customized.colors.defaultColor = colorOption.defaultColor
    }

    // Overrides an existing theme, or adds a new one (dark by default)
    for (const [themeName, customColors] of Object.entries(colorOption.themes ?? {})) {
      customized.colors.themes[themeName] = {
        ...(customized.colors.themes[themeName] ?? { dark: true }),
        ...customColors,
      } as ThemeColors
    }
  }

  return customized
}

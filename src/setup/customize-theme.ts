// src/setup/customize-theme.ts
import type { ThemeConfig } from '../shared/types'
import type { ModuleOptions } from '../module'
import { resolveFeatureOption } from '../shared/utils/options'
import { buildResolvedTheme } from '../shared/utils/theme-config'

export function customizeTheme(baseTheme: ThemeConfig, options: ModuleOptions): ThemeConfig {
  const customized = structuredClone(baseTheme)

  // ===== TYPOGRAPHY / SCROLLBAR / CURSOR =====
  customized.typography = resolveFeatureOption(options.typography, customized.typography)
  customized.customScrollbar = resolveFeatureOption(options.scrollbar, customized.customScrollbar)
  customized.customCursor = resolveFeatureOption(options.cursor, customized.customCursor)

  const cursorOption = typeof options.cursor === 'object' && options.cursor !== null ? options.cursor : undefined
  // `cursors` is the old name of `defaultCursors` (warned about in module.ts)
  if (cursorOption?.cursors) {
    customized.customCursor.defaultCursors = cursorOption.defaultCursors ?? cursorOption.cursors
  }
  delete customized.customCursor.cursors
  // Per theme, so setting one theme's cursor keeps the module's own entries
  if (cursorOption?.themeCursors) {
    customized.customCursor.themeCursors = { ...baseTheme.customCursor.themeCursors, ...cursorOption.themeCursors }
  }

  // ===== COLORS =====
  const colorOption = options.color

  if (colorOption === false) {
    customized.colors.enabled = false
  }
  else if (typeof colorOption === 'object' && colorOption !== null) {
    if (colorOption.enabled === false) {
      customized.colors.enabled = false
    }

    // Same merge + normalization the runtime does (`buildResolvedTheme`), so
    // the generated CSS/Vuetify themes and the client always agree. Overrides
    // an existing theme, or adds a new one.
    const resolved = buildResolvedTheme({
      defaultTheme: colorOption.defaultColor || customized.colors.defaultColor,
      colorThemes: colorOption.themes,
      seasonal: colorOption.seasonal,
    })
    customized.colors = { ...resolved.colors, enabled: customized.colors.enabled }
  }

  return customized
}

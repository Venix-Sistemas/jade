// src/setup/customize-theme.ts
import type { ThemeConfig } from '../shared/types'
import type { ModuleOptions } from '../module'
import { resolveFeatureOption } from '../shared/utils/options'
import { buildResolvedTheme, getBaseThemeEntries } from '../shared/utils/theme-config'
import { tokensEnabled } from '../shared/token-names'
import { isColorTheme } from '../shared/utils/theme-resolve'

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
    if (colorOption.contrast !== undefined) customized.colors.contrast = colorOption.contrast
  }

  // ===== EXPERIMENTAL =====
  // The semantic tokens for every variant that doesn't decide for itself, as
  // if it had `tokens: true` (`tokens: false` still opts out). Everything
  // downstream (CSS, runtime config, Vuetify) then treats them like any
  // token theme.
  const experimental = resolveFeatureOption(options.experimental, { enabled: false }).enabled
  if (experimental && customized.colors.enabled !== false) {
    for (const variant of Object.values(customized.colors.themes)) {
      if (isColorTheme(variant) && variant.tokens === undefined) variant.tokens = true
    }
  }

  // ===== DEFAULT TOKENS =====
  // The built-in themes carry `tokens` in `theme.json`. Those variants are
  // told apart from the ones a project turned the tokens on for, so Vuetify
  // and the contrast warnings can leave the module's own defaults alone (see
  // `ColorsConfig.defaultTokens`). Asking for `experimental` is asking for
  // the tokens everywhere, so nothing is a default then.
  if (!experimental && customized.colors.enabled !== false) {
    const projectThemes = typeof colorOption === 'object' && colorOption !== null ? colorOption.themes ?? {} : {}
    const defaults: string[] = []
    for (const [name, entry] of Object.entries(getBaseThemeEntries())) {
      if (!tokensEnabled(entry) || projectThemes[name]?.tokens !== undefined) continue
      defaults.push(...Object.values(customized.colors.groups[name]?.variants ?? {}))
    }
    if (defaults.length) customized.colors.defaultTokens = defaults
  }

  return customized
}

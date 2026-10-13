// src/shared/utils/merge-themes.ts
import type { ThemeColors } from '../types'

/**
 * Layers the `color.themes` overrides from `nuxt.config` on top of the base
 * themes, theme by theme: an override only replaces the keys it sets, so an
 * existing theme keeps its `translations`, `icon`, `dark` flag and every
 * color it doesn't touch. A theme that doesn't exist in the base is added as
 * dark by default. Single implementation — used both at build time
 * (`customizeTheme`, which feeds the generated CSS and Vuetify) and at
 * runtime (`buildResolvedTheme`), so the two can't diverge.
 */
export function mergeColorThemes(
  baseThemes: Record<string, ThemeColors>,
  overrides?: Record<string, Partial<ThemeColors>>,
): Record<string, ThemeColors> {
  const merged = { ...baseThemes }

  for (const [themeName, customColors] of Object.entries(overrides ?? {})) {
    merged[themeName] = {
      ...(baseThemes[themeName] ?? { dark: true }),
      ...customColors,
    }
  }

  return merged
}

// src/shared/utils/theme-config.ts
import themeData from '../theme.json' with { type: 'json' }
import type { ResolvedTheme, ThemeEntry, ThemeModeLabel } from '../types'
import { DEFAULT_THEME } from '../constants'
import { mergeColorThemes, normalizeColorThemes } from './merge-themes'

export interface VenixRuntimeThemeConfig {
  defaultTheme?: string
  colorThemes?: Record<string, Partial<ThemeEntry>>
  /** `false` drops every seasonal theme (built-in and custom). Default: `true`. */
  seasonal?: boolean
}

/** `theme.json` as authored: `colors.themes` holds config entries, not resolved variants. */
interface RawColors {
  enabled?: boolean
  defaults?: boolean
  defaultColor?: string
  modes?: Record<string, ThemeModeLabel>
  themes?: Record<string, ThemeEntry>
}

/** The theme entries bundled with the module, in config format. */
export function getBaseThemeEntries(): Record<string, ThemeEntry> {
  return ((themeData.colors as RawColors | undefined)?.themes ?? {}) as Record<string, ThemeEntry>
}

const resolvedThemeCache = new WeakMap<VenixRuntimeThemeConfig, ResolvedTheme>()

/**
 * Rebuilds the color themes at runtime, layering `theme.json`
 * (bundled with the module, with the "base" themes) with the customizations
 * from `runtimeConfig.public.venixTheme` (resolved at build time from the
 * module options in `nuxt.config`, see `module.ts`). Single implementation —
 * used by the composable (`useVenixTheme`), the SSR/Vuetify plugins and, at
 * build time, `customizeTheme`.
 *
 * Memoized per config object: every `useVenixTheme()` call and plugin asks
 * for it with the same `runtimeConfig.public.venixTheme`, and rebuilding it
 * (merge + normalization of every theme) each time was wasted work. The
 * result is shared, so callers must treat it as read-only.
 */
export function buildResolvedTheme(runtimeThemeConfig?: VenixRuntimeThemeConfig): ResolvedTheme {
  if (!runtimeThemeConfig) return resolveTheme()

  let resolved = resolvedThemeCache.get(runtimeThemeConfig)
  if (!resolved) {
    resolved = resolveTheme(runtimeThemeConfig)
    resolvedThemeCache.set(runtimeThemeConfig, resolved)
  }
  return resolved
}

function resolveTheme(runtimeThemeConfig?: VenixRuntimeThemeConfig): ResolvedTheme {
  const rawColors = (themeData.colors as RawColors | undefined) ?? {}

  // `colorThemes` holds the raw overrides from `nuxt.config` (only the keys
  // the user set), so they're merged theme by theme — a shallow spread would
  // replace e.g. the whole built-in theme, dropping its `translations`, `icon`
  // and untouched colors.
  const baseEntries = getBaseThemeEntries()
  const merged = mergeColorThemes(baseEntries, runtimeThemeConfig?.colorThemes)

  // `color.seasonal: false`: seasonal themes are removed before anything
  // else sees them, so they get no CSS, no Vuetify theme, no entry in the
  // pickers and never take over by date.
  const entries = runtimeThemeConfig?.seasonal === false
    ? Object.fromEntries(Object.entries(merged).filter(([, entry]) => entry.seasonal !== true))
    : merged
  const { themes, groups } = normalizeColorThemes(entries)

  // Themes the project added (not overrides of built-in ones), so pickers
  // can list them apart from the built-in ones.
  for (const [name, group] of Object.entries(groups)) {
    if (!(name in baseEntries)) group.custom = true
  }

  return {
    colors: {
      enabled: rawColors.enabled ?? true,
      defaults: rawColors.defaults ?? true,
      defaultColor: runtimeThemeConfig?.defaultTheme || rawColors.defaultColor || DEFAULT_THEME,
      modes: rawColors.modes ?? {},
      themes,
      groups,
    },
  }
}

import themeData from '../theme.json' with { type: 'json' }
import type { ResolvedTheme, ThemeConfig } from '../types'
import { normalizeLocale } from './normalize'
import { buildResolvedTheme } from './theme-config'

// Loading a custom theme from a file (path) doesn't really exist yet — that's
// why there's no public `theme` option in `ModuleOptions` today. The
// documented, working way to customize colors is `color.themes` (overrides/
// adds themes on top of this default theme). The parameter is reserved for
// when this gets implemented.
export function loadTheme(_path?: string): ThemeConfig {
  // The full config, for build time: `theme.json`'s typography, scrollbar and
  // cursor, which `customizeTheme` layers the module options over, plus the
  // resolved colors.
  return { ...(themeData as unknown as ThemeConfig), colors: buildResolvedTheme().colors }
}

export function extractLocales(theme: ResolvedTheme): string[] {
  const locales = new Set<string>()

  const labelled = [...Object.values(theme.colors?.groups || {}), ...Object.values(theme.colors?.modes || {})]

  for (const entry of labelled) {
    for (const locale of Object.keys(entry.translations ?? {})) {
      locales.add(normalizeLocale(locale))
    }
  }

  return Array.from(locales)
}

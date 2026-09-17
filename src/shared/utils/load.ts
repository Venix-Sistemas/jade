import defaultTheme from '../../shared/theme.json' with { type: 'json' }
import type { ThemeConfig } from '../types'
import { DEFAULT_LOCALE } from '../constants'
import { normalizeLocale } from './normalize'

// Loading a custom theme from a file (path) doesn't really exist yet — that's
// why there's no public `theme` option in `ModuleOptions` today. The
// documented, working way to customize colors is `color.themes` (overrides/
// adds themes on top of this default theme). The parameter is reserved for
// when this gets implemented.
export function loadTheme(_path?: string): ThemeConfig {
  return defaultTheme as ThemeConfig
}

export function extractLocales(theme: ThemeConfig): string[] {
  const locales = new Set<string>()

  Object.values(theme.colors?.themes || {}).forEach((themeConfig) => {
    if (themeConfig.translations) {
      Object.keys(themeConfig.translations).forEach((locale) => {
        locales.add(normalizeLocale(locale))
      })
    }
  })

  return Array.from(locales)
}

export function getDefaultLocale(theme: ThemeConfig): string {
  const locales = extractLocales(theme)

  if (locales.includes('en-US')) return 'en-US'

  const firstLocale = locales[0]
  if (firstLocale) return firstLocale

  return DEFAULT_LOCALE
}

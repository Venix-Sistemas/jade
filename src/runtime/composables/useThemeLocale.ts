// runtime/composables/useThemeLocale.ts
import { watch } from 'vue'
import type { Ref } from 'vue'
import { useRequestHeaders, useState, useRoute } from '#app'
import type { ThemeConfig } from '../../shared/types'
import { DEFAULT_LOCALE } from '../../shared/constants'
import { normalizeLocale, extractFirstLocale } from '../../shared/utils/normalize'
import { hasCookieConsent } from '../../shared/utils/consent'

export interface UseThemeLocaleOptions {
  enabled?: boolean
  forcedLocale?: string
  defaultLocale?: string
}

export const useThemeLocale = (
  theme: ThemeConfig,
  localeCookie: Ref<string | undefined>,
  options: UseThemeLocaleOptions = {},
) => {
  const { enabled = true, forcedLocale, defaultLocale } = options
  const headers = useRequestHeaders(['accept-language'])
  const route = useRoute()
  const fallbackLocale = defaultLocale || DEFAULT_LOCALE

  // Detects the locale consistently between SSR and client
  const detectLocale = (): string => {
    // Collects every locale available in the translations
    const getAvailableLocales = (): string[] => {
      const availableLocales = new Set<string>()
      Object.values(theme.colors.themes).forEach((themeConfig) => {
        if (themeConfig.translations) {
          Object.keys(themeConfig.translations).forEach((locale) => {
            availableLocales.add(normalizeLocale(locale))
          })
        }
      })
      return Array.from(availableLocales)
    }

    // Tries to match a locale against what's available in the translations;
    // `null` (instead of falling back) when nothing matches, so detection
    // steps can try the next source instead of locking in the fallback.
    const findLocaleInAvailable = (requestedLocale: string): string | null => {
      const availableLocales = getAvailableLocales()
      const normalized = normalizeLocale(requestedLocale)

      if (availableLocales.includes(normalized)) return normalized

      const baseLocale = normalized.split('-')[0]
      return availableLocales.find(locale => locale.split('-')[0] === baseLocale) || null
    }

    const findBestLocale = (requestedLocale: string): string =>
      findLocaleInAvailable(requestedLocale) || fallbackLocale

    // 1. Locale forced via config
    if (forcedLocale) return findBestLocale(forcedLocale)

    // Translation module disabled: skip detection and cookie/header syncing
    if (!enabled) return fallbackLocale

    // 2. Locale cookie
    if (localeCookie.value) return findBestLocale(localeCookie.value)

    // 3. Locale prefix in the current URL (e.g. '/en/about' -> 'en') — a more
    // reliable signal than Accept-Language/navigator.language when the route
    // already indicates the language explicitly (e.g. locale-based routing
    // from @nuxtjs/i18n): avoids a user visiting `/en/...` with their browser
    // set to another language landing on the wrong locale for lack of a cookie.
    const pathSegment = route.path.split('/').find(Boolean)
    if (pathSegment) {
      const pathLocale = findLocaleInAvailable(pathSegment)
      if (pathLocale) return pathLocale
    }

    // 4. SSR: use the Accept-Language header
    const acceptLanguageHeader = headers['accept-language']
    if (acceptLanguageHeader) {
      const acceptLanguage = Array.isArray(acceptLanguageHeader)
        ? acceptLanguageHeader[0]
        : acceptLanguageHeader

      if (acceptLanguage) {
        const firstLocale = extractFirstLocale(acceptLanguage)
        if (firstLocale) return findBestLocale(firstLocale)
      }
    }

    // 5. Client: use navigator.language
    if (import.meta.client && typeof navigator !== 'undefined') {
      return findBestLocale(navigator.language || fallbackLocale)
    }

    // 6. Final fallback
    return fallbackLocale
  }

  // `useState` (not `ref()`) so multiple calls to `useThemeLocale` (via
  // `useVenixTheme()` — e.g. the page and `<VenixThemeSwitcher>`, or after a
  // client-side navigation) share the same reactive instance instead of each
  // getting its own disconnected copy — same reason and pattern as
  // `theme.preference` in `useVenixTheme.ts`. Without this, `setLocale()`
  // called on one instance wouldn't reflect on others already mounted.
  const currentLocale = useState<string>('venix-theme-locale', () => detectLocale())

  // `currentLocale` can hydrate from a stale payload: on a page that was
  // prerendered/cached (e.g. a static host serving the same HTML to every
  // visitor), `detectLocale()` ran at build time with no request cookie
  // available and its result never reflects this visitor's actual cookie.
  // `localeCookie` (`useCookie`), unlike `useState`, always re-reads
  // `document.cookie` on the client, so it's never poisoned by that stale
  // payload — resync immediately whenever the two disagree, same rule as the
  // `watch` below, just applied once up front instead of only on the next change.
  if (enabled && !forcedLocale && localeCookie.value) {
    const cookieLocale = normalizeLocale(localeCookie.value)
    if (cookieLocale !== currentLocale.value) {
      currentLocale.value = cookieLocale
    }
  }

  // Updates the locale when the cookie changes
  watch(localeCookie, (newLocale) => {
    if (enabled && newLocale && !forcedLocale) {
      currentLocale.value = normalizeLocale(newLocale)
    }
  })

  const translate = (translations?: Record<string, string>, fallback?: string): string => {
    if (!translations) return fallback || ''

    const locale = currentLocale.value

    if (translations[locale]) return translations[locale]

    const baseLocale = locale.split('-')[0]
    if (baseLocale && translations[baseLocale]) return translations[baseLocale]

    if (translations[fallbackLocale]) return translations[fallbackLocale]

    if (translations['en-US']) return translations['en-US']

    const firstTranslation = Object.values(translations)[0]
    if (firstTranslation) return firstTranslation

    return fallback || ''
  }

  const setLocale = (locale: string) => {
    currentLocale.value = normalizeLocale(locale)
    // Same consent rule used for the theme cookies (see
    // `useThemeCookies.persistIfConsented`) — without this, the locale cookie
    // used to be written unconditionally, inconsistent with the rest of the
    // module's privacy posture.
    if (enabled && !forcedLocale && hasCookieConsent()) {
      localeCookie.value = normalizeLocale(locale)
    }
  }

  return {
    currentLocale,
    translate,
    setLocale,
  }
}

// runtime/composables/useThemeCookies.ts
import { useCookie } from '#app'
import {
  THEME_PREFERENCE_COOKIE,
  THEME_RESOLVED_COOKIE,
  THEME_MODE_COOKIE,
  THEME_COOKIE_OPTIONS,
  DEFAULT_LOCALE_COOKIE_NAME,
  SCROLLBAR_COOKIE,
  CURSOR_COOKIE,
} from '../../shared/constants'
import { hasCookieConsent } from '../../shared/utils/consent'

// Module-level so the dev warning shows once per page load, not once per
// `useVenixTheme()` call or per theme change.
let warnedMissingConsent = false

export interface UseThemeCookiesOptions {
  localeCookieName?: string
  /** See `color.requireConsent` — when `false`, the theme cookies are always written. */
  requireConsent?: boolean
}

export const useThemeCookies = (options: UseThemeCookiesOptions = {}) => {
  const { localeCookieName = DEFAULT_LOCALE_COOKIE_NAME, requireConsent = true } = options

  const preferenceCookie = useCookie<string>(THEME_PREFERENCE_COOKIE, THEME_COOKIE_OPTIONS)
  const resolvedCookie = useCookie<string>(THEME_RESOLVED_COOKIE, THEME_COOKIE_OPTIONS)
  const modeCookie = useCookie<string>(THEME_MODE_COOKIE, THEME_COOKIE_OPTIONS)
  const localeCookie = useCookie<string>(localeCookieName, THEME_COOKIE_OPTIONS)
  const scrollbarCookie = useCookie<string>(SCROLLBAR_COOKIE, THEME_COOKIE_OPTIONS)
  const cursorCookie = useCookie<string>(CURSOR_COOKIE, THEME_COOKIE_OPTIONS)

  const removeCookie = (name: string) => {
    if (typeof document !== 'undefined') {
      document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`
    }
  }

  /** Whether the theme cookies may be written right now. */
  const canPersist = (): boolean => !requireConsent || hasCookieConsent()

  // Called both automatically (on every theme change) and explicitly via
  // `persistence.enable()`. Without consent (and `requireConsent` on), the
  // theme still applies for this visit, it just isn't remembered — easy to
  // miss in an app that never wired up a consent banner, hence the warning.
  const persistIfConsented = (preference: string, mode: string, resolved: string) => {
    if (!canPersist()) {
      if (import.meta.dev && import.meta.client && !warnedMissingConsent) {
        warnedMissingConsent = true
        console.warn(
          '[jade] Theme change not saved: no cookie consent recorded, so it will be lost on reload. '
          + 'Call `persistence.grant()`, record consent from your cookie banner, '
          + 'or set `venixTheme.color.requireConsent: false` if this app has no consent banner.',
        )
      }
      return
    }

    preferenceCookie.value = preference
    modeCookie.value = mode
    resolvedCookie.value = resolved
  }

  // The custom scrollbar/cursor switches, under the same consent rule.
  const persistTogglesIfConsented = (scrollbar: boolean, cursor: boolean) => {
    if (!canPersist()) return
    scrollbarCookie.value = scrollbar ? 'on' : 'off'
    cursorCookie.value = cursor ? 'on' : 'off'
  }

  const disablePersistence = () => {
    removeCookie(THEME_PREFERENCE_COOKIE)
    removeCookie(THEME_RESOLVED_COOKIE)
    removeCookie(THEME_MODE_COOKIE)
    removeCookie(SCROLLBAR_COOKIE)
    removeCookie(CURSOR_COOKIE)
  }

  return {
    preferenceCookie,
    resolvedCookie,
    modeCookie,
    localeCookie,
    scrollbarCookie,
    cursorCookie,
    canPersist,
    persistIfConsented,
    persistTogglesIfConsented,
    disablePersistence,
  }
}

// runtime/composables/useVenixTheme.ts
import { computed, watch, onMounted, onUnmounted, getCurrentInstance } from 'vue'
import { useRuntimeConfig, useState } from '#app'
import { DEFAULT_THEME, DEFAULT_LOCALE, COOKIE_PREFERENCES_UPDATED_EVENT, COOKIE_CONSENT_STORAGE_KEY, THEME_APPLIED_EVENT } from '../../shared/constants'
import { useThemeCookies } from './useThemeCookies'
import { useThemeLocale } from './useThemeLocale'
import { useThemeSeasonal } from './useThemeSeasonal'
import { useThemeColors } from './useThemeColors'
import { hasCookieConsent } from '../../shared/utils/consent'
import { buildResolvedTheme } from '../../shared/utils/theme-config'
import { resolveThemePreference } from '../../shared/utils/theme-resolve'
import type { ThemeIconFormat } from '../../shared/utils/icon'

export const useVenixTheme = () => {
  const config = useRuntimeConfig()
  const themeConfig = config.public.venixTheme

  const theme = buildResolvedTheme(themeConfig)

  const defaultTheme = theme.colors.defaultColor || DEFAULT_THEME
  const shouldApplyColors = themeConfig?.applyColors !== false && theme.colors.defaults !== false

  // Cookies — the locale cookie is the same one used by routing i18n
  // solutions (e.g. @nuxtjs/i18n defaults to 'i18n_redirected', same as
  // ours), so theme-name translations automatically follow the app's locale.
  const cookies = useThemeCookies(themeConfig?.localeCookie)

  // Cookie consent — shared via useState for the same reason as `preference`
  // (multiple calls to useVenixTheme() must agree on the current state).
  // `venix-theme-preference`/`venix-theme-resolved` are only written when
  // this is `true` (see useThemeCookies.ts).
  const hasConsent = useState<boolean>('venix-cookie-consent', () =>
    typeof window !== 'undefined' && hasCookieConsent(),
  )

  const locale = useThemeLocale(theme, cookies.localeCookie, {
    enabled: themeConfig?.enabled?.translation !== false,
    forcedLocale: themeConfig?.locale,
    defaultLocale: themeConfig?.defaultLocale || DEFAULT_LOCALE,
  })

  // `lang` needs to reflect the resolved locale (WCAG 3.1.1) — but only when
  // NOTHING ELSE already owns that attribute. Off by default because, if the
  // project uses a routing i18n module (e.g. @nuxtjs/i18n), that's the one
  // that should control `lang`: its locale reflects the current URL, while
  // ours only reflects the cookie/browser language — the two can diverge
  // (e.g. user navigates to `/es`, but our cookie still says `pt`), and this
  // sync would end up fighting with i18n's own. See `translation.manageHtmlLang`.
  if (themeConfig?.enabled?.manageHtmlLang) {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale.currentLocale.value
    }
    watch(locale.currentLocale, (newLocale) => {
      if (typeof document !== 'undefined') document.documentElement.lang = newLocale
    })
  }

  const seasonal = useThemeSeasonal(theme)

  const colors = useThemeColors(theme, locale.translate, (themeConfig?.iconFormat as ThemeIconFormat) || 'svg')

  // Preference state — shared via useState so multiple calls to
  // useVenixTheme() (e.g. the page and <VenixThemeSwitcher>) stay in sync
  // instead of each getting its own disconnected copy.
  const initialPreference = cookies.preferenceCookie.value || defaultTheme
  const preference = useState<string>('venix-theme-preference', () => initialPreference || 'system')

  const getResolvedTheme = (pref: string): string => {
    const prefersDark = typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true

    return resolveThemePreference(pref, theme.colors.themes, defaultTheme, prefersDark)
  }

  const apply = (pref: string) => {
    if (!shouldApplyColors) return

    const resolved = getResolvedTheme(pref)

    if (typeof document !== 'undefined') {
      const html = document.documentElement
      html.classList.remove(...colors.themeValues.value)
      html.classList.add(resolved)
      html.setAttribute('data-theme', resolved)
      window.__VENIX_INITIAL_THEME__ = resolved

      // Synchronous, on purpose — see the THEME_APPLIED_EVENT comment in
      // shared/constants.ts for why integrations (e.g. Vuetify) should
      // listen for this event instead of watching `theme.preference` with
      // their own `watch()`.
      window.dispatchEvent(new CustomEvent<string>(THEME_APPLIED_EVENT, { detail: resolved }))
    }
  }

  // Animates the theme switch with the View Transitions API (the browser's
  // native cross-fade) when available; without it the switch is instant.
  const applyWithTransition = (pref: string) => {
    const canAnimate = typeof document !== 'undefined'
      && typeof document.startViewTransition === 'function'
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!canAnimate) {
      apply(pref)
      return
    }

    // During the transition, Chromium-based browsers revert to the OS
    // default cursor instead of the custom one. The custom cursor is defined
    // on `body` (see shared/css/cursor.ts) — pinning the same value via
    // inline style *on `body` itself* (not on `<html>`: `body` has its own
    // direct rule, which always wins over the parent element's inheritance,
    // so pinning it on `<html>` has no effect at all on what's shown inside
    // body) guarantees, with the highest possible specificity, that the
    // right cursor keeps showing even if the browser ignores this during the
    // animation. Elements with their own cursor rule (buttons, links, text
    // fields) are unaffected — a rule that matches the element directly
    // always wins over inheritance, with or without `!important` on either side.
    //
    // `getComputedStyle` forces a synchronous style recalculation — only
    // worth paying that cost (right in the middle of the transition) when
    // the project actually has a custom cursor configured; otherwise `body`
    // would never have its own `cursor` rule anyway, so the result would
    // always be 'auto' and this whole block would be wasted work.
    const body = document.body
    const hasCustomCursor = theme.customCursor?.enabled !== false && !!theme.customCursor?.cursors
    const currentCursor = hasCustomCursor ? getComputedStyle(body).cursor : null
    if (currentCursor && currentCursor !== 'auto') {
      body.style.setProperty('cursor', currentCursor, 'important')
    }

    const restoreCursor = () => body.style.removeProperty('cursor')

    // `.ready`/`.finished` reject when the browser skips or aborts the
    // transition (e.g. a new switch arrives before the previous one
    // finishes, or the tab is hidden) — an expected outcome, not a real
    // error; without the `.catch()`s, this turns into "Uncaught (in
    // promise)" in the console.
    const transition = document.startViewTransition(() => apply(pref))
    transition.ready.catch(() => {})
    transition.finished.then(restoreCursor).catch(restoreCursor)
  }

  if (typeof document !== 'undefined' && shouldApplyColors) {
    // `preference` (`useState`) can hydrate from a stale payload: on a page
    // that was prerendered/cached (e.g. a static host serving the same HTML
    // to every visitor), the value baked in at build time was computed with
    // no request cookie available and never reflects this visitor's actual
    // choice. `useCookie`, unlike `useState`, always re-reads `document.cookie`
    // on the client (see Nuxt's `useCookie` internals) — it's never poisoned
    // by that stale payload, so it's the one to trust whenever the two disagree.
    if (cookies.preferenceCookie.value && cookies.preferenceCookie.value !== preference.value) {
      preference.value = cookies.preferenceCookie.value
    }

    const currentTheme = document.documentElement.getAttribute('data-theme')
    if (currentTheme) {
      if (!cookies.preferenceCookie.value) {
        preference.value = currentTheme
      }
    }
    else {
      apply(preference.value)
    }
  }

  // Re-reads consent and syncs the theme cookies accordingly — called
  // whenever COOKIE_PREFERENCES_UPDATED_EVENT fires (from any source:
  // grant()/revoke() below, or the consumer app's own consent UI), and also
  // called directly by grant()/revoke() to reflect immediately, without
  // depending on the event's round-trip.
  const syncPersistence = () => {
    hasConsent.value = hasCookieConsent()

    if (hasConsent.value) {
      cookies.persistIfConsented(preference.value, getResolvedTheme(preference.value))
    }
    else {
      cookies.disablePersistence()
    }
  }

  // Writes consent in the format this module reads (see hasCookieConsent in
  // shared/utils/consent.ts) and dispatches the event — a convenience for
  // apps without their own CMP. An existing CMP can write to
  // COOKIE_CONSENT_STORAGE_KEY and dispatch COOKIE_PREFERENCES_UPDATED_EVENT
  // directly, without needing to call this.
  const grantPersistence = () => {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify({ functionality: true }))
    syncPersistence()
    window.dispatchEvent(new Event(COOKIE_PREFERENCES_UPDATED_EVENT))
  }

  const revokePersistence = () => {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify({ functionality: false }))
    syncPersistence()
    window.dispatchEvent(new Event(COOKIE_PREFERENCES_UPDATED_EVENT))
  }

  // `onMounted` requires an active component instance — if `useVenixTheme()`
  // is called outside a normal synchronous `setup()` (e.g. context lost
  // under Suspense/async setup in some SSR+i18n flows), it warns "onMounted
  // is called when there is no active component instance" and the callback
  // never runs. With an instance, behavior is unchanged; without one, this
  // runs the same logic as soon as possible on the client instead of simply
  // failing — the price is not being able to register `onUnmounted` for
  // automatic cleanup in that specific case (see below).
  const instance = getCurrentInstance()
  const runOnClientMount = (fn: () => void) => {
    if (instance) {
      onMounted(fn)
    }
    else if (typeof window !== 'undefined') {
      queueMicrotask(fn)
    }
  }

  runOnClientMount(() => {
    // `localStorage` only exists on the client — SSR always initializes
    // `hasConsent` as `false` (see useState above); here we correct it to
    // the real value as soon as it hydrates, in case consent was already
    // granted before.
    hasConsent.value = hasCookieConsent()

    if (!shouldApplyColors) return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = () => {
      if (preference.value === 'system') applyWithTransition('system')
    }
    mq.addEventListener('change', handleSystemThemeChange)

    const checkSeasonalChange = () => {
      const now = new Date()
      const msToMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime()

      return setTimeout(() => {
        if (preference.value === 'system') applyWithTransition('system')
        checkSeasonalChange()
      }, msToMidnight + 1000)
    }

    const midnightTimeout = checkSeasonalChange()

    window.addEventListener(COOKIE_PREFERENCES_UPDATED_EVENT, syncPersistence)

    if (instance) {
      onUnmounted(() => {
        mq.removeEventListener('change', handleSystemThemeChange)
        clearTimeout(midnightTimeout)
        window.removeEventListener(COOKIE_PREFERENCES_UPDATED_EVENT, syncPersistence)
      })
    }
  })

  watch(preference, (newPref) => {
    if (!shouldApplyColors) return

    applyWithTransition(newPref)
    cookies.persistIfConsented(newPref, getResolvedTheme(newPref))
  })

  const toggle = (forceTheme?: string) => {
    const newTheme = forceTheme ?? (preference.value === 'light' ? 'dark' : 'light')
    preference.value = newTheme
    cookies.persistIfConsented(newTheme, getResolvedTheme(newTheme))
  }

  const data = computed(() =>
    colors.themes.value.find(t => t.value === preference.value) ?? colors.themes.value[0],
  )

  const isSeasonalActive = computed(() => {
    if (preference.value !== 'system') return false
    return seasonal.getActiveSeasonalTheme() !== null
  })

  const activeSeasonalTheme = computed(() => {
    if (preference.value !== 'system') return null
    return seasonal.getActiveSeasonalTheme()
  })

  return {
    theme: {
      value: computed(() => getResolvedTheme(preference.value)),
      preference,
      data,
      toggle,
      isSeasonalActive,
      activeSeasonalTheme,
      shouldApplyColors,
      colors: theme.colors,
    },
    themes: colors.themes,
    locale: {
      current: locale.currentLocale,
      set: locale.setLocale,
      translate: locale.translate,
    },
    persistence: {
      hasConsent,
      grant: grantPersistence,
      revoke: revokePersistence,
      enable: () => cookies.persistIfConsented(preference.value, getResolvedTheme(preference.value)),
      disable: cookies.disablePersistence,
    },
  }
}

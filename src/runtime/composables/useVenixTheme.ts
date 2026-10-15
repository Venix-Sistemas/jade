// runtime/composables/useVenixTheme.ts
import { ref, computed, watch, onMounted, onUnmounted, getCurrentInstance } from 'vue'
import { useRuntimeConfig, useState } from '#app'
import { DEFAULT_LOCALE, COOKIE_PREFERENCES_UPDATED_EVENT, COOKIE_CONSENT_STORAGE_KEY, THEME_APPLIED_EVENT, SYSTEM_THEME } from '../../shared/constants'
import { useThemeCookies } from './useThemeCookies'
import { useThemeLocale } from './useThemeLocale'
import { useThemeSeasonal } from './useThemeSeasonal'
import { useThemeColors } from './useThemeColors'
import { hasCookieConsent } from '../../shared/utils/consent'
import { buildResolvedTheme } from '../../shared/utils/theme-config'
import { findVariantOwner, isModePreference, isSelectableGroup, normalizeThemeSelection, resolveMode, resolveThemeSelection } from '../../shared/utils/theme-resolve'
import type { ThemeSelection } from '../../shared/utils/theme-resolve'
import type { ThemeIconFormat } from '../../shared/utils/icon'
import type { ThemeMode, ThemeModePreference } from '../../shared/types'

export const useVenixTheme = () => {
  const config = useRuntimeConfig()
  const themeConfig = config.public.venixTheme

  const theme = buildResolvedTheme(themeConfig)

  const shouldApplyColors = themeConfig?.applyColors !== false && theme.colors.defaults !== false

  // Cookies — the locale cookie is the same one used by routing i18n
  // solutions (e.g. @nuxtjs/i18n defaults to 'i18n_redirected', same as
  // ours), so theme-name translations automatically follow the app's locale.
  const cookies = useThemeCookies({
    localeCookieName: themeConfig?.localeCookie,
    requireConsent: themeConfig?.requireConsent !== false,
  })

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

  // Preference state — the theme (`'system'` = by date) and the mode
  // (`'system'` = by OS) are chosen independently. Shared via useState so
  // multiple calls to useVenixTheme() (e.g. the page and
  // <VenixThemeSwitcher>) stay in sync instead of each getting its own
  // disconnected copy. `normalizeThemeSelection` also migrates cookies saved
  // before the theme/mode split (e.g. a theme cookie of `'dark'`).
  const readCookieSelection = (): ThemeSelection =>
    normalizeThemeSelection(cookies.preferenceCookie.value, cookies.modeCookie.value, theme.colors)

  const initialSelection = readCookieSelection()
  const preference = useState<string>('venix-theme-preference', () => initialSelection.theme)
  const modePreference = useState<ThemeModePreference>('venix-theme-mode', () => initialSelection.mode)

  const currentSelection = (): ThemeSelection => ({ theme: preference.value, mode: modePreference.value })

  // Bumped whenever something theme resolution depends on changes outside
  // Vue's reactivity (OS color scheme, the date rolling over to a new day),
  // so the computeds below don't stay stuck on a stale result.
  const environmentVersion = ref(0)

  const getPrefersDark = (): boolean => typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : true

  const getResolvedTheme = (selection: ThemeSelection = currentSelection()): string =>
    resolveThemeSelection(selection, theme.colors, getPrefersDark())

  const apply = (selection: ThemeSelection) => {
    if (!shouldApplyColors) return

    const resolved = getResolvedTheme(selection)

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
  const applyWithTransition = (selection: ThemeSelection) => {
    const canAnimate = typeof document !== 'undefined'
      && typeof document.startViewTransition === 'function'
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!canAnimate) {
      apply(selection)
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
    const transition = document.startViewTransition(() => apply(selection))
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
    if (cookies.preferenceCookie.value || cookies.modeCookie.value) {
      const fromCookies = readCookieSelection()
      if (fromCookies.theme !== preference.value) preference.value = fromCookies.theme
      if (fromCookies.mode !== modePreference.value) modePreference.value = fromCookies.mode
    }

    // Normally already set by the pre-hydration script (theme-init.ts).
    if (!document.documentElement.getAttribute('data-theme')) {
      apply(currentSelection())
    }
  }

  // Re-reads consent and syncs the theme cookies accordingly — called
  // whenever COOKIE_PREFERENCES_UPDATED_EVENT fires (from any source:
  // grant()/revoke() below, or the consumer app's own consent UI), and also
  // called directly by grant()/revoke() to reflect immediately, without
  // depending on the event's round-trip. With `color.requireConsent: false`
  // the cookies don't depend on consent, so a revoke doesn't delete them.
  const syncPersistence = () => {
    hasConsent.value = hasCookieConsent()

    if (cookies.canPersist()) {
      cookies.persistIfConsented(preference.value, modePreference.value, getResolvedTheme())
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
  const setConsent = (granted: boolean) => {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify({ functionality: granted }))
    syncPersistence()
    window.dispatchEvent(new Event(COOKIE_PREFERENCES_UPDATED_EVENT))
  }

  const grantPersistence = () => setConsent(true)
  const revokePersistence = () => setConsent(false)

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
      environmentVersion.value++
      if (modePreference.value === 'system') applyWithTransition(currentSelection())
    }
    mq.addEventListener('change', handleSystemThemeChange)

    // Re-arms itself every midnight — `midnightTimeout` always holds the
    // *latest* timer id, so the cleanup below cancels the pending one (not
    // just the first, already-fired timer).
    let midnightTimeout: ReturnType<typeof setTimeout>
    const scheduleSeasonalCheck = () => {
      const now = new Date()
      const msToMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime()

      midnightTimeout = setTimeout(() => {
        environmentVersion.value++
        if (preference.value === SYSTEM_THEME) applyWithTransition(currentSelection())
        scheduleSeasonalCheck()
      }, msToMidnight + 1000)
    }

    scheduleSeasonalCheck()

    window.addEventListener(COOKIE_PREFERENCES_UPDATED_EVENT, syncPersistence)

    if (instance) {
      onUnmounted(() => {
        mq.removeEventListener('change', handleSystemThemeChange)
        clearTimeout(midnightTimeout)
        window.removeEventListener(COOKIE_PREFERENCES_UPDATED_EVENT, syncPersistence)
      })
    }
  })

  watch([preference, modePreference], () => {
    if (!shouldApplyColors) return

    const selection = currentSelection()
    applyWithTransition(selection)
    cookies.persistIfConsented(selection.theme, selection.mode, getResolvedTheme(selection))
  })

  /** Picks the theme (`'system'` = by date), keeping the current mode. */
  const setTheme = (name: string) => {
    if (name === SYSTEM_THEME || isSelectableGroup(theme.colors, name)) preference.value = name
  }

  /** Picks the mode (`'system'` = follow the OS), keeping the current theme. */
  const setMode = (mode: ThemeModePreference) => {
    if (isModePreference(mode)) modePreference.value = mode
  }

  // Both depend on the OS color scheme / today's date — reading
  // `environmentVersion` re-evaluates them when either changes.
  const resolvedTheme = computed(() => {
    void environmentVersion.value
    return getResolvedTheme(currentSelection())
  })

  // The mode actually applied: normally the chosen one, but a theme with a
  // single variant keeps its own.
  const resolvedMode = computed<ThemeMode>(() =>
    theme.colors.themes[resolvedTheme.value]?.dark === false ? 'light' : 'dark',
  )

  const toggleMode = () => {
    modePreference.value = resolvedMode.value === 'dark' ? 'light' : 'dark'
  }

  /**
   * Without an argument, switches between light and dark mode. With one,
   * selects it: a theme name; a variant id such as `'dark'`/`'light'` (as
   * before the theme/mode split), which also sets its mode; or `'system'`,
   * which makes both theme and mode automatic.
   */
  const toggle = (forceTheme?: string) => {
    if (forceTheme === undefined) {
      toggleMode()
      return
    }

    if (forceTheme === SYSTEM_THEME) {
      preference.value = SYSTEM_THEME
      modePreference.value = 'system'
      return
    }

    if (isSelectableGroup(theme.colors, forceTheme)) {
      preference.value = forceTheme
      return
    }

    const owner = findVariantOwner(theme.colors, forceTheme)
    if (owner) {
      preference.value = owner.theme
      modePreference.value = owner.mode
    }
  }

  const data = computed(() =>
    colors.themes.value.find(t => t.value === preference.value) ?? colors.themes.value[0],
  )

  const modeData = computed(() =>
    colors.modes.value.find(m => m.value === modePreference.value) ?? colors.modes.value[0],
  )

  const activeSeasonalTheme = computed(() => {
    void environmentVersion.value
    if (preference.value !== SYSTEM_THEME) return null
    return seasonal.getActiveSeasonalTheme(resolveMode(modePreference.value, getPrefersDark()))
  })

  const isSeasonalActive = computed(() => activeSeasonalTheme.value !== null)

  return {
    theme: {
      value: resolvedTheme,
      preference,
      data,
      set: setTheme,
      toggle,
      isSeasonalActive,
      activeSeasonalTheme,
      shouldApplyColors,
      colors: theme.colors,
    },
    themes: colors.themes,
    mode: {
      value: resolvedMode,
      preference: modePreference,
      data: modeData,
      set: setMode,
      toggle: toggleMode,
    },
    modes: colors.modes,
    locale: {
      current: locale.currentLocale,
      set: locale.setLocale,
      translate: locale.translate,
    },
    persistence: {
      hasConsent,
      grant: grantPersistence,
      revoke: revokePersistence,
      enable: () => cookies.persistIfConsented(preference.value, modePreference.value, getResolvedTheme()),
      disable: cookies.disablePersistence,
    },
  }
}

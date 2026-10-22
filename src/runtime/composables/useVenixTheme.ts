// runtime/composables/useVenixTheme.ts
import { computed, effectScope, watch } from 'vue'
import { onNuxtReady, useNuxtApp, useRuntimeConfig, useState } from '#app'
import { DEFAULT_LOCALE, COOKIE_PREFERENCES_UPDATED_EVENT, COOKIE_CONSENT_STORAGE_KEY, THEME_APPLIED_EVENT, SYSTEM_THEME, SCROLLBAR_ATTRIBUTE, CURSOR_ATTRIBUTE, FONT_ATTRIBUTE } from '../../shared/constants'
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

/**
 * State and actions, with no side effects of its own: every `useVenixTheme()`
 * call builds one, and they all agree because the state lives in `useState`.
 * The effects (applying the theme, persisting it, OS/date listeners) are
 * installed once per app by `installThemeEffects`.
 */
function createThemeCore() {
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
    canPersist: cookies.canPersist,
  })

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

  // The custom scrollbar, cursor and font: on unless the visitor turned them
  // off, and only switchable when the project has them on (`scrollbar`/
  // `cursor` modules, `typography` with custom fonts). Shared via useState
  // like `preference`.
  const requireConsent = themeConfig?.requireConsent !== false
  const scrollbarAvailable = themeConfig?.enabled?.scrollbar !== false
  const cursorAvailable = themeConfig?.enabled?.cursor !== false
  const fontAvailable = themeConfig?.enabled?.customFont === true
  const scrollbarEnabled = useState<boolean>('venix-scrollbar', () => cookies.scrollbarCookie.value !== 'off')
  const cursorEnabled = useState<boolean>('venix-cursor', () => cookies.cursorCookie.value !== 'off')
  const fontEnabled = useState<boolean>('venix-font', () => cookies.fontCookie.value !== 'off')

  // Turned off = the attribute set to 'off' on `<html>`, which the generated
  // CSS checks (see shared/css/scrollbar.ts, cursor.ts and typography.ts).
  const applyToggles = () => {
    if (typeof document === 'undefined') return
    const html = document.documentElement
    const flags: Array<[string, boolean]> = [
      [SCROLLBAR_ATTRIBUTE, scrollbarEnabled.value],
      [CURSOR_ATTRIBUTE, cursorEnabled.value],
      [FONT_ATTRIBUTE, fontEnabled.value],
    ]
    for (const [attribute, enabled] of flags) {
      if (enabled) html.removeAttribute(attribute)
      else html.setAttribute(attribute, 'off')
    }
  }

  const persistToggles = () => cookies.persistTogglesIfConsented({
    scrollbar: scrollbarEnabled.value,
    cursor: cursorEnabled.value,
    font: fontEnabled.value,
  })

  // Bumped whenever something theme resolution depends on changes outside
  // Vue's reactivity (OS color scheme, the date rolling over to a new day),
  // so the computeds below don't stay stuck on a stale result. Shared, since
  // only the effects installed once per app bump it.
  const environmentVersion = useState<number>('venix-theme-environment', () => 0)

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
    // on `html` and inherited by `body` (see shared/css/cursor.ts) — pinning
    // the computed value via inline style on `body` guarantees, with the
    // highest possible specificity, that the right cursor keeps showing even
    // if the browser ignores the inherited one during the animation.
    // Elements with their own cursor rule (buttons, links, text fields) are
    // unaffected — a rule that matches the element directly always wins over
    // inheritance, with or without `!important` on either side.
    //
    // `getComputedStyle` forces a synchronous style recalculation — only
    // worth paying that cost (right in the middle of the transition) when
    // the project actually has a custom cursor enabled; otherwise the
    // result would always be 'auto' and this whole block would be wasted work.
    // (Read from the runtime config: the cursor options only exist at build time.)
    const body = document.body
    const hasCustomCursor = cursorAvailable && cursorEnabled.value
    const pinCursor = () => {
      body.style.removeProperty('cursor')
      const cursor = getComputedStyle(body).cursor
      if (cursor && cursor !== 'auto') body.style.setProperty('cursor', cursor, 'important')
    }
    if (hasCustomCursor) pinCursor()

    const restoreCursor = () => body.style.removeProperty('cursor')

    // `.ready`/`.finished` reject when the browser skips or aborts the
    // transition (e.g. a new switch arrives before the previous one
    // finishes, or the tab is hidden) — an expected outcome, not a real
    // error; without the `.catch()`s, this turns into "Uncaught (in
    // promise)" in the console.
    const transition = document.startViewTransition(() => {
      apply(selection)
      // The cursor is drawn in the theme's color: pin the new theme's one,
      // so it changes along with the colors rather than when the animation ends.
      if (hasCustomCursor) pinCursor()
    })
    transition.ready.catch(() => {})
    transition.finished.then(restoreCursor).catch(restoreCursor)
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
      persistToggles()
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
    themeConfig,
    theme,
    shouldApplyColors,
    cookies,
    requireConsent,
    hasConsent,
    scrollbarAvailable,
    cursorAvailable,
    fontAvailable,
    scrollbarEnabled,
    cursorEnabled,
    fontEnabled,
    applyToggles,
    persistToggles,
    locale,
    colors,
    preference,
    modePreference,
    environmentVersion,
    readCookieSelection,
    currentSelection,
    getResolvedTheme,
    apply,
    applyWithTransition,
    syncPersistence,
    setConsent,
    setTheme,
    setMode,
    resolvedTheme,
    resolvedMode,
    toggleMode,
    toggle,
    data,
    modeData,
    activeSeasonalTheme,
    isSeasonalActive,
  }
}

type ThemeCore = ReturnType<typeof createThemeCore>

/**
 * Side effects of the theme state — applying it to `<html>`, persisting it,
 * reacting to the OS color scheme and the date. Installed once per app (see
 * `useVenixTheme`): when every call installed its own, a page plus
 * <VenixThemeSwitcher> started two View Transitions per switch (the second
 * aborting the first) and doubled every listener and cookie write.
 */
function installThemeEffects(core: ThemeCore) {
  const { themeConfig, shouldApplyColors, cookies, hasConsent, locale, preference, modePreference, environmentVersion, scrollbarEnabled, cursorEnabled, fontEnabled } = core

  // `lang` needs to reflect the resolved locale (WCAG 3.1.1) — but only when
  // NOTHING ELSE already owns that attribute. Off by default because, if the
  // project uses a routing i18n module (e.g. @nuxtjs/i18n), that's the one
  // that should control `lang`: its locale reflects the current URL, while
  // ours only reflects the cookie/browser language — the two can diverge
  // (e.g. user navigates to `/es`, but our cookie still says `pt`), and this
  // sync would end up fighting with i18n's own. See `translation.manageHtmlLang`.
  if (themeConfig?.enabled?.manageHtmlLang) {
    document.documentElement.lang = locale.currentLocale.value
    watch(locale.currentLocale, (newLocale) => {
      document.documentElement.lang = newLocale
    })
  }

  if (shouldApplyColors) {
    // `preference` (`useState`) can hydrate from a stale payload: on a page
    // that was prerendered/cached (e.g. a static host serving the same HTML
    // to every visitor), the value baked in at build time was computed with
    // no request cookie available and never reflects this visitor's actual
    // choice. `useCookie`, unlike `useState`, always re-reads `document.cookie`
    // on the client (see Nuxt's `useCookie` internals) — it's never poisoned
    // by that stale payload, so it's the one to trust whenever the two disagree.
    if (cookies.preferenceCookie.value || cookies.modeCookie.value) {
      const fromCookies = core.readCookieSelection()
      if (fromCookies.theme !== preference.value) preference.value = fromCookies.theme
      if (fromCookies.mode !== modePreference.value) modePreference.value = fromCookies.mode
    }

    // Normally already set by the pre-hydration script (theme-init.ts).
    if (!document.documentElement.getAttribute('data-theme')) {
      core.apply(core.currentSelection())
    }

    watch([preference, modePreference], () => {
      const selection = core.currentSelection()
      core.applyWithTransition(selection)
      cookies.persistIfConsented(selection.theme, selection.mode, core.getResolvedTheme(selection))
    })
  }

  // The custom scrollbar/cursor/font switches: the cookies win over a stale
  // payload, as with the theme above. Normally already applied by the
  // pre-hydration script, which doesn't run when the colors are off.
  scrollbarEnabled.value = cookies.scrollbarCookie.value !== 'off'
  cursorEnabled.value = cookies.cursorCookie.value !== 'off'
  fontEnabled.value = cookies.fontCookie.value !== 'off'
  core.applyToggles()

  watch([scrollbarEnabled, cursorEnabled, fontEnabled], () => {
    core.applyToggles()
    core.persistToggles()
  })

  // After hydration: `localStorage` and the listeners only exist on the
  // client, and correcting `hasConsent` before hydration would mismatch the
  // server-rendered markup (SSR always initializes it as `false`).
  onNuxtReady(() => {
    hasConsent.value = hasCookieConsent()

    window.addEventListener(COOKIE_PREFERENCES_UPDATED_EVENT, core.syncPersistence)

    if (!shouldApplyColors) return

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      environmentVersion.value++
      if (modePreference.value === 'system') core.applyWithTransition(core.currentSelection())
    })

    // Re-arms itself every midnight, so 'system' (by date) picks up a season
    // starting or ending while the page stays open.
    const scheduleSeasonalCheck = () => {
      const now = new Date()
      const msToMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime()

      setTimeout(() => {
        environmentVersion.value++
        if (preference.value === SYSTEM_THEME) core.applyWithTransition(core.currentSelection())
        scheduleSeasonalCheck()
      }, msToMidnight + 1000)
    }

    scheduleSeasonalCheck()
  })
}

export const useVenixTheme = () => {
  const core = createThemeCore()

  // The effects live for the whole app, not for the component that happened
  // to call this first: a detached scope keeps them running after it
  // unmounts. Client only — on the server nothing changes after render.
  if (import.meta.client) {
    const nuxtApp = useNuxtApp() as ReturnType<typeof useNuxtApp> & { _venixThemeEffects?: boolean }
    if (!nuxtApp._venixThemeEffects) {
      nuxtApp._venixThemeEffects = true
      effectScope(true).run(() => installThemeEffects(createThemeCore()))
    }
  }

  return {
    theme: {
      value: core.resolvedTheme,
      preference: core.preference,
      data: core.data,
      set: core.setTheme,
      toggle: core.toggle,
      isSeasonalActive: core.isSeasonalActive,
      activeSeasonalTheme: core.activeSeasonalTheme,
      shouldApplyColors: core.shouldApplyColors,
      colors: core.theme.colors,
    },
    themes: core.colors.themes,
    mode: {
      value: core.resolvedMode,
      preference: core.modePreference,
      data: core.modeData,
      set: core.setMode,
      toggle: core.toggleMode,
    },
    modes: core.colors.modes,
    /** The custom scrollbar: `available` when the project has it on, `enabled` unless the visitor turned it off. */
    scrollbar: {
      available: core.scrollbarAvailable,
      enabled: core.scrollbarEnabled,
      set: (enabled: boolean) => { core.scrollbarEnabled.value = enabled },
    },
    /** The custom cursor, same as `scrollbar`. */
    cursor: {
      available: core.cursorAvailable,
      enabled: core.cursorEnabled,
      set: (enabled: boolean) => { core.cursorEnabled.value = enabled },
    },
    /** The custom font (`typography.customFonts`), same as `scrollbar`: off leaves the `defaultFonts`. */
    font: {
      available: core.fontAvailable,
      enabled: core.fontEnabled,
      set: (enabled: boolean) => { core.fontEnabled.value = enabled },
    },
    locale: {
      current: core.locale.currentLocale,
      set: core.locale.setLocale,
      translate: core.locale.translate,
    },
    persistence: {
      /** `color.requireConsent`: whether changes are only saved after consent. */
      required: core.requireConsent,
      hasConsent: core.hasConsent,
      grant: () => core.setConsent(true),
      revoke: () => core.setConsent(false),
      enable: () => {
        core.cookies.persistIfConsented(core.preference.value, core.modePreference.value, core.getResolvedTheme())
        core.persistToggles()
      },
      disable: core.cookies.disablePersistence,
    },
  }
}

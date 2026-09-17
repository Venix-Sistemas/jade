// runtime/scripts/theme-init.ts
import type { ThemeConfig, ThemeColors } from '../../shared/types'

declare global {
  interface Window {
    __VENIX_INITIAL_THEME__?: string
  }
}

/**
 * Runs as an inline script in `<head>`, injected via Nitro's `render:html`
 * hook by the `runtime/nitro/theme-init.ts` plugin (see
 * `setup/register-plugins.ts`) — BEFORE the Vue bundle, to avoid a
 * wrong-theme flash before hydration (SSR doesn't know the user's real
 * light/dark preference when the preference is 'system', nor does it have
 * `matchMedia`).
 *
 * Because it runs this way, this function (only this function — the rest of
 * the file, including the type imports, is erased by TypeScript and never
 * reaches the browser) has to be 100% self-contained: `initTheme.toString()`
 * gets serialized and executed as a standalone IIFE, so any import from
 * another module would become a `ReferenceError` on the client. That's why
 * the cookie names below and the theme-resolution rule
 * (`resolveThemePreference`/`getActiveSeasonalTheme`) are deliberately
 * duplicated — the canonical implementation, shared between the composable
 * and the SSR plugin, lives in `shared/constants.ts` and
 * `shared/utils/theme-resolve.ts`. Keep the two sides in sync when changing
 * either one.
 */
export default function initTheme(themeData: ThemeConfig): void {
  const THEME_PREFERENCE_COOKIE = 'venix-theme-preference'
  const THEME_RESOLVED_COOKIE = 'venix-theme-resolved'
  const COOKIE_CONSENT_STORAGE_KEY = 'venix-cookie-consent'

  function hasCookieConsent(): boolean {
    if (typeof localStorage === 'undefined') return false

    const consentData = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)
    if (!consentData) return false

    try {
      const consent = JSON.parse(consentData)
      return consent?.functionality === true
    }
    catch {
      return false
    }
  }

  function getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]+)'))
    const cookieValue = match?.[2]

    return cookieValue ? decodeURIComponent(cookieValue) : null
  }

  function setCookieIfConsented(name: string, value: string): void {
    if (hasCookieConsent()) {
      document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`
    }
  }

  function isColorTheme(themeConfig: ThemeColors | undefined): boolean {
    if (!themeConfig) return false
    return !!themeConfig.primary || !!themeConfig.background
  }

  function isDateInSeasonalRange(themeConfig: ThemeColors, now: Date): boolean {
    if (themeConfig.seasonal !== true || !themeConfig.dateRange) return false

    const startParts = themeConfig.dateRange.start.split('-').map(Number)
    const endParts = themeConfig.dateRange.end.split('-').map(Number)

    if (startParts.length !== 2 || endParts.length !== 2) return false

    const [startMonth, startDay] = startParts
    const [endMonth, endDay] = endParts

    if (startMonth === undefined || startDay === undefined
      || endMonth === undefined || endDay === undefined) return false

    const current = (now.getMonth() + 1) * 100 + now.getDate()
    const startNum = startMonth * 100 + startDay
    const endNum = endMonth * 100 + endDay

    return startNum <= endNum
      ? current >= startNum && current <= endNum
      : current >= startNum || current <= endNum
  }

  function getActiveSeasonalTheme(themes: Record<string, ThemeColors>, prefersDark: boolean): string | null {
    const now = new Date()

    for (const [themeName, themeConfig] of Object.entries(themes)) {
      if (themeName === 'system') continue
      if (!isColorTheme(themeConfig)) continue
      if (!isDateInSeasonalRange(themeConfig, now)) continue
      if (themeConfig.dark !== prefersDark) continue
      return themeName
    }

    return null
  }

  function resolveThemePreference(
    preference: string | undefined,
    themes: Record<string, ThemeColors>,
    defaultTheme: string,
    prefersDark: boolean,
  ): string {
    let resolved: string

    if (preference === 'system') {
      resolved = getActiveSeasonalTheme(themes, prefersDark) || (prefersDark ? 'dark' : 'light')
    }
    else if (preference && isColorTheme(themes[preference])) {
      resolved = preference
    }
    else {
      resolved = defaultTheme
    }

    if (!isColorTheme(themes[resolved])) {
      resolved = isColorTheme(themes[defaultTheme]) ? defaultTheme : 'dark'
    }

    return resolved
  }

  const html = document.documentElement

  const themes = themeData.colors?.themes || {}
  const defaultTheme = themeData.colors?.defaultColor || 'dark'
  const preference = getCookie(THEME_PREFERENCE_COOKIE)
  const resolvedCookie = getCookie(THEME_RESOLVED_COOKIE)
  const systemPrefersDark = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: dark)').matches

  let theme: string

  if (resolvedCookie && isColorTheme(themes[resolvedCookie])) {
    theme = resolvedCookie
  }
  else {
    theme = resolveThemePreference(preference || undefined, themes, defaultTheme, systemPrefersDark)
  }

  html.classList.add(theme)
  html.setAttribute('data-theme', theme)
  window.__VENIX_INITIAL_THEME__ = theme

  if (!resolvedCookie || resolvedCookie !== theme) {
    setCookieIfConsented(THEME_RESOLVED_COOKIE, theme)
  }

  if (!preference) {
    setCookieIfConsented(THEME_PREFERENCE_COOKIE, theme)
  }
}

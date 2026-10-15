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
export interface InitThemeOptions {
  /** See `color.requireConsent` — when `false`, the theme cookies are always written. */
  requireConsent?: boolean
}

export default function initTheme(themeData: ThemeConfig, options: InitThemeOptions = {}): void {
  const requireConsent = options.requireConsent !== false
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
    if (!requireConsent || hasCookieConsent()) {
      document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=31536000; SameSite=Lax`
    }
  }

  function isColorTheme(themeConfig: ThemeColors | undefined): boolean {
    if (!themeConfig) return false
    return !!themeConfig.primary || !!themeConfig.background
  }

  function getEasterSunday(year: number): Date {
    const a = year % 19
    const b = Math.floor(year / 100)
    const c = year % 100
    const d = Math.floor(b / 4)
    const e = b % 4
    const f = Math.floor((b + 8) / 25)
    const g = Math.floor((b - f + 1) / 3)
    const h = (19 * a + b - d - g + 15) % 30
    const i = Math.floor(c / 4)
    const k = c % 4
    const l = (32 + 2 * e + 2 * i - h - k) % 7
    const m = Math.floor((a + 11 * h + 22 * l) / 451)
    const month = Math.floor((h + l - 7 * m + 114) / 31)
    const day = ((h + l - 7 * m + 114) % 31) + 1

    return new Date(year, month - 1, day)
  }

  function parseDatePart(value: string, year: number): number | null {
    const easter = /^easter([+-]\d+)?$/.exec(value.trim())
    if (easter) {
      const date = getEasterSunday(year)
      date.setDate(date.getDate() + Number(easter[1] ?? 0))
      return (date.getMonth() + 1) * 100 + date.getDate()
    }

    const parts = value.split('-').map(Number)
    if (parts.length !== 2) return null

    const [month, day] = parts
    if (month === undefined || day === undefined) return null

    return month * 100 + day
  }

  function isDateInSeasonalRange(themeConfig: ThemeColors, now: Date): boolean {
    if (themeConfig.seasonal !== true || !themeConfig.dateRange) return false

    const year = now.getFullYear()
    const startNum = parseDatePart(themeConfig.dateRange.start, year)
    const endNum = parseDatePart(themeConfig.dateRange.end, year)
    if (startNum === null || endNum === null) return false

    const current = (now.getMonth() + 1) * 100 + now.getDate()

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

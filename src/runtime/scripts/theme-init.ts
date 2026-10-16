// runtime/scripts/theme-init.ts
import type { ThemeConfig, ThemeColors, ThemeMode, ThemeModePreference, ResolvedThemeGroup } from '../../shared/types'

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
 * (`normalizeThemeSelection`/`resolveThemeSelection`) are deliberately
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
  const THEME_MODE_COOKIE = 'venix-theme-mode'
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

  function isDateInSeasonalRange(group: ResolvedThemeGroup, now: Date): boolean {
    if (group.seasonal !== true || !group.dateRange) return false

    const year = now.getFullYear()
    const startNum = parseDatePart(group.dateRange.start, year)
    const endNum = parseDatePart(group.dateRange.end, year)
    if (startNum === null || endNum === null) return false

    const current = (now.getMonth() + 1) * 100 + now.getDate()

    return startNum <= endNum
      ? current >= startNum && current <= endNum
      : current >= startNum || current <= endNum
  }

  const themes = themeData.colors?.themes || {}
  const groups = themeData.colors?.groups || {}

  function isModePreference(value: unknown): value is ThemeModePreference {
    return value === 'system' || value === 'light' || value === 'dark'
  }

  function isSelectableGroup(name: string): boolean {
    const group = groups[name]
    if (!group || name === 'system') return false
    return Object.values(group.variants).some(id => !!id && isColorTheme(themes[id]))
  }

  function findVariantOwner(id: string): { theme: string, mode: ThemeMode } | null {
    for (const [name, group] of Object.entries(groups)) {
      if (group.variants.dark === id) return { theme: name, mode: 'dark' }
      if (group.variants.light === id) return { theme: name, mode: 'light' }
    }
    return null
  }

  function getDefaultSelection(): { theme: string, mode: ThemeModePreference, fallbackTheme: string } {
    const selectable = Object.keys(groups).filter(isSelectableGroup)
    const firstRegular = selectable.find(name => groups[name]?.seasonal !== true) ?? selectable[0] ?? ''

    const defaultColor = themeData.colors?.defaultColor || 'dark'
    if (isSelectableGroup(defaultColor)) {
      return { theme: defaultColor, mode: 'system', fallbackTheme: defaultColor }
    }

    const owner = findVariantOwner(defaultColor)
    if (owner && isSelectableGroup(owner.theme)) {
      return { ...owner, fallbackTheme: owner.theme }
    }

    return { theme: 'system', mode: 'system', fallbackTheme: firstRegular }
  }

  function normalizeThemeSelection(themePreference: string | null, modePreference: string | null): { theme: string, mode: ThemeModePreference } {
    const defaults = getDefaultSelection()
    let theme = defaults.theme
    let impliedMode: ThemeModePreference = defaults.mode

    if (themePreference === 'system') {
      theme = 'system'
      impliedMode = 'system'
    }
    else if (themePreference && isSelectableGroup(themePreference)) {
      theme = themePreference
    }
    else if (themePreference) {
      const owner = findVariantOwner(themePreference)
      if (owner && isSelectableGroup(owner.theme)) {
        theme = owner.theme
        impliedMode = owner.mode
      }
    }

    const hasSeasonal = Object.values(groups).some(group => group.seasonal === true)
    if (theme === 'system' && !hasSeasonal && defaults.fallbackTheme) theme = defaults.fallbackTheme

    return { theme, mode: isModePreference(modePreference) ? modePreference : impliedMode }
  }

  function getActiveSeasonalTheme(mode: ThemeMode, now: Date): string | null {
    for (const [name, group] of Object.entries(groups)) {
      if (name === 'system') continue
      if (!group.variants.dark && !group.variants.light) continue
      if (!isDateInSeasonalRange(group, now)) continue
      if (!group.variants[mode]) continue
      return name
    }

    return null
  }

  function resolveThemeSelection(selection: { theme: string, mode: ThemeModePreference }, prefersDark: boolean): string {
    const mode: ThemeMode = selection.mode === 'system' ? (prefersDark ? 'dark' : 'light') : selection.mode
    const { fallbackTheme } = getDefaultSelection()

    const theme = selection.theme === 'system'
      ? getActiveSeasonalTheme(mode, new Date()) ?? fallbackTheme
      : selection.theme

    const pick = (name: string): string | null => {
      const variants = groups[name]?.variants
      const id = variants?.[mode] ?? variants?.[mode === 'dark' ? 'light' : 'dark']
      return id && isColorTheme(themes[id]) ? id : null
    }

    return pick(theme)
      ?? pick(fallbackTheme)
      ?? Object.keys(themes).find(id => isColorTheme(themes[id]))
      ?? 'dark'
  }

  const html = document.documentElement

  const preference = getCookie(THEME_PREFERENCE_COOKIE)
  const modePreference = getCookie(THEME_MODE_COOKIE)
  const resolvedCookie = getCookie(THEME_RESOLVED_COOKIE)
  const systemPrefersDark = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: dark)').matches

  const selection = normalizeThemeSelection(preference, modePreference)

  let theme: string

  if (resolvedCookie && isColorTheme(themes[resolvedCookie])) {
    theme = resolvedCookie
  }
  else {
    theme = resolveThemeSelection(selection, systemPrefersDark)
  }

  html.classList.add(theme)
  html.setAttribute('data-theme', theme)
  window.__VENIX_INITIAL_THEME__ = theme

  if (!resolvedCookie || resolvedCookie !== theme) {
    setCookieIfConsented(THEME_RESOLVED_COOKIE, theme)
  }

  if (!preference) {
    setCookieIfConsented(THEME_PREFERENCE_COOKIE, selection.theme)
  }

  if (!modePreference) {
    setCookieIfConsented(THEME_MODE_COOKIE, selection.mode)
  }
}

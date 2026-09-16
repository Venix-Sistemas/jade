// runtime/scripts/theme-init.ts
import type { ThemeConfig, ThemeColors } from '../../shared/types'

declare global {
  interface Window {
    __VENIX_INITIAL_THEME__?: string
  }
}

/**
 * Roda como script inline no `<head>`, injetado via o hook `render:html` do
 * Nitro pelo plugin `runtime/nitro/theme-init.ts` (ver
 * `setup/register-plugins.ts`) — ANTES do bundle do Vue, para evitar flash de
 * tema/locale errado antes da hidratação (SSR não sabe a preferência real de
 * claro/escuro do usuário quando a preferência é 'system', nem tem
 * `matchMedia`).
 *
 * Por rodar assim, esta função (só ela — o resto do arquivo, incluindo os
 * imports de tipo, é apagado pelo TypeScript e nunca chega no navegador)
 * precisa ser 100% autocontida: `initTheme.toString()` é serializado e
 * executado como uma IIFE isolada, então qualquer import de outro módulo
 * viraria `ReferenceError` no cliente. Por isso os nomes de cookies abaixo e
 * a regra de resolução de tema (`resolveThemePreference`/
 * `getActiveSeasonalTheme`) são duplicados de propósito — a implementação
 * canônica, compartilhada entre a composable e o plugin de SSR, vive em
 * `shared/constants.ts` e `shared/utils/theme-resolve.ts`. Mantenha os dois
 * lados em sincronia ao alterar um deles.
 */
export default function initTheme(themeData: ThemeConfig): void {
  const THEME_PREFERENCE_COOKIE = 'venix-theme-preference'
  const THEME_RESOLVED_COOKIE = 'venix-theme-resolved'
  const THEME_LOCALE_COOKIE = 'venix-theme-locale'
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

  function detectLocale(): string {
    if (typeof navigator !== 'undefined') return navigator.language || 'en-US'
    return 'en-US'
  }

  const html = document.documentElement

  // Detecta e salva o locale — só grava cookie se tiver consentimento e não
  // existir cookie ainda.
  const savedLocale = getCookie(THEME_LOCALE_COOKIE)
  const locale = savedLocale || detectLocale()
  if (!savedLocale) setCookieIfConsented(THEME_LOCALE_COOKIE, locale)

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

// runtime/scripts/theme-init.ts
import type { ResolvedTheme } from '../../shared/types'
import { createThemeResolver } from '../../shared/utils/theme-resolver'
import type { ThemeResolver } from '../../shared/utils/theme-resolver'
import { toInlineScriptJson } from '../../shared/utils/inline-script'
import {
  THEME_PREFERENCE_COOKIE,
  THEME_MODE_COOKIE,
  THEME_RESOLVED_COOKIE,
  THEME_COOKIE_MAX_AGE,
  COOKIE_CONSENT_STORAGE_KEY,
} from '../../shared/constants'

declare global {
  interface Window {
    __VENIX_INITIAL_THEME__?: string
  }
}

export interface InitThemeOptions {
  /** See `color.requireConsent` — when `false`, the theme cookies are always written. */
  requireConsent: boolean
  cookies: { preference: string, mode: string, resolved: string }
  /** In seconds. */
  cookieMaxAge: number
  consentStorageKey: string
}

/**
 * Runs as an inline script in `<head>`, injected via Nitro's `render:html`
 * hook by the `runtime/nitro/theme-init.ts` plugin (see
 * `setup/register-plugins.ts`) — BEFORE the Vue bundle, to avoid a
 * wrong-theme flash before hydration (SSR doesn't know the user's real
 * light/dark preference when the mode is 'system', nor does it have
 * `matchMedia`).
 *
 * Because it runs this way, this function (only this function — the rest of
 * the file, including the type imports, is erased by TypeScript and never
 * reaches the browser) has to be 100% self-contained: `initTheme.toString()`
 * gets serialized and executed as a standalone IIFE, so anything from another
 * module would be a `ReferenceError` on the client. Everything it needs comes
 * in as arguments instead: the theme-resolution rule as the (equally
 * self-contained) `createThemeResolver` factory, and the cookie names and
 * settings from `shared/constants.ts` in `options`.
 */
export default function initTheme(
  createThemeResolver: () => ThemeResolver,
  themeData: ResolvedTheme,
  options: InitThemeOptions,
): void {
  const resolver = createThemeResolver()
  const { requireConsent, cookies, cookieMaxAge, consentStorageKey } = options

  function hasCookieConsent(): boolean {
    if (typeof localStorage === 'undefined') return false

    const consentData = localStorage.getItem(consentStorageKey)
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
      document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${cookieMaxAge}; SameSite=Lax`
    }
  }

  const colors = {
    themes: themeData.colors?.themes || {},
    groups: themeData.colors?.groups || {},
    defaultColor: themeData.colors?.defaultColor,
  }

  const html = document.documentElement

  const preference = getCookie(cookies.preference)
  const modePreference = getCookie(cookies.mode)
  const resolvedCookie = getCookie(cookies.resolved)
  const systemPrefersDark = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: dark)').matches

  const selection = resolver.normalizeThemeSelection(preference, modePreference, colors)

  // Always recomputed, never taken from the resolved cookie: with theme or
  // mode 'system' that cookie can be from another season or from before the
  // OS switched modes. The cookie is only refreshed below.
  const theme = resolver.resolveThemeSelection(selection, colors, systemPrefersDark)

  html.classList.add(theme)
  html.setAttribute('data-theme', theme)
  window.__VENIX_INITIAL_THEME__ = theme

  if (resolvedCookie !== theme) {
    setCookieIfConsented(cookies.resolved, theme)
  }

  if (!preference) {
    setCookieIfConsented(cookies.preference, selection.theme)
  }

  if (!modePreference) {
    setCookieIfConsented(cookies.mode, selection.mode)
  }
}

export function createInitThemeOptions(requireConsent: boolean): InitThemeOptions {
  return {
    requireConsent,
    cookies: { preference: THEME_PREFERENCE_COOKIE, mode: THEME_MODE_COOKIE, resolved: THEME_RESOLVED_COOKIE },
    cookieMaxAge: THEME_COOKIE_MAX_AGE,
    consentStorageKey: COOKIE_CONSENT_STORAGE_KEY,
  }
}

/** The inline script's source: `initTheme` as an IIFE, with its arguments serialized. */
export function renderInitThemeScript(themeData: ResolvedTheme, options: InitThemeOptions): string {
  return `(${initTheme.toString()})(${createThemeResolver.toString()}, ${toInlineScriptJson(themeData)}, ${toInlineScriptJson(options)})`
}

// src/shared/constants.ts

// ===== COOKIES =====
export const THEME_PREFERENCE_COOKIE = 'venix-theme-preference'
export const THEME_RESOLVED_COOKIE = 'venix-theme-resolved'

// ===== EVENTS =====
export const COOKIE_PREFERENCES_UPDATED_EVENT = 'venix-cookie-preferences-updated'
/**
 * Dispatched synchronously by `apply()` (useVenixTheme.ts), inside the same
 * `document.startViewTransition()` callback — BEFORE the View Transition
 * captures the new state. Integrations that need to react to theme changes
 * (e.g. `vuetify-theme.ts`) should listen for this event instead of watching
 * `theme.preference` on their own: a separate `watch()` runs asynchronously,
 * decoupled from the transition (Vue's timing isn't the browser's), so the
 * integration's DOM mutation ends up competing with the View Transition's
 * snapshot capture for the same frame — in practice this can cause a real,
 * noticeable freeze in apps with a lot of theme-reactive DOM (e.g. Vuetify
 * recomputing CSS vars for every component). Listening for this event
 * guarantees the integration runs in the same synchronous tick as the
 * `data-theme` change, as part of the same transition.
 */
export const THEME_APPLIED_EVENT = 'venix-theme-applied'

// ===== LOCAL STORAGE =====
/** Read (never written) by this module — the consumer app's cookie-consent UI writes here. */
export const COOKIE_CONSENT_STORAGE_KEY = 'venix-cookie-consent'

// ===== LOCALE =====
export const DEFAULT_LOCALE = 'en-US'
export const DEFAULT_LOCALE_COOKIE_NAME = 'i18n_redirected'
export const LOCALE_MAP: Record<string, string> = {
  pt: 'pt-BR',
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  ja: 'ja-JP',
  ko: 'ko-KR',
  zh: 'zh-CN',
}

// ===== THEME =====
export const DEFAULT_THEME = 'dark'
export const SYSTEM_THEME = 'system'

// ===== COLOR PROPERTIES =====
export const COLOR_PROPERTIES = [
  'primary',
  'secondary',
  'accent',
  'error',
  'info',
  'success',
  'warning',
  'background',
  'background2',
  'background3',
] as const

// ===== NON_COLOR_PROPERTIES =====
export const NON_COLOR_PROPERTIES = [
  'dark',
  'seasonal',
  'dateRange',
  'translations',
  'icon',
] as const

// ===== CSS =====
export const CSS_HEADER = '/* ============================================ */'

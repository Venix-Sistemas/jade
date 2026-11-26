// src/shared/constants.ts

// ===== COOKIES =====
export const THEME_PREFERENCE_COOKIE = 'venix-theme-preference'
export const THEME_RESOLVED_COOKIE = 'venix-theme-resolved'
/** The user's mode choice (`'system'`, `'light'`, `'dark'`); the theme itself stays in `THEME_PREFERENCE_COOKIE`. */
export const THEME_MODE_COOKIE = 'venix-theme-mode'
/**
 * One year, in seconds. Without it `useCookie` writes session cookies, so a
 * theme picked on the client was forgotten when the browser closed. The
 * pre-hydration script (`runtime/scripts/theme-init.ts`) hardcodes the same
 * value, since it can't import this.
 */
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365
/** Options for every `useCookie` of the theme cookies, so all writers agree. */
export const THEME_COOKIE_OPTIONS = { maxAge: THEME_COOKIE_MAX_AGE, path: '/', sameSite: 'lax' } as const
/** `'off'` when the visitor turned the custom scrollbar off (`scrollbar.set(false)`); missing or `'on'` keeps it. Same consent rule as the theme cookies. */
export const SCROLLBAR_COOKIE = 'venix-scrollbar'
/** Same as `SCROLLBAR_COOKIE`, for the custom cursor (`cursor.set(false)`). */
export const CURSOR_COOKIE = 'venix-cursor'
/** Same as `SCROLLBAR_COOKIE`, for the custom font (`font.set(false)`). */
export const FONT_COOKIE = 'venix-font'

// ===== HTML ATTRIBUTES =====
// Everything the module puts on a page is under its own `jade` name, so it
// doesn't collide with other packages (Vuetify0, for one, owns `data-theme`).
// The `LEGACY_*` names are the ones up to 1.5: still written while
// `legacyNames` is on, and removed in 2.0.
/** The applied theme variant, on `<html>`: what the generated CSS selects. */
/** On `<html>`: the variants the visitor customized (`color.lab`). */
export const LAB_ATTRIBUTE = 'data-jade-lab'
/** The cookie with those choices, and the `localStorage` key of the CSS they produced. */
export const LAB_COOKIE = 'jade-theme-custom'
/** The `<style>` that CSS goes in. */
export const LAB_STYLE_ID = 'jade-theme-lab'

export const THEME_ATTRIBUTE = 'data-jade-theme'
export const LEGACY_THEME_ATTRIBUTE = 'data-theme'
/** Prefix of the variant's class on `<html>` (`jade-theme-natal`). The old class is the bare variant id. */
export const THEME_CLASS_PREFIX = 'jade-theme-'
/** `'off'` on `<html>` switches the custom scrollbar off: its CSS only applies without it (see shared/css/scrollbar.ts). */
export const SCROLLBAR_ATTRIBUTE = 'data-jade-scrollbar'
export const LEGACY_SCROLLBAR_ATTRIBUTE = 'data-venix-scrollbar'
/** On any element that scrolls, gets it the overlay scrollbar too (see runtime/plugins/overlay-scrollbars.client.ts). */
export const SCROLL_CONTAINER_ATTRIBUTE = 'data-jade-scroll'
export const LEGACY_SCROLL_CONTAINER_ATTRIBUTE = 'data-venix-scroll'
/** The OverlayScrollbars theme the module styles (see shared/css/scrollbar.ts). */
export const OVERLAY_SCROLLBAR_THEME = 'os-theme-jade'
/** `'off'` on `<html>` puts the browser's own cursors back (see shared/css/cursor.ts). */
export const CURSOR_ATTRIBUTE = 'data-jade-cursor'
export const LEGACY_CURSOR_ATTRIBUTE = 'data-venix-cursor'
/** `'off'` on `<html>` leaves only the `defaultFonts` in the font variables (see shared/css/typography.ts). */
export const FONT_ATTRIBUTE = 'data-jade-font'
export const LEGACY_FONT_ATTRIBUTE = 'data-venix-font'

/** The classes of a variant on `<html>`. */
export const themeClasses = (id: string, legacyNames: boolean): string[] =>
  legacyNames ? [`${THEME_CLASS_PREFIX}${id}`, id] : [`${THEME_CLASS_PREFIX}${id}`]

// ===== PUBLIC FILES =====
/** Where the module's own files (fonts, cursor images) are served from. Up to 1.5 it was the site root. */
export const ASSETS_BASE = '/_jade'

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
 * `data-jade-theme` change, as part of the same transition.
 */
export const THEME_APPLIED_EVENT = 'venix-theme-applied'

// ===== LOCAL STORAGE =====
/** Where functional-cookie consent is stored — written by `persistence.grant()/revoke()` or by the consumer app's own consent UI. */
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
export const THEME_MODES = ['light', 'dark'] as const

// ===== SWITCHER =====
/**
 * The icons of <JadeThemeSwitcher>'s own controls, in the same formats as a
 * theme's icon. Listed here so `setup/register-icon.ts` bundles them along
 * with the themes' (line-md has no save, scroll, cursor or font icon, hence `mdi`).
 */
export const SWITCHER_ICONS = {
  settings: { emote: '⚙️', css: 'mdi:cog-outline', svg: 'line-md:cog' },
  back: { emote: '⬅️', css: 'mdi:arrow-left', svg: 'line-md:arrow-left' },
  customize: { emote: '✏️', css: 'mdi:pencil-outline', svg: 'line-md:pencil' },
  save: { emote: '💾', css: 'mdi:content-save-outline' },
  scrollbar: { emote: '↕️', css: 'mdi:mouse-scroll-wheel' },
  cursor: { emote: '🖱️', css: 'mdi:cursor-default-outline' },
  font: { emote: '🔤', css: 'mdi:format-font' },
} as const

/** The credit at the bottom of <JadeThemeSwitcher>'s settings. */
export const SWITCHER_CREDIT = {
  name: '@venix-sistemas/jade',
  url: 'https://github.com/Venix-Sistemas/jade',
} as const

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
  'id',
  'dark',
  'light',
  'seasonal',
  'dateRange',
  'translations',
  'icon',
  'tokens',
  'neutralTint',
  'surfaces',
  'borders',
] as const

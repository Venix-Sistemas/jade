export interface TranslationConfig {
  enabled: boolean
  locale: string
  defaultLocale: string
  cookieSync: string
  /**
   * Keeps `<html lang>` in sync with the locale this module resolves
   * (needed for screen readers to pronounce translated theme names correctly
   * — WCAG 3.1.1). Off by default: if the project already uses a real i18n
   * module (e.g. `@nuxtjs/i18n`), THAT should be the source of truth for
   * `lang` — turning this on at the same time can make the two fight over
   * the attribute. Only enable this in projects with no routing-based i18n,
   * that only use this module's own theme-name translations.
   */
  manageHtmlLang: boolean
}

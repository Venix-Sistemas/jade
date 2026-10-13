// src/shared/utils/index.ts
export {
  normalizeLocale,
  extractFirstLocale,
  normalizeColor,
  normalizeThemeName,
} from './normalize'
export { resolveFeatureOption } from './options'
export { resolveIcon, resolveThemeIcon } from './icon'
export type { IconKind, ResolvedIcon, ThemeIconFormat, ResolvedThemeIcon } from './icon'
export { extractIconRefs } from './icon-refs'
export { hasCookieConsent } from './consent'
export { isColorTheme, getActiveSeasonalTheme, resolveThemePreference } from './theme-resolve'
export { mergeColorThemes } from './merge-themes'
export { buildResolvedTheme } from './theme-config'
export type { VenixRuntimeThemeConfig } from './theme-config'

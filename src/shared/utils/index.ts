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
export {
  isColorTheme,
  getActiveSeasonalTheme,
  getEasterSunday,
  getDefaultSelection,
  normalizeThemeSelection,
  resolveThemeSelection,
  resolveThemePreference,
} from './theme-resolve'
export type { ColorModel, ThemeSelection } from './theme-resolve'
export { mergeColorThemes, normalizeColorThemes, findDeprecatedThemeEntries } from './merge-themes'
export { buildResolvedTheme, getBaseThemeEntries } from './theme-config'
export type { VenixRuntimeThemeConfig } from './theme-config'

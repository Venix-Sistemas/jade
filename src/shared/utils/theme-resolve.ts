// src/shared/utils/theme-resolve.ts
import type { ThemeColors } from '../types'

/**
 * A theme only really counts as a "color" theme if it has at least one real
 * color — placeholder entries like `'system'` (only used to show
 * "Automatic" in the UI, see `theme.json`) have `translations`/`icon` but no
 * color, and don't count.
 */
export function isColorTheme(themeConfig: ThemeColors | undefined): boolean {
  if (!themeConfig) return false
  return !!themeConfig.primary || !!themeConfig.background
}

function parseDatePart(value: string): [number, number] | null {
  const parts = value.split('-').map(Number)
  if (parts.length !== 2) return null

  const [month, day] = parts
  if (month === undefined || day === undefined) return null

  return [month, day]
}

function isDateInSeasonalRange(themeConfig: ThemeColors, now: Date): boolean {
  if (themeConfig.seasonal !== true || !themeConfig.dateRange) return false

  const start = parseDatePart(themeConfig.dateRange.start)
  const end = parseDatePart(themeConfig.dateRange.end)
  if (!start || !end) return false

  const current = (now.getMonth() + 1) * 100 + now.getDate()
  const startNum = start[0] * 100 + start[1]
  const endNum = end[0] * 100 + end[1]

  return startNum <= endNum
    ? current >= startNum && current <= endNum
    : current >= startNum || current <= endNum
}

/**
 * Active seasonal theme for today. When `prefersDark` is given, only returns
 * themes matching that mode (light/dark); when omitted, returns the first
 * active seasonal theme regardless of mode.
 */
export function getActiveSeasonalTheme(
  themes: Record<string, ThemeColors>,
  prefersDark?: boolean,
  now: Date = new Date(),
): string | null {
  for (const [themeName, themeConfig] of Object.entries(themes)) {
    if (themeName === 'system') continue
    if (!isColorTheme(themeConfig)) continue
    if (!isDateInSeasonalRange(themeConfig, now)) continue
    if (prefersDark !== undefined && themeConfig.dark !== prefersDark) continue
    return themeName
  }

  return null
}

/**
 * Resolves a theme preference (`'system'`, a theme name, or empty) to the
 * concrete color theme that should be applied. Single implementation of this
 * rule — used by `useVenixTheme`/`useThemeSeasonal` and the SSR plugin
 * (`theme-init.server.ts`). The pre-hydration script
 * (`runtime/scripts/theme-init.ts`) is the one documented exception: it has
 * to run as a self-contained IIFE (no imports), so it deliberately duplicates
 * this logic — keep the two in sync when changing either.
 */
export function resolveThemePreference(
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

// src/shared/utils/theme-resolve.ts
import type { ThemeColors } from '../types'
import { NON_COLOR_PROPERTIES } from '../constants'

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

/**
 * The theme's actual color entries (hex values only) — skips metadata like
 * `dark`/`translations`/`icon`. Shared by the CSS generator and the Vuetify
 * theme registration, so both always agree on what counts as a color.
 */
export function getThemeHexColors(themeConfig: ThemeColors): Array<[string, string]> {
  const result: Array<[string, string]> = []
  for (const [key, value] of Object.entries(themeConfig)) {
    if (NON_COLOR_PROPERTIES.includes(key as typeof NON_COLOR_PROPERTIES[number])) continue
    if (typeof value === 'string' && value.startsWith('#')) result.push([key, value])
  }
  return result
}

/** `easter`, `easter-47`, `easter+1` — days relative to Easter Sunday. */
const EASTER_RELATIVE = /^easter([+-]\d+)?$/

/** Easter Sunday (Gregorian calendar) — anonymous Gregorian algorithm (Meeus/Jones/Butcher). */
export function getEasterSunday(year: number): Date {
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

/**
 * Parses a `dateRange` bound into a comparable `MMDD` number for `year`.
 * Accepts a fixed `MM-DD` date or a movable one relative to Easter
 * (`easter±N`, e.g. Carnival Tuesday is `easter-47`).
 */
function parseDatePart(value: string, year: number): number | null {
  const easter = EASTER_RELATIVE.exec(value.trim())
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

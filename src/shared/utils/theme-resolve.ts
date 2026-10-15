// src/shared/utils/theme-resolve.ts
import type { ThemeColors, ThemeMeta, ThemeMode, ThemeModePreference, ResolvedThemeGroup } from '../types'
import { NON_COLOR_PROPERTIES, DEFAULT_THEME, SYSTEM_THEME } from '../constants'

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

function isDateInSeasonalRange(themeConfig: ThemeMeta, now: Date): boolean {
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

/** The resolved color model the functions below work on (a subset of `ColorsConfig`). */
export interface ColorModel {
  themes: Record<string, ThemeColors>
  groups: Record<string, ResolvedThemeGroup>
  defaultColor?: string
}

/** What the user picked: a theme (or `'system'`: by date) and a mode (or `'system'`: by OS). */
export interface ThemeSelection {
  theme: string
  mode: ThemeModePreference
}

export function isModePreference(value: unknown): value is ThemeModePreference {
  return value === 'system' || value === 'light' || value === 'dark'
}

/** A theme the user can actually pick: has at least one real variant. */
export function isSelectableGroup(colors: ColorModel, name: string): boolean {
  const group = colors.groups[name]
  if (!group || name === SYSTEM_THEME) return false
  return Object.values(group.variants).some(id => !!id && isColorTheme(colors.themes[id]))
}

/** The theme and mode a variant id belongs to (e.g. `'dark'` → venix/dark). */
export function findVariantOwner(colors: ColorModel, id: string): { theme: string, mode: ThemeMode } | null {
  for (const [name, group] of Object.entries(colors.groups)) {
    if (group.variants.dark === id) return { theme: name, mode: 'dark' }
    if (group.variants.light === id) return { theme: name, mode: 'light' }
  }
  return null
}

/**
 * Initial selection for a visitor with no saved choice, from `defaultColor`:
 * a theme name (mode follows the OS), a variant id (`'dark'` → that theme in
 * that mode, as before the theme/mode split) or `'system'` (both automatic).
 * `fallbackTheme` is the theme `'system'` uses outside any season.
 */
export function getDefaultSelection(colors: ColorModel): ThemeSelection & { fallbackTheme: string } {
  const selectable = Object.keys(colors.groups).filter(name => isSelectableGroup(colors, name))
  const firstRegular = selectable.find(name => colors.groups[name]?.seasonal !== true) ?? selectable[0] ?? ''

  const defaultColor = colors.defaultColor || DEFAULT_THEME
  if (isSelectableGroup(colors, defaultColor)) {
    return { theme: defaultColor, mode: 'system', fallbackTheme: defaultColor }
  }

  const owner = findVariantOwner(colors, defaultColor)
  if (owner && isSelectableGroup(colors, owner.theme)) {
    return { ...owner, fallbackTheme: owner.theme }
  }

  return { theme: SYSTEM_THEME, mode: 'system', fallbackTheme: firstRegular }
}

/**
 * Turns the saved preferences (cookies, possibly from before the theme/mode
 * split) into a valid selection. A legacy theme preference holding a variant
 * id (`'dark'`, `'light'`, `'carnaval'`) maps to its theme and, when no mode
 * was saved, to that variant's mode; a legacy `'system'` meant both automatic.
 */
export function normalizeThemeSelection(
  themePreference: string | null | undefined,
  modePreference: string | null | undefined,
  colors: ColorModel,
): ThemeSelection {
  const defaults = getDefaultSelection(colors)
  let theme = defaults.theme
  let impliedMode: ThemeModePreference = defaults.mode

  if (themePreference === SYSTEM_THEME) {
    theme = SYSTEM_THEME
    impliedMode = 'system'
  }
  else if (themePreference && isSelectableGroup(colors, themePreference)) {
    theme = themePreference
  }
  else if (themePreference) {
    const owner = findVariantOwner(colors, themePreference)
    if (owner && isSelectableGroup(colors, owner.theme)) {
      theme = owner.theme
      impliedMode = owner.mode
    }
  }

  return { theme, mode: isModePreference(modePreference) ? modePreference : impliedMode }
}

/**
 * Active seasonal theme for today. When `mode` is given, only returns themes
 * that have a variant for that mode; when omitted, returns the first active
 * seasonal theme regardless of mode.
 */
export function getActiveSeasonalTheme(
  groups: Record<string, ResolvedThemeGroup>,
  mode?: ThemeMode,
  now: Date = new Date(),
): string | null {
  for (const [name, group] of Object.entries(groups)) {
    if (name === SYSTEM_THEME) continue
    if (!group.variants.dark && !group.variants.light) continue
    if (!isDateInSeasonalRange(group, now)) continue
    if (mode !== undefined && !group.variants[mode]) continue
    return name
  }

  return null
}

/** Resolves `'system'` mode to a concrete one. */
export function resolveMode(mode: ThemeModePreference, prefersDark: boolean): ThemeMode {
  if (mode === 'system') return prefersDark ? 'dark' : 'light'
  return mode
}

/**
 * Resolves a selection to the concrete variant id to apply (`data-theme`).
 * The mode picks the variant; a theme with only the other variant uses that
 * one. `'system'` as theme means today's seasonal theme (one with a variant
 * for the mode), else the default theme.
 *
 * Single implementation of this rule — used by `useVenixTheme` and the SSR
 * and Vuetify plugins. The pre-hydration script
 * (`runtime/scripts/theme-init.ts`) is the one documented exception: it has
 * to run as a self-contained IIFE (no imports), so it deliberately duplicates
 * this logic — keep the two in sync when changing either.
 */
export function resolveThemeSelection(
  selection: ThemeSelection,
  colors: ColorModel,
  prefersDark: boolean,
  now: Date = new Date(),
): string {
  const mode = resolveMode(selection.mode, prefersDark)
  const { fallbackTheme } = getDefaultSelection(colors)

  const theme = selection.theme === SYSTEM_THEME
    ? getActiveSeasonalTheme(colors.groups, mode, now) ?? fallbackTheme
    : selection.theme

  const pick = (name: string): string | null => {
    const variants = colors.groups[name]?.variants
    const id = variants?.[mode] ?? variants?.[mode === 'dark' ? 'light' : 'dark']
    return id && isColorTheme(colors.themes[id]) ? id : null
  }

  return pick(theme)
    ?? pick(fallbackTheme)
    ?? Object.keys(colors.themes).find(id => isColorTheme(colors.themes[id]))
    ?? DEFAULT_THEME
}

/** `normalizeThemeSelection` + `resolveThemeSelection`, straight from the saved preferences. */
export function resolveThemePreference(
  themePreference: string | null | undefined,
  modePreference: string | null | undefined,
  colors: ColorModel,
  prefersDark: boolean,
  now: Date = new Date(),
): string {
  return resolveThemeSelection(normalizeThemeSelection(themePreference, modePreference, colors), colors, prefersDark, now)
}

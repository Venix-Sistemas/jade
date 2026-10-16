export interface ThemeTranslations {
  [locale: string]: string
}

export interface ThemeIconFormats {
  /** Emoji, always present — fallback when the preferred format doesn't exist. */
  emote: string
  /** Iconify icon name (e.g. 'mdi:sun-compass'), no animation (@nuxt/icon in CSS mode). */
  css?: string
  /** Iconify icon name (e.g. 'line-md:sunny-filled-loop'), animated (@nuxt/icon in SVG mode). */
  svg?: string
}

/** Light or dark — the two variants every theme can have. */
export type ThemeMode = 'light' | 'dark'

/** The user's mode choice: a fixed mode, or `'system'` to follow the OS. */
export type ThemeModePreference = ThemeMode | 'system'

/** The color slots of a theme variant — each becomes a `--color-<name>` CSS variable. */
export interface ThemePalette {
  primary?: string
  secondary?: string
  accent?: string
  error?: string
  info?: string
  success?: string
  warning?: string
  background?: string
  background2?: string
  background3?: string
}

/** One light/dark variant of a theme (`ThemeDefinition.light` / `.dark`). */
export interface ThemeVariant extends ThemePalette {
  /**
   * The value applied to `<html data-theme>` (and class) and used as the
   * Vuetify theme name. Default: `<theme>-<mode>` (e.g. `carnaval-light`).
   */
  id?: string
}

/** What a theme is called, how it's drawn and when it's active — shared by both variants. */
export interface ThemeMeta {
  seasonal?: boolean
  /**
   * Inclusive range, wrapping across year-end when `end` < `start`. Each bound
   * is a fixed `MM-DD` date or a movable one relative to Easter Sunday
   * (`easter`, `easter-47`, `easter+1`).
   */
  dateRange?: {
    start: string
    end: string
  }
  translations?: ThemeTranslations
  /** A plain emoji ('🎨') or an object with per-format variants — see `ThemeIconFormats`. */
  icon?: string | ThemeIconFormats
}

/**
 * A theme in the grouped format: shared metadata plus a `light` and/or a
 * `dark` variant. The user picks the theme and the mode independently; the
 * applied colors are the variant matching the mode.
 */
export interface ThemeDefinition extends ThemeMeta {
  light?: ThemeVariant
  dark?: ThemeVariant
}

/**
 * A single concrete set of colors, flagged light or dark. This is how
 * resolved variants are stored (`ColorsConfig.themes`), and also the legacy
 * flat config format — deprecated in `color.themes` in favor of
 * `ThemeDefinition`.
 */
export interface ThemeColors extends ThemeMeta, ThemePalette {
  dark?: boolean
}

/** An entry of `color.themes`: the grouped format, or the deprecated flat one. */
export type ThemeEntry = ThemeDefinition | ThemeColors

/** A selectable theme after resolution: its metadata and the ids of its variants. */
export interface ResolvedThemeGroup extends ThemeMeta {
  variants: Partial<Record<ThemeMode, string>>
  /** Added by the project in `color.themes`, not shipped with the module. */
  custom?: boolean
}

/** Label and icon of a mode option (`'system'`, `'light'`, `'dark'`). */
export interface ThemeModeLabel {
  translations?: ThemeTranslations
  icon?: string | ThemeIconFormats
}

export interface ColorsConfig {
  enabled: boolean
  defaults: boolean
  /** Initial choice for new visitors: a theme name, a variant id (`'dark'`) or `'system'`. */
  defaultColor: string
  /** Every concrete color variant, by id — what `data-theme` receives. */
  themes: Record<string, ThemeColors>
  /** The selectable themes (plus the `'system'` placeholder), each pointing at its variants. */
  groups: Record<string, ResolvedThemeGroup>
  /** Labels and icons for the mode picker. */
  modes: Record<string, ThemeModeLabel>
}

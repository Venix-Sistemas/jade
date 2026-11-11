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

/** Token name → step of a generated scale (`'neutral-3'`, `'primary-9'`; 1–12). */
export type TokenOverrides = Record<string, string>

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
  /**
   * Experimental (v1.4.0). Also generates the semantic color tokens
   * (`--jade-text-primary`, `--jade-fill-primary`, `--jade-bg-subtle`…)
   * from the variant's `primary`, `secondary` and `background`, next to the
   * usual `--color-*` variables, which stay unchanged. Default: `false`.
   *
   * An object also turns them on and re-points individual tokens at another
   * step (1–12) of the generated scales, so a surface can be stronger or
   * weaker without a fixed color: `{ 'bg-subtle': 'neutral-3' }`. Steps are
   * the same in light and dark, so one entry covers both modes, and the
   * contrast check runs on the result. `on-<role>` can't be overridden.
   */
  tokens?: boolean | TokenOverrides
  /**
   * Only with `tokens`. The neutral tokens (`bg`, `bg-subtle`, `text`,
   * `border`…) lean slightly toward the hue of `primary` by default, so the
   * theme feels of one piece; a `background` with a color of its own keeps
   * its hue instead, and its surfaces gain more of it the farther from the
   * page. `false` makes them plain grays, like a theme built on
   * `background2`/`background3` greys. Contrast is the same either way.
   * Default: `true`.
   */
  neutralTint?: boolean
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

/** The contrast level the semantic tokens aim for: WCAG AA (4.5:1 for text) or AAA (7:1). */
export type ContrastLevel = 'AA' | 'AAA'

export interface ColorsConfig {
  enabled: boolean
  defaults: boolean
  /** Contrast target of the semantic tokens and their build check (`color.contrast`). Build time only. */
  contrast?: ContrastLevel | false
  /**
   * The variants (ids in `themes`) whose tokens are the module's own default
   * for its built-in themes, not something the project asked for with
   * `tokens` or `experimental`. In 1.x Vuetify leaves their colors alone, so
   * its text on `primary` and its surfaces don't change under existing
   * projects, and the build doesn't warn about their contrast. Build time
   * only. Removed in 2.0, when the tokens become the only model.
   */
  defaultTokens?: string[]
  /** Initial choice for new visitors: a theme name, a variant id (`'dark'`) or `'system'`. */
  defaultColor: string
  /** Every concrete color variant, by id — what `data-theme` receives. */
  themes: Record<string, ThemeColors>
  /** The selectable themes (plus the `'system'` placeholder), each pointing at its variants. */
  groups: Record<string, ResolvedThemeGroup>
  /** Labels and icons for the mode picker. */
  modes: Record<string, ThemeModeLabel>
}

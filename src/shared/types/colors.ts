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

export interface ThemeColors {
  dark?: boolean
  seasonal?: boolean
  dateRange?: {
    start: string
    end: string
  }
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
  translations?: ThemeTranslations
  /** A plain emoji ('🎨') or an object with per-format variants — see `ThemeIconFormats`. */
  icon?: string | ThemeIconFormats
}

export interface ColorsConfig {
  enabled: boolean
  defaults: boolean
  defaultColor: string
  themes: Record<string, ThemeColors>
}

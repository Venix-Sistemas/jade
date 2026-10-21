export interface FontConfig {
  name: string
  /** Adds a `<link rel="preload">` for its first source, so it loads with the page. Default: `false`. */
  preload?: boolean
  sources: {
    woff2: string
  }
  weight: string
  style: string
}

export interface TypographyConfig {
  enabled: boolean
  defaultFonts: string
  fontSize: string
  customFonts: FontConfig[]
}

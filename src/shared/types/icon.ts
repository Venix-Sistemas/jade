export interface IconOptions {
  enabled: boolean
  /** Iconify collections bundled locally (offline), e.g. 'line-md'. */
  collections: string[]
  /** Shortcuts: short name -> emoji, Iconify icon name ('line-md:home') or inline SVG. */
  aliases: Record<string, string>
}

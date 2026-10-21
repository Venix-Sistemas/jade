// src/setup/register-fonts.ts
import type { Nuxt } from '@nuxt/schema'
import type { ThemeConfig } from '../shared/types'

const FONT_MIME_TYPES: Record<string, string> = {
  woff2: 'font/woff2',
  woff: 'font/woff',
  truetype: 'font/ttf',
  opentype: 'font/otf',
}

interface FontPreloadLink {
  rel: 'preload'
  as: 'font'
  href: string
  type: string
  crossorigin: 'anonymous'
}

/**
 * `<link rel="preload">` for each custom font marked `preload: true`, so the
 * browser fetches it with the page instead of only once the CSS asks for it
 * (which shows the fallback font first). One file per font, its first source
 * (`woff2` in practice): preloading every format would download them all.
 */
export function getFontPreloadLinks(theme: ThemeConfig): FontPreloadLink[] {
  if (theme.typography?.enabled === false) return []

  const links: FontPreloadLink[] = []
  for (const font of theme.typography?.customFonts ?? []) {
    if (!font.preload) continue
    const [format, href] = Object.entries(font.sources ?? {})[0] ?? []
    if (!format || !href) continue
    // Fonts are always fetched in CORS mode; without `crossorigin` the
    // preloaded file wouldn't be reused and the font would download twice.
    links.push({ rel: 'preload', as: 'font', href, type: FONT_MIME_TYPES[format] ?? `font/${format}`, crossorigin: 'anonymous' })
  }
  return links
}

export function registerFontPreloads(nuxt: Nuxt, theme: ThemeConfig) {
  const links = getFontPreloadLinks(theme)
  if (!links.length) return

  // unhead types links as a union by `rel`, which a plain object doesn't narrow to
  type HeadLink = NonNullable<typeof nuxt.options.app.head.link>[number]
  nuxt.options.app.head.link = [...(nuxt.options.app.head.link ?? []), ...(links as HeadLink[])]
}

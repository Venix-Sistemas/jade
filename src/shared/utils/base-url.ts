// src/shared/utils/base-url.ts
import type { ThemeConfig } from '../types'

/**
 * `path` under the app's `baseURL`: `'/fonts/a.woff2'` with `'/jade/'` is
 * `'/jade/fonts/a.woff2'`. Only an absolute path (`/…`) moves: a full URL
 * (`https://…`, `//cdn…`), a `data:` URI or a relative path points where it
 * says, and a path already under the base is left as it is.
 */
export function withBaseURL(path: string, baseURL: string | undefined): string {
  const base = (baseURL ?? '/').replace(/\/+$/, '')
  if (!base || !path.startsWith('/') || path.startsWith('//')) return path
  return path === base || path.startsWith(`${base}/`) ? path : `${base}${path}`
}

/**
 * The theme with the font and cursor files of its CSS (and font preloads)
 * under the app's `baseURL`, for a site served from a subpath (GitHub Pages:
 * `/jade/`). Without a base it is the theme itself. Build time; the theme it
 * receives is not changed.
 */
export function withAppBaseURL(theme: ThemeConfig, baseURL: string | undefined): ThemeConfig {
  const base = (baseURL ?? '/').replace(/\/+$/, '')
  if (!base) return theme

  const prefix = (path: string) => withBaseURL(path, base)
  const result: ThemeConfig = { ...theme }

  if (theme.typography?.customFonts) {
    result.typography = {
      ...theme.typography,
      customFonts: theme.typography.customFonts.map(font => ({
        ...font,
        sources: Object.fromEntries(Object.entries(font.sources ?? {}).map(([format, url]) => [format, prefix(url)])) as typeof font.sources,
      })),
    }
  }

  const cursor = theme.customCursor
  if (cursor) {
    const images = (images: typeof cursor.defaultCursors) =>
      images && Object.fromEntries(Object.entries(images).map(([type, image]) => [type, image && { ...image, path: prefix(image.path) }])) as typeof images
    result.customCursor = {
      ...cursor,
      ...(cursor.defaultCursors && { defaultCursors: images(cursor.defaultCursors) }),
      ...(cursor.themeCursors && {
        themeCursors: Object.fromEntries(Object.entries(cursor.themeCursors).map(([name, entry]) => [name, typeof entry === 'object' ? images(entry) : entry])) as typeof cursor.themeCursors,
      }),
    }
  }

  return result
}

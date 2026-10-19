/** The cursors the module replaces. */
export type CursorType = 'default' | 'pointer' | 'text'

export interface CursorImage {
  /** Image served from `public/`. */
  path: string
  /** The click point ("x y"). */
  hotspot?: string
}

/**
 * What a color theme shows as its cursor:
 * - `'themed'`: drawn in the theme's `primary`
 * - `'base'`: the `defaultCursors` images (the module's fire cursors, unless
 *   the project set its own)
 * - `'none'`: no custom cursor, the operating system's own
 * - an object: its own images; a cursor it leaves out is shown as if the
 *   theme had no entry
 */
export type ThemeCursor = 'themed' | 'base' | 'none' | Partial<Record<CursorType, CursorImage>>

export interface CursorConfig {
  enabled: boolean
  /**
   * Draws each cursor as an SVG in the active color theme's `primary`, so it
   * changes along with the theme. `false` shows the `defaultCursors` in
   * every theme without an entry in `themeCursors`. Default: `true`.
   */
  themed?: boolean
  /** The default cursors, and the fallback of the drawn ones. */
  defaultCursors: Record<string, CursorImage>
  /**
   * Cursor per color theme, by theme name (both its variants, e.g. `venix`)
   * or variant id (just that one, e.g. `carnaval-light`), which wins over
   * the theme name. Merged with the module's own (`venix: 'base'`).
   */
  themeCursors?: Record<string, ThemeCursor>
  /** @deprecated Renamed to `defaultCursors`; removed in 2.0. */
  cursors?: Record<string, CursorImage>
}

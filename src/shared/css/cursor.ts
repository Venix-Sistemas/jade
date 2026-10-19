import type { CursorImage, CursorType, ThemeConfig } from '../types'
import { isColorTheme } from '../utils/theme-resolve'
import { generateCursorSVG } from './cursor-svg'

const CURSOR_TYPES: CursorType[] = ['default', 'pointer', 'text']

const imageValue = (image: CursorImage, type: CursorType): string =>
  `url('${image.path}')${image.hotspot ? ` ${image.hotspot}` : ''}, ${type}`

export function generateCustomCursorCSS(theme: ThemeConfig): string {
  const cursor = theme.customCursor
  if (!cursor || !cursor.enabled) return ''

  const images = cursor.defaultCursors ?? {}

  // The configured image, then the browser's own cursor: the `:root` value,
  // and what shows when a drawn cursor can't be used.
  const fallback = (type: CursorType): string => images[type] ? imageValue(images[type], type) : type

  // The theme each variant belongs to, so `cursor.themeCursors.venix` reaches
  // both `light` and `dark`.
  const owners: Record<string, string> = {}
  for (const [name, group] of Object.entries(theme.colors?.groups ?? {})) {
    for (const id of Object.values(group.variants)) if (id) owners[id] = name
  }

  // The cursor values of each color variant that differ from `:root`: one
  // block per `data-theme` value, like the color variables (see colors.ts).
  const variants: Array<[string, Partial<Record<CursorType, string>>]> = []
  if (theme.colors?.enabled !== false) {
    for (const [id, colors] of Object.entries(theme.colors?.themes ?? {})) {
      if (id === 'system' || !isColorTheme(colors)) continue

      const entry = cursor.themeCursors?.[id] ?? (owners[id] ? cursor.themeCursors?.[owners[id]] : undefined)
      const own = typeof entry === 'object' ? entry : {}
      const mode = typeof entry === 'string' ? entry : cursor.themed === false ? 'base' : 'themed'

      const values: Partial<Record<CursorType, string>> = {}
      for (const type of CURSOR_TYPES) {
        const image = own[type]
        if (image) {
          values[type] = imageValue(image, type)
        }
        else if (mode === 'none') {
          values[type] = type
        }
        else if (mode === 'themed' && colors.primary?.startsWith('#')) {
          const { url, hotspot } = generateCursorSVG(type, colors.primary)
          values[type] = `url("${url}") ${hotspot}, ${fallback(type)}`
        }
        // 'base', or no `primary` to draw with: the `:root` value
      }
      if (Object.keys(values).length) variants.push([id, values])
    }
  }

  const types = CURSOR_TYPES.filter(type => images[type] || variants.some(([, values]) => values[type]))
  if (!types.length) return ''

  let css = '\n/* ============================================ */\n'
  css += '/* Custom Cursor                                */\n'
  css += '/* ============================================ */\n'

  // The rules below read `--cursor-<type>`, so switching `data-theme` swaps
  // the cursor with no script, the same way it swaps the colors.
  css += '\n/* 0. Cursor values: the default cursors, then each theme\'s own (drawn in its color, its images or the system\'s) */\n'
  css += `:root {\n${types.map(type => `  --cursor-${type}: ${fallback(type)};`).join('\n')}\n}\n`
  for (const [id, values] of variants) {
    const vars = types.filter(type => values[type]).map(type => `  --cursor-${type}: ${values[type]};`)
    css += `:root[data-theme='${id}'] {\n${vars.join('\n')}\n}\n`
  }

  if (types.includes('default')) {
    css += '\n/* 1. Default cursor on everything */\n'
    css += `html {
  cursor: var(--cursor-default);
}\n`
    css += '\n/* 1b. Elements the browser stylesheet sets to `cursor: default`, which would show the system arrow instead of inheriting */\n'
    css += `label,
select,
input[type="checkbox"], input[type="radio"],
input[type="range"], input[type="color"], input[type="file"] {
  cursor: var(--cursor-default);
}\n`
  }

  if (types.includes('pointer')) {
    css += '\n/* 2. Pointer cursor for clickable elements */\n'
    css += `a, a *,
button, button *,
[role="button"],
input[type="button"], input[type="submit"], input[type="reset"],
.v-btn:not(.v-btn--disabled),
.v-list-item,
.v-icon,
.v-tab,
.v-chip,
.v-card--link,
.v-breadcrumbs-item--link,
.v-pagination__item {
  cursor: var(--cursor-pointer) !important;
}\n`
  }

  if (types.includes('text')) {
    css += '\n/* 3. Text cursor (i-beam) for editable fields only */\n'
    css += `input[type="text"],
input[type="email"],
input[type="password"],
input[type="number"],
input[type="search"],
input[type="tel"],
input[type="url"],
input[type="date"],
input[type="datetime-local"],
input[type="month"],
input[type="week"],
input[type="time"],
textarea,
[contenteditable="true"] {
  cursor: var(--cursor-text) !important;
}\n`
  }

  if (types.includes('default')) {
    css += '\n/* 4. Disabled elements */\n'
    css += `.v-btn--disabled,
[disabled],
.disabled {
  cursor: var(--cursor-default) !important;
}\n`
  }

  return css
}

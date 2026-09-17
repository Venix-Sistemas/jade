import type { ThemeConfig } from '../types'

export function generateCustomCursorCSS(theme: ThemeConfig): string {
  const cursor = theme.customCursor
  if (!cursor || !cursor.enabled || !cursor.cursors) return ''

  const cursors = cursor.cursors

  let css = '\n/* ============================================ */\n'
  css += '/* Custom Cursor                                */\n'
  css += '/* ============================================ */\n'

  const cursorValue = (type: string): string | null => {
    if (!cursors[type]) return null
    const { path, hotspot } = cursors[type]
    const hotspotStr = hotspot ? ` ${hotspot}` : ''
    return `url('${path}')${hotspotStr}, ${type}`
  }

  if (cursors.default) {
    const value = cursorValue('default')
    css += '\n/* 1. Default cursor on everything */\n'
    css += `body {
  cursor: ${value};
}\n`
  }

  if (cursors.pointer) {
    const value = cursorValue('pointer')
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
  cursor: ${value} !important;
}\n`
  }

  if (cursors.text) {
    const value = cursorValue('text')
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
select,
[contenteditable="true"] {
  cursor: ${value} !important;
}\n`
  }

  if (cursors.default) {
    const value = cursorValue('default')
    css += '\n/* 4. Disabled elements */\n'
    css += `.v-btn--disabled,
[disabled],
.disabled {
  cursor: ${value} !important;
}\n`
  }

  return css
}

import type { ThemeConfig } from '../types'
import { SCROLLBAR_ATTRIBUTE } from '../constants'

// Every rule only applies while `<html>` doesn't have the attribute set to
// 'off' (the visitor's choice, see `scrollbar.set()`), which brings back the
// browser's own scrollbar. Both forms: the page's own scrollbar is `html`'s,
// the others belong to its descendants. `html`, not `:root`: Chromium never
// matches `::-webkit-scrollbar-thumb:hover` behind `:root`, so the thumb
// didn't change color on hover.
const ON = `html:not([${SCROLLBAR_ATTRIBUTE}='off'])`
const on = (pseudo: string): string => `${ON}${pseudo},\n${ON} ${pseudo}`

export function generateCustomScrollbarCSS(theme: ThemeConfig): string {
  const scrollbar = theme.customScrollbar
  if (!scrollbar || !scrollbar.enabled) return ''

  const width = scrollbar.width || 'auto'
  const borderRadius = scrollbar.borderRadius || '8px'
  const borderWidth = scrollbar.borderWidth || '3px'

  const colorVar = (key: keyof NonNullable<ThemeConfig['customScrollbar']>['colors'], fallback: string): string => {
    const value = scrollbar.colors?.[key] || fallback
    if (value.startsWith('var(--') || value.startsWith('#') || value.startsWith('rgb')) {
      return value
    }
    return `var(--color-${value})`
  }

  const thumb = colorVar('thumb', 'primary')
  const thumbHover = colorVar('thumbHover', 'secondary')
  const track = colorVar('track', 'background2')
  const border = colorVar('border', 'background3')

  let css = '\n/* ============================================ */\n'
  css += '/* Custom Scrollbar                             */\n'
  css += '/* ============================================ */\n'
  css += `\n${on('::-webkit-scrollbar')} {
  width: ${width};
  height: ${width};
}\n`
  css += `\n${on('::-webkit-scrollbar-track')} {
  background: ${track};
}\n`
  css += `\n${on('::-webkit-scrollbar-thumb')} {
  background: ${thumb};
  border-radius: ${borderRadius};
  border: ${borderWidth} solid ${border};
}\n`
  css += `\n${on('::-webkit-scrollbar-thumb:hover')} {
  background: ${thumbHover};
}\n`
  // Where a vertical and a horizontal scrollbar meet; white otherwise
  css += `\n${on('::-webkit-scrollbar-corner')} {
  background: ${track};
}\n`
  // The standard properties only where `::-webkit-scrollbar` doesn't exist
  // (Firefox): since Chromium 121 either one switches the `::-webkit-scrollbar`
  // styles off, and `scrollbar-color` is inherited, so the whole page would
  // lose the border, radius and hover color above.
  css += `\n@supports not selector(::-webkit-scrollbar) {
  ${ON} {
    scrollbar-width: ${width === 'auto' ? 'auto' : 'thin'};
    scrollbar-color: ${thumb} ${track};
  }
}\n`

  return css
}

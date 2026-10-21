import type { ThemeConfig } from '../types'

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
  css += `\n::-webkit-scrollbar {
  width: ${width};
  height: ${width};
}\n`
  css += `\n::-webkit-scrollbar-track {
  background: ${track};
}\n`
  css += `\n::-webkit-scrollbar-thumb {
  background: ${thumb};
  border-radius: ${borderRadius};
  border: ${borderWidth} solid ${border};
}\n`
  css += `\n::-webkit-scrollbar-thumb:hover {
  background: ${thumbHover};
}\n`
  // Where a vertical and a horizontal scrollbar meet; white otherwise
  css += `\n::-webkit-scrollbar-corner {
  background: ${track};
}\n`
  // The standard properties only where `::-webkit-scrollbar` doesn't exist
  // (Firefox): since Chromium 121 either one switches the `::-webkit-scrollbar`
  // styles off, and `scrollbar-color` is inherited, so the whole page would
  // lose the border, radius and hover color above.
  css += `\n@supports not selector(::-webkit-scrollbar) {
  html {
    scrollbar-width: ${width === 'auto' ? 'auto' : 'thin'};
    scrollbar-color: ${thumb} ${track};
  }
}\n`

  return css
}

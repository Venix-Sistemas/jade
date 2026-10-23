import type { ThemeConfig } from '../types'
import { OVERLAY_SCROLLBAR_THEME, SCROLLBAR_ATTRIBUTE } from '../constants'

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
  /* The custom pointer: Chromium draws a styled scrollbar as part of the
     page and shows its cursor there. The arrow without the cursor module. */
  cursor: var(--cursor-pointer, default);
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

  if (scrollbar.overlay === true) css += generateOverlayScrollbarCSS({ width, borderRadius, thumb, thumbHover, track })

  return css
}

/**
 * The OverlayScrollbars theme, from the same options, and the page's native
 * scrollbar hidden until it takes over (see the overlay-scrollbars plugin).
 */
function generateOverlayScrollbarCSS(o: { width: string, borderRadius: string, thumb: string, thumbHover: string, track: string }): string {
  let css = '\n/* Overlay scrollbar (OverlayScrollbars): page elements, so the custom cursor applies over them */\n'
  css += `.${OVERLAY_SCROLLBAR_THEME} {
  --os-size: ${o.width === 'auto' ? '10px' : o.width};
  --os-padding-perpendicular: 2px;
  --os-padding-axis: 2px;
  --os-track-border-radius: ${o.borderRadius};
  --os-handle-border-radius: ${o.borderRadius};
  --os-track-bg: ${o.track};
  --os-handle-bg: ${o.thumb};
  --os-handle-bg-hover: ${o.thumbHover};
  --os-handle-bg-active: ${o.thumbHover};
}\n`
  // The hover color over the whole scrollbar, not only right over the handle:
  // the handle is a few pixels wide, so hovering the scrollbar next to it (or
  // above and below it) would show no change at all.
  css += `\n.${OVERLAY_SCROLLBAR_THEME}.os-scrollbar:hover {
  --os-handle-bg: ${o.thumbHover};
}\n`
  // Above Vuetify's sticky table header, which otherwise covers the top of the scrollbar
  css += `\n.v-table > .os-scrollbar {
  z-index: 3;
}\n`
  // Behind a dialog Vuetify fixes `<html>` in place, offset by the scroll
  // position (`top`). OverlayScrollbars keeps `<html>` as the element that
  // scrolls, so it can't be fixed and the offset only shifted the page; the
  // plugin locks it through OverlayScrollbars instead, at the same position.
  css += `\nhtml[data-overlayscrollbars].v-overlay-scroll-blocked {
  top: auto;
  left: auto;
}\n`
  // Until the plugin replaces the page's scrollbar (it marks `<html>` with
  // `data-overlayscrollbars`), the native one would show and then vanish,
  // shifting the page by its width. Only with JavaScript on, or nothing would
  // ever replace it; and not when the visitor turned the custom scrollbar off.
  css += `\n@media (scripting: enabled) {
  ${ON}:not([data-overlayscrollbars]) {
    scrollbar-width: none;
  }
}\n`
  return css
}

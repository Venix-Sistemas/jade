// src/shared/css/cursor-svg.ts
import type { CursorType } from '../types'

interface CursorShape {
  /** Click point, in the 32×32 drawing ("x y"). */
  hotspot: string
  /** The silhouette, drawn three times: a thick outline, the fill and a highlight on top. */
  shape: string
  /** Lines drawn over the fill (e.g. the gaps between fingers). */
  details?: string
}

// Drawn on a 32×32 grid, then shown at `SIZE`.
const SHAPES: Record<CursorType, CursorShape> = {
  default: {
    hotspot: '3 2',
    shape: `<path d='M3 2v22l5.5-5 4 9.5 3.5-1.5-4-9h7.5z'/>`,
  },
  // Traced from a high-resolution render of the module's fire hand
  // (cursor-hand.png): index finger up, the other three stepping down to the
  // right, the thumb out to the left. The gaps between fingers are deepened a
  // little, or the outline would fill them at cursor size, and the index finger is
  // slimmer (4px), so its tip doesn't look swollen inside the outline.
  pointer: {
    hotspot: '11 1',
    shape: `<path d='M9 4.4C9 3.1 9.9 2.2 11 2.2s2 .9 2 2.2v4.2l.5.1c1-.7 3.8-.8 3.8 1.4.2-.9 3.9-1.2 4 1.3.2-.6 4.2-.6 4.2 2.2V21c0 2.5-.7 4.5-2 5.8C22 28.5 19 29 16 29c-2.5 0-4.6-.8-5.7-2.5l-2.8-5.2-3.2-3.7c-1-1.2-.7-3 .3-3.6 1-.7 2.4-.4 3.2.3l1.2.9z'/>`,
    details: `<path d='M13.1 8.8v3.7M17.3 10.1l-.2 3.4M21.3 11.3l-.2 3.2'/>`,
  },
  text: {
    hotspot: '16 16',
    shape: `<path d='M11 3h10a1 1 0 0 1 0 3h-3.5v20H21a1 1 0 0 1 0 3H11a1 1 0 0 1 0-3h3.5V6H11a1 1 0 0 1 0-3z'/>`,
  },
}

// Shown size, in pixels: about the height of the fire cursors (26×26), so
// switching between them and the drawn ones changes the look, not the size.
// Under 32×32, the largest Chromium shows reliably near the window edges
// (see README).
const SIZE = 28

// The hotspot is in the shown image's pixels, so it scales with it.
const scaleHotspot = (hotspot: string): string =>
  hotspot.split(' ').map(n => Math.round(Number(n) * SIZE / 32)).join(' ')

// Only the characters a `data:` URI in a CSS `url("…")` can't hold as is —
// `encodeURIComponent` would also escape every space, quote and slash, about
// doubling the size of the CSS.
const encodeSVG = (svg: string): string =>
  svg.replace(/[%#<>]/g, char => encodeURIComponent(char))

/**
 * A cursor drawn in a theme's color, as a `data:` URI ready for `url()`:
 * a black outline, so it reads on light and dark backgrounds alike, and a
 * soft highlight on the upper half that keeps flat colors from looking dull.
 */
export function generateCursorSVG(type: CursorType, color: string): { url: string, hotspot: string } {
  const { hotspot, shape, details } = SHAPES[type]

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${SIZE}' height='${SIZE}' viewBox='0 0 32 32'>`
    + `<defs><g id='c'>${shape}</g>`
    + `<linearGradient id='s' x2='0' y2='1'><stop stop-color='white' stop-opacity='.45'/><stop offset='.6' stop-color='white' stop-opacity='0'/></linearGradient></defs>`
    + `<use href='#c' stroke='black' stroke-width='3' stroke-linejoin='round'/>`
    + `<use href='#c' fill='${color}'/>`
    + `<use href='#c' fill='url(#s)'/>`
    + (details ? `<g fill='none' stroke='black' stroke-opacity='.5' stroke-linecap='round'>${details}</g>` : '')
    + `</svg>`

  return { url: `data:image/svg+xml,${encodeSVG(svg)}`, hotspot: scaleHotspot(hotspot) }
}

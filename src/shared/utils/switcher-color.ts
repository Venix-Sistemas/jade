// src/shared/utils/switcher-color.ts
import { contrastRatio } from './contrast'

/** What a theme's name sits on in the switcher's menu: resting, hovered and selected. The same grays as its CSS. */
export const SWITCHER_BACKGROUNDS = {
  light: ['#ffffff', '#f2f2f2', '#e8e8e8'],
  dark: ['#1f1f1f', '#2b2b2b', '#363636'],
} as const

const AA = 4.5

const channels = (hex: string): number[] => {
  const digits = hex.length === 4 ? hex.slice(1).replace(/./g, '$&$&') : hex.slice(1)
  return [0, 2, 4].map(i => Number.parseInt(digits.slice(i, i + 2), 16))
}

/**
 * A theme's `color` for its name and icon in the switcher's menu: the color
 * itself when it reads at AA on every background of the mode, else the
 * closest tone toward black (light mode) or white (dark mode) that does.
 * `null` for anything that isn't a hex color, which leaves the neutral text.
 */
export function switcherThemeColor(color: string | undefined, dark: boolean): string | null {
  if (!color || !/^#(?:[\da-f]{3}){1,2}$/i.test(color)) return null
  const backgrounds = SWITCHER_BACKGROUNDS[dark ? 'dark' : 'light']
  const from = channels(color)
  const end = dark ? 255 : 0

  for (let step = 0; step <= 50; step++) {
    const candidate = `#${from.map(c => Math.round(c + (end - c) * step / 50).toString(16).padStart(2, '0')).join('')}`
    if (backgrounds.every(background => contrastRatio(candidate, background) >= AA)) return candidate
  }
  return null
}

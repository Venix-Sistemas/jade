// src/shared/css/colors.ts
import type { ThemeColors } from '../types'
import { getThemeHexColors } from '../utils/theme-resolve'

export function generateThemeVars(mode: string, colors: ThemeColors): string {
  const colorVars = getThemeHexColors(colors)
    .map(([key, value]) => `  --color-${key}: ${value};`)
    .join('\n')

  const isDark = colors.dark === true
  const colorScheme = isDark ? 'dark' : 'light'
  const inverseColor = isDark ? '#FFFFFF' : '#000000'

  return `\n/* ============================================ */\n`
    + `/* Colors - ${mode.charAt(0).toUpperCase() + mode.slice(1)} Theme                     */\n`
    + `/* ============================================ */\n\n`
    + `:root[data-theme='${mode}'] {\n`
    + `  color-scheme: ${colorScheme};\n`
    + `  --color-scheme: ${colorScheme === 'dark' ? '#000000' : '#FFFFFF'};\n`
    + `  --color-inverse: ${inverseColor};\n`
    + colorVars + '\n'
    + `}\n`
}

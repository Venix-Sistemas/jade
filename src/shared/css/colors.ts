// src/shared/css/colors.ts
import type { ContrastLevel, ThemeColors } from '../types'
import { getThemeHexColors } from '../utils/theme-resolve'
import { tokensEnabled } from '../token-names'
import { generateBoldCss } from './bold'
import { generateHighContrastVars, generateTokenVars } from './tokens'

export function generateThemeVars(mode: string, colors: ThemeColors, contrast?: ContrastLevel, highContrast = false): string {
  const colorVars = getThemeHexColors(colors)
    .map(([key, value]) => `  --color-${key}: ${value};`)
    .join('\n')

  // Opt-in (experimental): themes without `tokens: true` produce the same CSS as before.
  const tokenVars = tokensEnabled(colors)
    ? `\n  /* Semantic tokens */\n${generateTokenVars(colors, contrast)}`
    : ''

  // Opt-in (`color.highContrast`): the AAA values, for visitors who ask their system for more contrast.
  const highContrastVars = highContrast && tokensEnabled(colors) ? generateHighContrastVars(colors, contrast) : ''
  const highContrastBlock = highContrastVars
    ? `\n@media (prefers-contrast: more) {\n  :root[data-theme='${mode}'] {\n${highContrastVars}\n  }\n}\n`
    : ''

  // `surfaces: 'bold'`: the scope for areas in the brand color, after the variant's own block.
  const boldBlock = generateBoldCss(mode, colors, contrast, highContrast)

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
    + colorVars + tokenVars + '\n'
    + `}\n`
    + highContrastBlock
    + boldBlock
}

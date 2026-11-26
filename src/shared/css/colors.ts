// src/shared/css/colors.ts
import type { ContrastLevel, ThemeColors } from '../types'
import { getThemeHexColors } from '../utils/theme-resolve'
import { tokensEnabled } from '../token-names'
import { generateBoldCss } from './bold'
import { generateMenuCss } from './menu'
import { generateHighContrastVars, generateTokenVars } from './tokens'
import { vuetify0Vars } from './vuetify0'
import { themeSelector } from './selector'
import type { LabSelector } from './selector'

export interface ThemeVarsOptions {
  /** Also the `--color-*` names of 1.5 and earlier, as aliases. Default: `true`. */
  legacyNames?: boolean
  /** Also Vuetify0's `--v0-*`. */
  vuetify0?: boolean
  /** With `color.lab`: `'guard'` for the built CSS, `'preview'` for the visitor's own. */
  lab?: LabSelector
}

export function generateThemeVars(mode: string, colors: ThemeColors, contrast?: ContrastLevel, highContrast = false, options: ThemeVarsOptions = {}): string {
  const hexColors = getThemeHexColors(colors)
  const colorVars = hexColors
    .map(([key, value]) => `  --jade-${key}: ${value};`)
    .join('\n')

  // Aliases of the new names, so overriding a `--jade-*` also reaches CSS still written with the old one
  const legacyVars = options.legacyNames !== false
    ? '\n  /* Names up to 1.5, removed in 2.0 */\n' + ['scheme', 'inverse', ...hexColors.map(([key]) => key)]
      .map(name => `  --color-${name}: var(--jade-${name});`)
      .join('\n')
    : ''

  const v0Vars = options.vuetify0 ? `\n  /* Vuetify0 */\n${vuetify0Vars(colors)}` : ''

  // Opt-in (experimental): themes without `tokens: true` produce the same CSS as before.
  const tokenVars = tokensEnabled(colors)
    ? `\n  /* Semantic tokens */\n${generateTokenVars(colors, contrast)}`
    : ''

  // Opt-in (`color.highContrast`): the AAA values, for visitors who ask their system for more contrast.
  const highContrastVars = highContrast && tokensEnabled(colors) ? generateHighContrastVars(colors, contrast) : ''
  const highContrastBlock = highContrastVars
    ? `\n@media (prefers-contrast: more) {\n  ${themeSelector(mode, options.lab)} {\n${highContrastVars}\n  }\n}\n`
    : ''

  // `surfaces: 'bold'`: the scope for areas in the brand color, after the variant's own block.
  const boldBlock = generateBoldCss(mode, colors, contrast, highContrast, options.vuetify0, options.lab)

  // The side menu (`data-jade-surface="menu"`)
  const menuBlock = generateMenuCss(mode, colors, contrast, highContrast, options.vuetify0, options.lab)

  const isDark = colors.dark === true
  const colorScheme = isDark ? 'dark' : 'light'
  const inverseColor = isDark ? '#FFFFFF' : '#000000'

  return `\n/* ============================================ */\n`
    + `/* Colors - ${mode.charAt(0).toUpperCase() + mode.slice(1)} Theme                     */\n`
    + `/* ============================================ */\n\n`
    + `${themeSelector(mode, options.lab)} {\n`
    + `  color-scheme: ${colorScheme};\n`
    + `  --jade-scheme: ${colorScheme === 'dark' ? '#000000' : '#FFFFFF'};\n`
    + `  --jade-inverse: ${inverseColor};\n`
    + colorVars + legacyVars + tokenVars + v0Vars + '\n'
    + `}\n`
    + highContrastBlock
    + boldBlock
    + menuBlock
}

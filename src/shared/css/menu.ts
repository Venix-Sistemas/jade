// src/shared/css/menu.ts
import type { ContrastLevel, ThemeColors, ThemeMenu } from '../types'
import { contrastRatio } from '../utils/contrast'
import { surfacesOf, tokensEnabled } from '../token-names'
import { generateBoldSurface } from './bold'
import { generateFaintMenu } from './faint-menu'
import { generateTokens } from './tokens'
import { themeSelector } from './selector'
import type { LabSelector } from './selector'
import { vuetify0Vars } from './vuetify0'

/**
 * The side menu of a theme variant: an element with
 * `data-jade-surface="menu"`. Its `menu` choice says how much brand color it
 * takes: `'faint'`, the page's tone with a trace of `primary` (see
 * `faint-menu.ts`), `'soft'`, a light tone of it (`bg-primary`), or `'bold'`,
 * the same panel as the bold scope, also on a theme that isn't bold.
 */

/** The `menu` of a variant: the one set, else `'bold'` on a bold theme, `'faint'` on a dark one and `'soft'` on a light one. */
export function menuOf(colors: ThemeColors): ThemeMenu {
  return colors.menu ?? (surfacesOf(colors) === 'bold' ? 'bold' : colors.dark === true ? 'faint' : 'soft')
}

/** The bold panel's tokens for a `'bold'` menu, or `null` for a soft one. */
export function generateMenuSurface(colors: ThemeColors, level: ContrastLevel = 'AA') {
  return menuOf(colors) === 'bold' ? generateBoldSurface({ ...colors, surfaces: 'bold' }, level) : null
}

const TEXT_MIN: Record<ContrastLevel, number> = { AA: 4.5, AAA: 7 }

/** `bg-primary` under the menu, with the page's text over it. References, so they follow the theme's own values. */
function softVars(colors: ThemeColors, level: ContrastLevel): string | null {
  const tokens = new Map(generateTokens(colors, level))
  if (!tokens.has('bg-primary')) return null
  // The muted text is placed over the neutrals: it stays only where it still reads over the tone
  const reads = ['bg-primary', 'bg-primary-hover', 'bg-primary-active']
    .every(name => contrastRatio(tokens.get('text-muted')!, tokens.get(name)!) >= TEXT_MIN[level])
  return [
    '  --jade-bg: var(--jade-bg-primary);',
    '  --jade-bg-hover: var(--jade-bg-primary-hover);',
    '  --jade-bg-active: var(--jade-bg-primary-active);',
    ...(reads ? [] : ['  --jade-text-muted: var(--jade-text);']),
  ].join('\n')
}

/** The CSS of the menu of a variant, or an empty string without the semantic tokens or a `primary`. */
export function generateMenuCss(mode: string, colors: ThemeColors, level: ContrastLevel = 'AA', highContrast = false, vuetify0 = false, lab?: LabSelector): string {
  if (!tokensEnabled(colors)) return ''
  const selector = `${themeSelector(mode, lab, true)} [data-jade-surface='menu']`
  const bold = generateMenuSurface(colors, level)
  const faint = menuOf(colors) === 'faint' ? generateFaintMenu(colors, level) : null
  const declare = (tokens: Array<[string, string]>) => tokens.map(([name, value]) => `  --jade-${name}: ${value};`)
  const vars = bold
    ? [
        `  color-scheme: ${bold.dark ? 'dark' : 'light'};`,
        ...declare(bold.tokens),
        '  --jade-scrollbar-thumb: var(--jade-border-strong);',
        '  --jade-scrollbar-thumb-hover: var(--jade-fill-primary);',
        '  --jade-scrollbar-track: var(--jade-bg-subtle);',
        '  --jade-scrollbar-border: var(--jade-bg-subtle);',
      ].join('\n')
    : faint ? declare(faint).join('\n') : softVars(colors, level)
  if (vars === null) return ''

  let css = `\n/* Side menu - ${mode} */\n${selector} {\n`
    + `${vars}\n`
    // Declared again here: resolved where it is declared, they must read the menu's tokens
    + (vuetify0 ? `${vuetify0Vars(colors)}\n` : '')
    + '  background-color: var(--jade-bg);\n'
    + '  color: var(--jade-text);\n'
    + '}\n'

  const own = bold?.tokens ?? faint
  if (own && highContrast && level !== 'AAA') {
    const base = new Map(own)
    const changed = (bold ? generateMenuSurface(colors, 'AAA')?.tokens : generateFaintMenu(colors, 'AAA'))
      ?.filter(([name, value]) => base.get(name) !== value)
      .map(([name, value]) => `    --jade-${name}: ${value};`)
      .join('\n')
    if (changed) css += `@media (prefers-contrast: more) {\n  ${selector} {\n${changed}\n  }\n}\n`
  }
  return css
}

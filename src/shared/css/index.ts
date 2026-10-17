import type { ThemeConfig } from '../types'
import { generateFontFaces, generateRootVars } from './typography'
import { generateThemeVars } from './colors'
import { generateCustomScrollbarCSS } from './scrollbar'
import { generateCustomCursorCSS } from './cursor'
import { generateThemeTransitionCSS } from './transition'
import { isColorTheme } from '../utils/theme-resolve'

export function processTheme(theme: ThemeConfig): string {
  const output: string[] = []

  // Typography
  if (theme.typography?.enabled !== false) {
    output.push(generateFontFaces(theme))
    output.push(generateRootVars(theme))
  }

  // Colors
  if (theme.colors?.enabled !== false) {
    if (theme.colors?.themes) {
      output.push(generateThemeTransitionCSS())
      for (const [themeName, themeColors] of Object.entries(theme.colors.themes)) {
        if (themeName === 'system' || !isColorTheme(themeColors)) continue
        output.push(generateThemeVars(themeName, themeColors))
      }
    }
  }

  // Scrollbar
  if (theme.customScrollbar?.enabled !== false) {
    const scrollbarCSS = generateCustomScrollbarCSS(theme)
    if (scrollbarCSS) output.push(scrollbarCSS)
  }

  // Cursor
  if (theme.customCursor?.enabled !== false) {
    const cursorCSS = generateCustomCursorCSS(theme)
    if (cursorCSS) output.push(cursorCSS)
  }

  return output.join('\n')
}

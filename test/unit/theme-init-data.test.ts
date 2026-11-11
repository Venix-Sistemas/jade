import { describe, it, expect } from 'vitest'
import { toInitThemeData } from '../../src/runtime/scripts/theme-init'
import { toInlineScriptJson } from '../../src/shared/utils/inline-script'
import { buildResolvedTheme } from '../../src/shared/utils/theme-config'

// O script inline vai em todo HTML: só carrega o que a resolução do tema lê.

const theme = buildResolvedTheme({
  colorThemes: {
    reveillon: {
      seasonal: true,
      dateRange: { start: '12-28', end: '01-03' },
      dark: { primary: '#ffd700', secondary: '#111111', background2: '#222222' },
      light: { primary: '#b8860b' },
    },
  },
})

describe('toInitThemeData', () => {
  it('mantém o necessário para resolver o tema', () => {
    const data = toInitThemeData(theme)

    expect(data.colors.defaultColor).toBe(theme.colors.defaultColor)
    expect(Object.keys(data.colors.groups)).toEqual(Object.keys(theme.colors.groups))
    expect(Object.keys(data.colors.themes)).toEqual(Object.keys(theme.colors.themes))
    expect(data.colors.groups.reveillon).toEqual({
      variants: theme.colors.groups.reveillon!.variants,
      seasonal: true,
      dateRange: { start: '12-28', end: '01-03' },
    })
    expect(data.colors.themes['reveillon-dark']).toEqual({ primary: '#ffd700' })
  })

  it('deixa de fora traduções, ícones, modos e cores que o script não lê', () => {
    const script = toInlineScriptJson(toInitThemeData(theme))

    expect(script).not.toContain('translations')
    expect(script).not.toContain('"icon"')
    expect(script).not.toContain('"modes"')
    expect(script).not.toContain('#111111')
    expect(script).not.toContain('#222222')
  })

  it('o dado fica bem menor que o tema inteiro', () => {
    const slim = toInlineScriptJson(toInitThemeData(theme)).length
    const full = toInlineScriptJson(theme).length

    expect(slim).toBeLessThan(full / 2)
  })
})

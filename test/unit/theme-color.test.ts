import { describe, it, expect } from 'vitest'
import { resolveThemeColorName, themeColorOf } from '../../src/shared/utils/theme-color'
import { COLOR_PROPERTIES } from '../../src/shared/constants'

describe('resolveThemeColorName', () => {
  it('deve usar o background quando a opção é true', () => {
    expect(resolveThemeColorName(true)).toBe('background')
  })

  it.each(COLOR_PROPERTIES)('deve aceitar a cor %s pelo nome', (name) => {
    expect(resolveThemeColorName(name)).toBe(name)
  })

  it.each([false, undefined, null, 'azul', '', 'Background', 42])('deve deixar o theme-color em paz para %s', (value) => {
    expect(resolveThemeColorName(value)).toBeNull()
  })
})

describe('themeColorOf', () => {
  const themes = {
    dark: { background: '#0C0C0C', primary: '#FF6B6B' },
    light: { primary: '#FF0000' },
    broken: { background: 'rgb(0 0 0)' },
  }

  it('deve devolver a cor da variante', () => {
    expect(themeColorOf(themes, 'dark', 'background')).toBe('#0C0C0C')
    expect(themeColorOf(themes, 'dark', 'primary')).toBe('#FF6B6B')
  })

  it('deve devolver null quando a variante não existe ou não tem a cor', () => {
    expect(themeColorOf(themes, 'nada', 'background')).toBeNull()
    expect(themeColorOf(themes, 'light', 'background')).toBeNull()
  })

  it('deve ignorar um valor que não é hex, como o resto do módulo', () => {
    expect(themeColorOf(themes, 'broken', 'background')).toBeNull()
  })
})

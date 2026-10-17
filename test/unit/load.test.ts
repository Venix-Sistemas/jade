import { describe, it, expect } from 'vitest'
import { loadTheme, extractLocales } from '../../src/shared/utils/load'

describe('loadTheme', () => {
  it('deve carregar o tema padrão', () => {
    const theme = loadTheme()
    expect(theme.name).toBe('default')
    expect(theme.colors.themes['dark']).toBeDefined()
    expect(theme.colors.themes['light']).toBeDefined()
  })

  it('deve ter temas de cores válidos', () => {
    const theme = loadTheme()
    const darkTheme = theme.colors.themes['dark']
    const lightTheme = theme.colors.themes['light']

    expect(darkTheme?.primary).toMatch(/^#/)
    expect(lightTheme?.background).toMatch(/^#/)
  })
})

describe('extractLocales', () => {
  it('deve extrair locales das traduções', () => {
    const theme = loadTheme()
    const locales = extractLocales(theme)
    expect(locales).toContain('pt-BR')
    expect(locales).toContain('en-US')
  })
})

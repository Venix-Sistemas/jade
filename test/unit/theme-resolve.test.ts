import { describe, it, expect } from 'vitest'
import { isColorTheme, getActiveSeasonalTheme, resolveThemePreference } from '../../src/shared/utils/theme-resolve'
import type { ThemeColors } from '../../src/shared/types'

const themes: Record<string, ThemeColors> = {
  // Placeholder de UI (ver theme.json) — existe como chave mas não tem cor
  // nenhuma, só serve pra exibir "Automático" num seletor de tema.
  system: { translations: { 'en-US': 'Automatic' } },
  dark: { dark: true, primary: '#111111' },
  light: { dark: false, primary: '#eeeeee' },
}

const seasonalThemes: Record<string, ThemeColors> = {
  ...themes,
  carnaval: {
    dark: true,
    primary: '#ff00ff',
    seasonal: true,
    dateRange: { start: '02-01', end: '02-10' },
  },
}

describe('isColorTheme', () => {
  it('deve ser falso para o placeholder "system" (sem cores)', () => {
    expect(isColorTheme(themes.system)).toBe(false)
  })

  it('deve ser verdadeiro para um tema com `primary`', () => {
    expect(isColorTheme(themes.dark)).toBe(true)
  })

  it('deve ser falso para undefined', () => {
    expect(isColorTheme(undefined)).toBe(false)
  })
})

describe('getActiveSeasonalTheme', () => {
  it('deve retornar o tema sazonal ativo dentro do intervalo de datas e do modo certo', () => {
    const now = new Date(2026, 1, 5) // 5 de fevereiro
    expect(getActiveSeasonalTheme(seasonalThemes, true, now)).toBe('carnaval')
  })

  it('não deve retornar o tema sazonal fora do intervalo de datas', () => {
    const now = new Date(2026, 5, 1) // 1 de junho
    expect(getActiveSeasonalTheme(seasonalThemes, true, now)).toBeNull()
  })

  it('não deve retornar o tema sazonal quando o modo claro/escuro não bate', () => {
    const now = new Date(2026, 1, 5)
    expect(getActiveSeasonalTheme(seasonalThemes, false, now)).toBeNull()
  })

  it('nunca deve considerar a chave "system"', () => {
    const now = new Date(2026, 1, 5)
    const withSeasonalSystem: Record<string, ThemeColors> = {
      ...seasonalThemes,
      system: { ...themes.system, seasonal: true, dark: true, dateRange: { start: '01-01', end: '12-31' } },
    }
    expect(getActiveSeasonalTheme(withSeasonalSystem, true, now)).not.toBe('system')
  })
})

describe('resolveThemePreference', () => {
  it('deve resolver "system" para "dark" quando o SO prefere escuro (sem sazonal ativo)', () => {
    expect(resolveThemePreference('system', themes, 'dark', true)).toBe('dark')
  })

  it('deve resolver "system" para "light" quando o SO prefere claro (sem sazonal ativo)', () => {
    expect(resolveThemePreference('system', themes, 'dark', false)).toBe('light')
  })

  it('deve retornar o próprio nome do tema quando a preferência é um tema de cor válido', () => {
    expect(resolveThemePreference('light', themes, 'dark', true)).toBe('light')
  })

  it('NUNCA deve retornar "system" como tema resolvido, mesmo que a chave exista em `themes`', () => {
    // Regressão: o plugin de SSR antes tratava a existência da chave 'system'
    // (placeholder de UI, sem cor) como um tema válido e aplicava
    // `data-theme="system"`, para o qual não existe CSS gerado.
    const resolved = resolveThemePreference('system', themes, 'dark', true)
    expect(resolved).not.toBe('system')
  })

  it('deve cair no tema padrão quando a preferência não existe', () => {
    expect(resolveThemePreference('nonexistent', themes, 'dark', true)).toBe('dark')
  })

  it('deve cair em "dark" quando até o tema padrão é inválido', () => {
    expect(resolveThemePreference('nonexistent', themes, 'also-nonexistent', true)).toBe('dark')
  })
})

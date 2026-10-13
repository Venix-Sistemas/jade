import { describe, it, expect } from 'vitest'
import { isColorTheme, getActiveSeasonalTheme, getEasterSunday, resolveThemePreference } from '../../src/shared/utils/theme-resolve'
import type { ThemeColors } from '../../src/shared/types'

const themes: Record<string, ThemeColors> = {
  // UI placeholder (see theme.json) — exists as a key but has no color at
  // all, only used to show "Automatic" in a theme picker.
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
    // Regression: the SSR plugin used to treat the existence of the 'system'
    // key (a UI placeholder, no color) as a valid theme and applied
    // `data-theme="system"`, for which no CSS is generated.
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

describe('getEasterSunday', () => {
  it.each([
    [2024, '2024-03-31'],
    [2025, '2025-04-20'],
    [2026, '2026-04-05'],
    [2027, '2027-03-28'],
    [2029, '2029-04-01'],
    [2038, '2038-04-25'],
  ])('%i → %s', (year, expected) => {
    const easter = getEasterSunday(year)
    const iso = `${easter.getFullYear()}-${String(easter.getMonth() + 1).padStart(2, '0')}-${String(easter.getDate()).padStart(2, '0')}`
    expect(iso).toBe(expected)
  })
})

describe('dateRange relativo à Páscoa', () => {
  // Carnaval: ~2 semanas antes até a Quarta-feira de Cinzas (`easter-46`)
  const carnavalThemes: Record<string, ThemeColors> = {
    ...themes,
    carnaval: {
      dark: true,
      primary: '#ff00ff',
      seasonal: true,
      dateRange: { start: 'easter-62', end: 'easter-46' },
    },
  }

  it.each([
    // 2026: Carnaval 14–17/02, Cinzas 18/02
    ['2026-02-02', 'carnaval'],
    ['2026-02-17', 'carnaval'],
    ['2026-02-18', 'carnaval'],
    ['2026-02-19', null],
    ['2026-02-01', null],
    // 2027: Carnaval 06–09/02 — fora do antigo intervalo fixo 14/02–05/03
    ['2027-02-09', 'carnaval'],
    ['2027-02-11', null],
    ['2027-01-25', 'carnaval'],
  ])('%s → %s', (date, expected) => {
    expect(getActiveSeasonalTheme(carnavalThemes, true, new Date(`${date}T12:00:00`))).toBe(expected)
  })

  it('aceita `easter` e `easter+N` sem deslocamento negativo', () => {
    const pascoa: Record<string, ThemeColors> = {
      pascoa: { dark: false, primary: '#eeeeee', seasonal: true, dateRange: { start: 'easter', end: 'easter+1' } },
    }
    expect(getActiveSeasonalTheme(pascoa, false, new Date('2026-04-05T12:00:00'))).toBe('pascoa')
    expect(getActiveSeasonalTheme(pascoa, false, new Date('2026-04-06T12:00:00'))).toBe('pascoa')
    expect(getActiveSeasonalTheme(pascoa, false, new Date('2026-04-07T12:00:00'))).toBeNull()
  })
})

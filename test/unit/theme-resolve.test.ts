import { describe, it, expect } from 'vitest'
import {
  isColorTheme,
  getActiveSeasonalTheme,
  getEasterSunday,
  getDefaultSelection,
  normalizeThemeSelection,
  resolveThemeSelection,
  resolveThemePreference,
  resolveServerTheme,
} from '../../src/shared/utils/theme-resolve'
import type { ColorModel } from '../../src/shared/utils/theme-resolve'
import { normalizeColorThemes } from '../../src/shared/utils/merge-themes'
import { buildResolvedTheme } from '../../src/shared/utils/theme-config'
import type { ThemeEntry } from '../../src/shared/types'

const entries: Record<string, ThemeEntry> = {
  // UI placeholder (see theme.json) — exists as a key but has no color at
  // all, only used to show "Automatic" in a theme picker.
  system: { translations: { 'en-US': 'Automatic' } },
  venix: {
    dark: { id: 'dark', primary: '#111111' },
    light: { id: 'light', primary: '#eeeeee' },
  },
}

const carnaval: ThemeEntry = {
  seasonal: true,
  dateRange: { start: '02-01', end: '02-10' },
  dark: { id: 'carnaval', primary: '#ff00ff' },
  light: { primary: '#ffccff' },
}

function model(extra: Record<string, ThemeEntry> = {}, defaultColor = 'dark'): ColorModel {
  return { ...normalizeColorThemes({ ...entries, ...extra }), defaultColor }
}

const base = model()
const seasonal = model({ carnaval })
const feb5 = new Date(2026, 1, 5)
const jun1 = new Date(2026, 5, 1)

describe('isColorTheme', () => {
  it('deve ser falso para um tema sem cores', () => {
    expect(isColorTheme({ translations: { 'en-US': 'Automatic' } })).toBe(false)
  })

  it('deve ser verdadeiro para um tema com `primary`', () => {
    expect(isColorTheme(base.themes.dark)).toBe(true)
  })

  it('deve ser falso para undefined', () => {
    expect(isColorTheme(undefined)).toBe(false)
  })
})

describe('getActiveSeasonalTheme', () => {
  it('deve retornar o tema sazonal ativo dentro do intervalo de datas', () => {
    expect(getActiveSeasonalTheme(seasonal.groups, 'dark', feb5)).toBe('carnaval')
    expect(getActiveSeasonalTheme(seasonal.groups, 'light', feb5)).toBe('carnaval')
  })

  it('não deve retornar o tema sazonal fora do intervalo de datas', () => {
    expect(getActiveSeasonalTheme(seasonal.groups, 'dark', jun1)).toBeNull()
  })

  it('não deve retornar um tema sazonal sem variante para o modo', () => {
    const darkOnly = model({ carnaval: { ...carnaval, light: undefined } })
    expect(getActiveSeasonalTheme(darkOnly.groups, 'light', feb5)).toBeNull()
    expect(getActiveSeasonalTheme(darkOnly.groups, 'dark', feb5)).toBe('carnaval')
  })

  it('nunca deve considerar a chave "system"', () => {
    const withSeasonalSystem = model({
      carnaval,
      system: { seasonal: true, dateRange: { start: '01-01', end: '12-31' }, translations: {} },
    })
    expect(getActiveSeasonalTheme(withSeasonalSystem.groups, 'dark', feb5)).not.toBe('system')
  })
})

describe('getDefaultSelection', () => {
  it('um id de variante (`dark`) vira o tema dela no modo dela', () => {
    expect(getDefaultSelection(base)).toEqual({ theme: 'venix', mode: 'dark', fallbackTheme: 'venix' })
  })

  it('um nome de tema segue o modo do sistema', () => {
    expect(getDefaultSelection(model({}, 'venix'))).toEqual({ theme: 'venix', mode: 'system', fallbackTheme: 'venix' })
  })

  it('`system` deixa tema e modo automáticos, com o primeiro tema não sazonal como base', () => {
    expect(getDefaultSelection(model({ carnaval }, 'system'))).toEqual({ theme: 'system', mode: 'system', fallbackTheme: 'venix' })
  })
})

describe('normalizeThemeSelection (cookies, inclusive os de antes da separação tema/modo)', () => {
  it.each([
    // [tema salvo, modo salvo, esperado]
    ['dark', undefined, { theme: 'venix', mode: 'dark' }],
    ['light', undefined, { theme: 'venix', mode: 'light' }],
    ['carnaval', undefined, { theme: 'carnaval', mode: 'dark' }],
    ['system', undefined, { theme: 'system', mode: 'system' }],
    ['system', 'light', { theme: 'system', mode: 'light' }],
    ['venix', 'system', { theme: 'venix', mode: 'system' }],
    ['dark', 'light', { theme: 'venix', mode: 'light' }],
    ['inexistente', undefined, { theme: 'venix', mode: 'dark' }],
    [undefined, undefined, { theme: 'venix', mode: 'dark' }],
    ['venix', 'roxo', { theme: 'venix', mode: 'dark' }],
  ] as const)('%s + %s → %o', (themePreference, modePreference, expected) => {
    expect(normalizeThemeSelection(themePreference, modePreference, seasonal)).toEqual(expected)
  })

  it('um tema legado de nome igual a um tema novo (`carnaval`) mantém o modo salvo', () => {
    expect(normalizeThemeSelection('carnaval', 'light', seasonal)).toEqual({ theme: 'carnaval', mode: 'light' })
  })
})

describe('normalizeThemeSelection sem temas sazonais', () => {
  it('"system" como tema vira o tema base, que é o que ele aplicaria', () => {
    expect(normalizeThemeSelection('system', undefined, base)).toEqual({ theme: 'venix', mode: 'system' })
    expect(normalizeThemeSelection('natal', 'dark', base)).toEqual({ theme: 'venix', mode: 'dark' })
  })
})

describe('resolveThemeSelection', () => {
  it('modo "system" segue o SO', () => {
    expect(resolveThemeSelection({ theme: 'venix', mode: 'system' }, base, true)).toBe('dark')
    expect(resolveThemeSelection({ theme: 'venix', mode: 'system' }, base, false)).toBe('light')
  })

  it('um modo fixo ignora o SO', () => {
    expect(resolveThemeSelection({ theme: 'venix', mode: 'light' }, base, true)).toBe('light')
  })

  it('tema "system" usa o sazonal ativo, na variante do modo', () => {
    expect(resolveThemeSelection({ theme: 'system', mode: 'dark' }, seasonal, false, feb5)).toBe('carnaval')
    expect(resolveThemeSelection({ theme: 'system', mode: 'light' }, seasonal, true, feb5)).toBe('carnaval-light')
  })

  it('tema "system" fora de temporada usa o tema padrão', () => {
    expect(resolveThemeSelection({ theme: 'system', mode: 'light' }, seasonal, true, jun1)).toBe('light')
  })

  it('um tema sazonal pode ser escolhido fora da temporada', () => {
    expect(resolveThemeSelection({ theme: 'carnaval', mode: 'light' }, seasonal, true, jun1)).toBe('carnaval-light')
  })

  it('um tema com uma só variante usa a que tem, qualquer que seja o modo', () => {
    const darkOnly = model({ noite: { dark: { primary: '#000000' } } })
    expect(resolveThemeSelection({ theme: 'noite', mode: 'light' }, darkOnly, false)).toBe('noite-dark')
  })

  it('NUNCA deve retornar "system" como tema resolvido', () => {
    expect(resolveThemeSelection({ theme: 'system', mode: 'system' }, base, true)).not.toBe('system')
  })

  it('deve cair no tema padrão quando o tema não existe', () => {
    expect(resolveThemeSelection({ theme: 'inexistente', mode: 'dark' }, base, true)).toBe('dark')
  })

  it('deve cair em uma variante válida quando até o tema padrão é inválido', () => {
    expect(resolveThemeSelection({ theme: 'inexistente', mode: 'dark' }, model({}, 'tambem-inexistente'), true)).toBe('dark')
  })
})

describe('resolveThemePreference', () => {
  it('normaliza e resolve direto dos cookies', () => {
    expect(resolveThemePreference('light', undefined, base, true)).toBe('light')
    expect(resolveThemePreference('system', undefined, base, false)).toBe('light')
    expect(resolveThemePreference('venix', 'dark', base, false)).toBe('dark')
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
  const carnavalGroups = model({
    carnaval: { ...carnaval, dateRange: { start: 'easter-62', end: 'easter-46' } },
  }).groups

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
    expect(getActiveSeasonalTheme(carnavalGroups, 'dark', new Date(`${date}T12:00:00`))).toBe(expected)
  })

  it('aceita `easter` e `easter+N` sem deslocamento negativo', () => {
    const pascoa = model({
      pascoa: { seasonal: true, dateRange: { start: 'easter', end: 'easter+1' }, light: { primary: '#eeeeee' } },
    }).groups
    expect(getActiveSeasonalTheme(pascoa, 'light', new Date('2026-04-05T12:00:00'))).toBe('pascoa')
    expect(getActiveSeasonalTheme(pascoa, 'light', new Date('2026-04-06T12:00:00'))).toBe('pascoa')
    expect(getActiveSeasonalTheme(pascoa, 'light', new Date('2026-04-07T12:00:00'))).toBeNull()
  })
})

describe('temas sazonais embutidos', () => {
  const builtIn = buildResolvedTheme().colors

  it.each([
    // 2026: Páscoa em 05/04 — de Domingo de Ramos (29/03) à segunda (06/04)
    ['2026-03-28', null],
    ['2026-03-29', 'pascoa'],
    ['2026-04-05', 'pascoa'],
    ['2026-04-06', 'pascoa'],
    ['2026-04-07', null],
    // Carnaval 2026 continua só com o Carnaval
    ['2026-02-17', 'carnaval'],
  ])('%s → %s', (date, expected) => {
    expect(getActiveSeasonalTheme(builtIn.groups, 'light', new Date(`${date}T12:00:00`))).toBe(expected)
  })

  it('a Páscoa resolve para a variante do modo escolhido', () => {
    const easter = new Date('2026-04-05T12:00:00')
    expect(resolveThemeSelection({ theme: 'system', mode: 'light' }, builtIn, true, easter)).toBe('pascoa-light')
    expect(resolveThemeSelection({ theme: 'system', mode: 'dark' }, builtIn, false, easter)).toBe('pascoa-dark')
  })
})

describe('resolveServerTheme (SSR, sem matchMedia)', () => {
  it('não devolve um tema sazonal salvo em outra época: recalcula pela data', () => {
    // Cookie resolvido de fevereiro (carnaval); em junho o automático é o base
    expect(resolveServerTheme('system', 'system', 'carnaval', seasonal, jun1)).toBe('dark')
    expect(resolveServerTheme('system', 'system', 'carnaval', seasonal, feb5)).toBe('carnaval')
  })

  it('usa o cookie resolvido só como pista de claro/escuro no modo automático', () => {
    expect(resolveServerTheme('venix', 'system', 'light', base, jun1)).toBe('light')
    expect(resolveServerTheme('venix', 'system', 'dark', base, jun1)).toBe('dark')
  })

  it('o modo escolhido explicitamente vence a pista', () => {
    expect(resolveServerTheme('venix', 'dark', 'light', base, jun1)).toBe('dark')
  })

  it('sem pista válida, assume escuro', () => {
    expect(resolveServerTheme('venix', 'system', undefined, base, jun1)).toBe('dark')
    expect(resolveServerTheme('venix', 'system', 'inexistente', base, jun1)).toBe('dark')
  })
})

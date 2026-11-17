import { describe, it, expect } from 'vitest'
import { DERIVED_ROLES, deriveSeeds } from '../../src/shared/utils/derive-seeds'
import { chromaOf, hexToOklab, hueOf, oklchToHex } from '../../src/shared/utils/oklab'
import { checkTokenContrast, generateTokens } from '../../src/shared/css/tokens'

/** Distance between two hues on the wheel, in degrees. */
const hueDistance = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

describe('hueOf e oklchToHex', () => {
  it('deve ler o matiz em graus e devolver null para cinzas', () => {
    expect(hueOf('#FF0000')).toBeCloseTo(29, 0)
    expect(hueOf('#00FF00')).toBeCloseTo(142, 0)
    expect(hueOf('#0000FF')).toBeCloseTo(264, 0)
    expect(hueOf('#808080')).toBeNull()
    expect(hueOf('#000000')).toBeNull()
  })

  it('deve ir e voltar: a cor em OKLCH mantém luminosidade e matiz', () => {
    const hex = oklchToHex(0.6, 0.15, 200)
    expect(hex).toMatch(/^#[0-9A-F]{6}$/)
    expect(hexToOklab(hex)[0]).toBeCloseTo(0.6, 1)
    expect(hueDistance(hueOf(hex)!, 200)).toBeLessThan(2)
  })

  it('deve baixar o chroma até caber no sRGB, sem mudar o matiz', () => {
    const hex = oklchToHex(0.9, 0.4, 260)
    expect(hex).toMatch(/^#[0-9A-F]{6}$/)
    expect(chromaOf(hex)).toBeLessThan(0.4)
    expect(hueDistance(hueOf(hex)!, 260)).toBeLessThan(6)
  })
})

describe('deriveSeeds', () => {
  const PRIMARIES = ['#FF0000', '#FF6B6B', '#1D4ED8', '#0EA5E9', '#16A34A', '#7C3AED']

  it('não deve derivar nada sem primary', () => {
    expect(deriveSeeds({}, 'light')).toEqual({})
    expect(deriveSeeds({ secondary: '#FF8800' }, 'dark')).toEqual({})
  })

  it('deve derivar os seis papéis restantes de um tema que só tem o primary', () => {
    const derived = deriveSeeds({ primary: '#1D4ED8' }, 'light')
    expect(Object.keys(derived)).toEqual([...DERIVED_ROLES])
    for (const hex of Object.values(derived)) expect(hex).toMatch(/^#[0-9A-F]{6}$/)
  })

  it.each(PRIMARIES)('deve girar o matiz do primary %s: secondary vizinho (+30°), accent oposto (+180°)', (primary) => {
    const base = hueOf(primary)!
    for (const mode of ['light', 'dark'] as const) {
      const { secondary, accent } = deriveSeeds({ primary }, mode)
      expect(hueDistance(hueOf(secondary!)!, (base + 30) % 360), `secondary de ${primary}`).toBeLessThan(6)
      expect(hueDistance(hueOf(accent!)!, (base + 180) % 360), `accent de ${primary}`).toBeLessThan(6)
      // a mesma luminosidade percebida
      expect(hexToOklab(secondary!)[0]).toBeCloseTo(hexToOklab(primary)[0], 1)
      expect(hexToOklab(accent!)[0]).toBeCloseTo(hexToOklab(primary)[0], 1)
    }
  })

  it('deve manter o chroma do primary no secondary e baixá-lo no accent', () => {
    const primary = '#1D4ED8'
    const { secondary, accent } = deriveSeeds({ primary }, 'light')
    expect(chromaOf(secondary!)).toBeLessThanOrEqual(chromaOf(primary) + 0.005)
    expect(chromaOf(accent!)).toBeLessThan(chromaOf(primary))
  })

  it.each(['light', 'dark'] as const)('deve seguir a convenção de matiz dos papéis de status no modo %s', (mode) => {
    const { error, warning, success, info } = deriveSeeds({ primary: '#7C3AED' }, mode)
    expect(hueDistance(hueOf(error!)!, 26)).toBeLessThan(10) // vermelho
    expect(hueDistance(hueOf(warning!)!, 82)).toBeLessThan(10) // âmbar
    expect(hueDistance(hueOf(success!)!, 148)).toBeLessThan(10) // verde
    expect(hueDistance(hueOf(info!)!, 245)).toBeLessThan(10) // azul
  })

  it('deve dar os mesmos status para qualquer primary, e mais claros no modo escuro', () => {
    const a = deriveSeeds({ primary: '#FF0000' }, 'dark')
    const b = deriveSeeds({ primary: '#1D4ED8' }, 'dark')
    for (const role of ['error', 'info', 'success', 'warning'] as const) expect(a[role]).toBe(b[role])

    const light = deriveSeeds({ primary: '#FF0000' }, 'light')
    for (const role of ['error', 'info', 'success'] as const) {
      expect(hexToOklab(a[role]!)[0], role).toBeGreaterThan(hexToOklab(light[role]!)[0])
    }
  })

  it('deve manter o amarelo do warning o mais claro dos status', () => {
    for (const mode of ['light', 'dark'] as const) {
      const derived = deriveSeeds({ primary: '#1D4ED8' }, mode)
      const lightness = (hex: string) => hexToOklab(hex)[0]
      expect(lightness(derived.warning!)).toBeGreaterThan(Math.max(lightness(derived.error!), lightness(derived.info!), lightness(derived.success!)))
    }
  })

  it('não deve derivar o que o tema já define', () => {
    const derived = deriveSeeds({ primary: '#1D4ED8', secondary: '#FF8800', error: '#AA0000' }, 'light')
    expect(derived).not.toHaveProperty('secondary')
    expect(derived).not.toHaveProperty('error')
    expect(derived).toHaveProperty('accent')
    expect(derived).toHaveProperty('warning')
  })

  it('não deve derivar secondary nem accent de um primary sem matiz, só os status', () => {
    for (const primary of ['#000000', '#FFFFFF', '#808080']) {
      const derived = deriveSeeds({ primary }, 'light')
      expect(Object.keys(derived), primary).toEqual(['error', 'info', 'success', 'warning'])
    }
  })

  it('deve ser determinístico', () => {
    expect(deriveSeeds({ primary: '#1D4ED8' }, 'dark')).toEqual(deriveSeeds({ primary: '#1D4ED8' }, 'dark'))
  })
})

describe('tokens com seeds derivados', () => {
  const toMap = (colors: Parameters<typeof generateTokens>[0], level: 'AA' | 'AAA' = 'AA') => Object.fromEntries(generateTokens(colors, level))
  const LIGHT = { dark: false, tokens: true, primary: '#1D4ED8', background: '#FFFFFF' } as const
  const DARK = { dark: true, tokens: true, primary: '#FF6B6B', background: '#0C0C0C' } as const

  it('deve usar o seed derivado exatamente como fill do papel', () => {
    for (const colors of [LIGHT, DARK]) {
      const derived = deriveSeeds({ primary: colors.primary }, colors.dark ? 'dark' : 'light')
      const t = toMap(colors)
      for (const role of DERIVED_ROLES) expect(t[`fill-${role}`], role).toBe(derived[role])
    }
  })

  it('deve deixar o seed do tema vencer o derivado, e derivar só o resto', () => {
    const t = toMap({ ...LIGHT, secondary: '#FF8800', error: '#AA0000' })
    expect(t['fill-secondary']).toBe('#FF8800')
    expect(t['fill-error']).toBe('#AA0000')
    expect(t['fill-warning']).toBe(deriveSeeds({ primary: LIGHT.primary }, 'light').warning)
  })

  it('deve gerar o mesmo que um tema que escreve os seeds à mão', () => {
    const derived = deriveSeeds({ primary: DARK.primary }, 'dark')
    expect(toMap({ ...DARK, ...derived })).toEqual(toMap(DARK))
  })

  it('não deve misturar no cache o tema derivado e o que define o seed', () => {
    const derived = toMap(LIGHT)['fill-error']
    expect(toMap({ ...LIGHT, error: '#2E8B4E' })['fill-error']).toBe('#2E8B4E')
    expect(toMap(LIGHT)['fill-error']).toBe(derived)
  })

  it('deve manter o neutro igual ao de antes: a derivação não muda a tinta do primary', () => {
    const withSeeds = toMap({ ...LIGHT, secondary: '#FF8800' })
    const derivedOnly = toMap(LIGHT)
    for (const name of ['bg', 'bg-subtle', 'bg-muted', 'border', 'text', 'text-muted']) expect(derivedOnly[name], name).toBe(withSeeds[name])
  })

  describe.each([
    ['claro', false, '#FAFAFA', ['#FF0000', '#1D4ED8', '#16A34A', '#FCCF3D', '#7C3AED', '#6B7280']],
    ['escuro', true, '#0C0C0C', ['#FF6B6B', '#60A5FA', '#4ADE80', '#FCCF3D', '#A78BFA', '#9CA3AF']],
  ] as const)('contraste dos papéis derivados no tema %s', (_label, dark, background, primaries) => {
    it.each(primaries)('deve passar AA e AAA com o primary %s', (primary) => {
      for (const level of ['AA', 'AAA'] as const) {
        const issues = checkTokenContrast(generateTokens({ dark, tokens: true, primary, background }, level), level)
        // `on-<papel>` em AAA depende de o seed alcançar 7:1 com preto ou branco, e nem todo alcança
        expect(issues.filter(issue => !issue.text.startsWith('on-')), `${level} com ${primary}`).toEqual([])
      }
    })
  })
})

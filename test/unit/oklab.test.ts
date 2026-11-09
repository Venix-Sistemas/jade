import { describe, it, expect } from 'vitest'
import { hexToOklab, lightnessOf, normalizeHex, oklabToHex, tintToward } from '../../src/shared/utils/oklab'
import { contrastRatio } from '../../src/shared/utils/contrast'

describe('normalizeHex', () => {
  it('deve expandir #RGB e deixar em maiúsculas', () => {
    expect(normalizeHex('#f80')).toBe('#FF8800')
    expect(normalizeHex(' #ff8800 ')).toBe('#FF8800')
  })

  it('deve aceitar hex sem o #', () => {
    expect(normalizeHex('fa0000')).toBe('#FA0000')
  })

  it('deve lançar erro para cores inválidas', () => {
    expect(() => normalizeHex('red')).toThrow('Invalid hex color')
    expect(() => normalizeHex('#12345')).toThrow('Invalid hex color')
  })
})

describe('hexToOklab / oklabToHex', () => {
  it('deve dar L=1 para branco e L=0 para preto, sem croma', () => {
    const [lw, aw, bw] = hexToOklab('#FFFFFF')
    expect(lw).toBeCloseTo(1, 4)
    expect(Math.hypot(aw, bw)).toBeLessThan(1e-3)
    expect(hexToOklab('#000000')[0]).toBeCloseTo(0, 6)
  })

  it('deve bater com o valor de referência do vermelho puro', () => {
    const [l, a, b] = hexToOklab('#FF0000')
    expect(l).toBeCloseTo(0.628, 3)
    expect(a).toBeCloseTo(0.2249, 3)
    expect(b).toBeCloseTo(0.1258, 3)
  })

  it('deve fazer a viagem de ida e volta sem perder a cor', () => {
    for (const hex of ['#FF0000', '#FF8800', '#1D4ED8', '#0C0C0C', '#FAFAFA', '#767676']) {
      expect(oklabToHex(...hexToOklab(hex))).toBe(hex)
    }
  })

  it('deve devolver null para cores fora do gamut sRGB', () => {
    expect(oklabToHex(0.5, 0.3, 0.3)).toBeNull()
  })
})

describe('lightnessOf', () => {
  it('deve dar 0 para preto, 100 para branco e ~53.2 para o vermelho puro (CIELAB L*)', () => {
    expect(lightnessOf('#000000')).toBeCloseTo(0, 6)
    expect(lightnessOf('#FFFFFF')).toBeCloseTo(100, 6)
    expect(lightnessOf('#FF0000')).toBeCloseTo(53.24, 1)
  })
})

describe('tintToward', () => {
  it('deve inclinar o fundo para o matiz do seed sem se afastar dele', () => {
    const tinted = tintToward('#FAFAFA', '#FF0000')
    expect(tinted).not.toBe('#FAFAFA')
    expect(contrastRatio(tinted, '#FAFAFA')).toBeLessThanOrEqual(1.02)
    expect(Number.parseInt(tinted.slice(1, 3), 16)).toBeGreaterThan(Number.parseInt(tinted.slice(5, 7), 16))
  })

  it('deve funcionar em fundo escuro', () => {
    const tinted = tintToward('#0C0C0C', '#FF6B6B')
    expect(tinted).not.toBe('#0C0C0C')
    expect(contrastRatio(tinted, '#0C0C0C')).toBeLessThanOrEqual(1.02)
  })

  it('deve devolver o próprio fundo quando nada cabe (branco e preto puros)', () => {
    expect(tintToward('#FFFFFF', '#FF0000')).toBe('#FFFFFF')
    expect(tintToward('#000000', '#FF0000')).toBe('#000000')
  })

  it('deve devolver o próprio fundo para um seed sem matiz (cinza)', () => {
    expect(tintToward('#FAFAFA', '#808080')).toBe('#FAFAFA')
  })
})

import { describe, it, expect } from 'vitest'
import { contrastRatio, relativeLuminance } from '../../src/shared/utils/contrast'

describe('relativeLuminance', () => {
  it('deve retornar 0 para preto e 1 para branco', () => {
    expect(relativeLuminance('#000000')).toBe(0)
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 10)
  })

  it('deve aceitar a forma curta #RGB', () => {
    expect(relativeLuminance('#fff')).toBeCloseTo(relativeLuminance('#FFFFFF'), 10)
    expect(relativeLuminance('#0af')).toBeCloseTo(relativeLuminance('#00AAFF'), 10)
  })

  it('deve ignorar maiúsculas e espaços nas pontas', () => {
    expect(relativeLuminance(' #ff8800 ')).toBe(relativeLuminance('#FF8800'))
  })

  it('deve bater com os valores de referência do WCAG', () => {
    expect(relativeLuminance('#FF0000')).toBeCloseTo(0.2126, 4)
    expect(relativeLuminance('#00FF00')).toBeCloseTo(0.7152, 4)
    expect(relativeLuminance('#0000FF')).toBeCloseTo(0.0722, 4)
  })

  it('deve usar o ramo linear para canais muito escuros', () => {
    // 10/255 está abaixo do limiar 0.03928: 10 / 255 / 12.92
    expect(relativeLuminance('#0A0A0A')).toBeCloseTo(10 / 255 / 12.92, 6)
  })

  it('deve lançar erro para cores inválidas', () => {
    expect(() => relativeLuminance('red')).toThrow('Invalid hex color')
    expect(() => relativeLuminance('FFFFFF')).toThrow('Invalid hex color')
    expect(() => relativeLuminance('#FFFF')).toThrow('Invalid hex color')
    expect(() => relativeLuminance('#GGGGGG')).toThrow('Invalid hex color')
    expect(() => relativeLuminance('')).toThrow('Invalid hex color')
  })
})

describe('contrastRatio', () => {
  it('deve retornar 21 para preto sobre branco', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 10)
  })

  it('deve retornar 1 para cores iguais', () => {
    expect(contrastRatio('#FF0000', '#FF0000')).toBe(1)
  })

  it('deve ser simétrica', () => {
    expect(contrastRatio('#FF0000', '#FAFAFA')).toBe(contrastRatio('#FAFAFA', '#FF0000'))
  })

  it('deve dar 4.54:1 para #767676 sobre branco (o cinza mais claro que passa AA)', () => {
    expect(contrastRatio('#767676', '#FFFFFF')).toBeCloseTo(4.54, 2)
  })

  it('deve bater com os valores medidos para o vermelho do Venix', () => {
    expect(contrastRatio('#FF0000', '#FFFFFF')).toBeCloseTo(4.0, 2)
    expect(contrastRatio('#FF0000', '#000000')).toBeCloseTo(5.25, 2)
    expect(contrastRatio('#FF0000', '#FAFAFA')).toBeCloseTo(3.83, 2)
  })

  it('deve bater com os valores medidos para os seeds do tema escuro', () => {
    expect(contrastRatio('#FF6B6B', '#000000')).toBeCloseTo(7.57, 2)
    expect(contrastRatio('#FF6B6B', '#0C0C0C')).toBeCloseTo(7.05, 2)
  })

  it('deve aceitar #RGB e #RRGGBB misturados', () => {
    expect(contrastRatio('#000', '#ffffff')).toBeCloseTo(21, 10)
  })
})

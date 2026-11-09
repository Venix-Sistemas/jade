import { describe, it, expect } from 'vitest'
import { collectTokens, generateTokens } from '../../src/shared/css/tokens'
import { TOKEN_NAMES, roleTokenName } from '../../src/shared/token-names'
import type { ThemeColors } from '../../src/shared/types'

const LIGHT: ThemeColors = { dark: false, tokens: true, primary: '#FF0000', secondary: '#FF8800', background: '#FAFAFA' }
const DARK: ThemeColors = { dark: true, tokens: true, primary: '#FF6B6B', secondary: '#FFB96A', background: '#0C0C0C' }

describe('nomes dos tokens', () => {
  it('deve listar exatamente os tokens que um tema completo gera, na mesma ordem', () => {
    expect(TOKEN_NAMES).toEqual(generateTokens(LIGHT).map(([name]) => name))
  })

  it('deve pôr o papel depois da propriedade', () => {
    expect(roleTokenName('fill-hover', 'primary')).toBe('fill-primary-hover')
    expect(roleTokenName('text-strong', 'secondary')).toBe('text-secondary-strong')
    expect(roleTokenName('bg', 'primary')).toBe('bg-primary')
  })
})

describe('collectTokens', () => {
  it('deve juntar só as variantes com `tokens: true`, por id, com valores hex', () => {
    const collected = collectTokens({ 'a-light': LIGHT, 'a-dark': DARK, 'b': { dark: false, primary: '#FF0000', background: '#FAFAFA' } })
    expect(Object.keys(collected)).toEqual(['a-light', 'a-dark'])
    expect(collected['a-light']!.bg).toBe('#FAFAFA')
    expect(collected['a-dark']!['fill-primary']).toBe('#FF6B6B')
    expect(Object.keys(collected['a-light']!)).toEqual([...TOKEN_NAMES])
  })

  it('deve devolver um objeto vazio quando nenhum tema usa tokens', () => {
    expect(collectTokens({ b: { dark: false, primary: '#FF0000' } })).toEqual({})
  })

  it('deve usar o nível pedido', () => {
    expect(collectTokens({ x: LIGHT }, 'AAA').x!['text-primary']).not.toBe(collectTokens({ x: LIGHT }, 'AA').x!['text-primary'])
  })
})

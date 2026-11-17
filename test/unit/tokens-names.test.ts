import { describe, it, expect } from 'vitest'
import { collectTokens, generateTokens } from '../../src/shared/css/tokens'
import { TOKEN_NAMES, roleTokenName } from '../../src/shared/token-names'
import type { ThemeColors } from '../../src/shared/types'

const LIGHT: ThemeColors = { dark: false, tokens: true, primary: '#FF0000', secondary: '#FF8800', background: '#FAFAFA' }
const DARK: ThemeColors = { dark: true, tokens: true, primary: '#FF6B6B', secondary: '#FFB96A', background: '#0C0C0C' }

/** Os sete papéis: o tema completo, que gera todos os tokens. */
const FULL: ThemeColors = { ...LIGHT, accent: '#82B1FF', error: '#E53935', info: '#2196F3', success: '#2E8B4E', warning: '#FCCF3D' }

describe('nomes dos tokens', () => {
  it('deve listar exatamente os tokens que um tema completo gera, na mesma ordem', () => {
    expect(TOKEN_NAMES).toEqual(generateTokens(FULL).map(([name]) => name))
  })

  it('deve gerar tokens para cada papel que o tema define, e só para esses', () => {
    const names = generateTokens(LIGHT).map(([name]) => name)
    expect(names).toContain('fill-secondary')
    expect(names).not.toContain('fill-warning')
    for (const role of ['accent', 'error', 'info', 'success', 'warning']) {
      expect(TOKEN_NAMES).toContain(roleTokenName('fill', role))
      expect(TOKEN_NAMES).toContain(`on-${role}`)
    }
  })

  it('deve pôr o papel depois da propriedade', () => {
    expect(roleTokenName('fill-hover', 'primary')).toBe('fill-primary-hover')
    expect(roleTokenName('text-strong', 'secondary')).toBe('text-secondary-strong')
    expect(roleTokenName('bg', 'primary')).toBe('bg-primary')
  })
})

describe('collectTokens', () => {
  it('deve juntar só as variantes com `tokens: true`, por id, com valores hex', () => {
    const collected = collectTokens({ 'a-light': FULL, 'a-dark': DARK, 'b': { dark: false, primary: '#FF0000', background: '#FAFAFA' } })
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

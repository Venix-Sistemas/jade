import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { venixUnoPreset } from '../../src/shared/unocss-preset'
import { TOKEN_NAMES } from '../../src/shared/token-names'

describe('venixUnoPreset', () => {
  it('deve ter o nome do preset', () => {
    expect(venixUnoPreset().name).toBe('venix-theme')
  })

  it('deve expor todas as propriedades de cor como CSS vars', () => {
    const { theme } = venixUnoPreset({ tokens: false })

    expect(theme.colors).toEqual({
      inverse: 'var(--color-inverse)',
      primary: 'var(--color-primary)',
      secondary: 'var(--color-secondary)',
      accent: 'var(--color-accent)',
      error: 'var(--color-error)',
      info: 'var(--color-info)',
      success: 'var(--color-success)',
      warning: 'var(--color-warning)',
      background: 'var(--color-background)',
      background2: 'var(--color-background2)',
      background3: 'var(--color-background3)',
    })
  })

  it('deve expor também os tokens semânticos, pelo nome completo, sem repetir nenhuma cor antiga', () => {
    const { colors } = venixUnoPreset().theme
    const old = venixUnoPreset({ tokens: false }).theme.colors

    expect(colors['text-primary']).toBe('var(--color-text-primary)')
    expect(colors['fill-primary']).toBe('var(--color-fill-primary)')
    expect(colors['on-secondary']).toBe('var(--color-on-secondary)')
    expect(colors['bg-subtle']).toBe('var(--color-bg-subtle)')
    expect(colors['border-focus']).toBe('var(--color-border-focus)')
    expect(Object.keys(colors)).toHaveLength(Object.keys(old).length + TOKEN_NAMES.length)
    for (const [name, value] of Object.entries(old)) expect(colors[name]).toBe(value)
    expect(TOKEN_NAMES.filter(name => name in old)).toEqual([])
  })

  it('não deve carregar o motor de cores (nada de scale, Leonardo ou css/tokens no preset)', () => {
    const source = readFileSync('src/shared/unocss-preset.ts', 'utf8')
    expect(source).not.toMatch(/utils\/scale|leonardo|css\/tokens/i)
  })

  it('deve levar cursor-default/pointer/text às variáveis do cursor, com o do sistema como reserva', () => {
    const preset = venixUnoPreset()
    expect(preset.rules).toEqual([
      ['cursor-default', { cursor: 'var(--cursor-default, default)' }],
      ['cursor-pointer', { cursor: 'var(--cursor-pointer, pointer)' }],
      ['cursor-text', { cursor: 'var(--cursor-text, text)' }],
    ])
    // Depois do presetWind/presetUno, cujas regras de mesmo nome substitui
    expect(preset.enforce).toBe('post')
  })

  it('deve retornar uma nova instância a cada chamada (sem estado compartilhado)', () => {
    const a = venixUnoPreset()
    const b = venixUnoPreset()

    expect(a).not.toBe(b)
    expect(a.theme.colors).not.toBe(b.theme.colors)
  })
})

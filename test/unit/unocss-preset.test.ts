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

  it('deve expor cada token como uma classe color-<token>, com a propriedade a que ele serve', () => {
    const { rules, theme } = venixUnoPreset()
    const byClass = Object.fromEntries(rules.map(([name, css]) => [name, css]))

    expect(byClass['color-bg-subtle']).toEqual({ 'background-color': 'var(--color-bg-subtle)' })
    expect(byClass['color-fill-primary']).toEqual({ 'background-color': 'var(--color-fill-primary)' })
    expect(byClass['color-text-muted']).toEqual({ color: 'var(--color-text-muted)' })
    expect(byClass['color-on-secondary']).toEqual({ color: 'var(--color-on-secondary)' })
    expect(byClass['color-border-strong']).toEqual({ 'border-color': 'var(--color-border-strong)' })
    expect(byClass['color-text']).toEqual({ color: 'var(--color-text)' })
    // uma classe por token, sem nenhuma cor de tema nova
    for (const name of TOKEN_NAMES) expect(byClass[`color-${name}`]).toBeDefined()
    expect(Object.keys(theme.colors)).toEqual(Object.keys(venixUnoPreset({ tokens: false }).theme.colors))
  })

  it('não deve usar nome de classe de outros sistemas de cor (Vuetify, Bootstrap, shadcn)', () => {
    const names = venixUnoPreset().rules.map(([name]) => name).filter(name => !name.startsWith('cursor-'))
    expect(names.filter(name => !name.startsWith('color-'))).toEqual([])
  })

  it('deve deixar os tokens de fora com { tokens: false }', () => {
    const preset = venixUnoPreset({ tokens: false })
    expect(preset.rules.map(([name]) => name).filter(name => name.startsWith('color-'))).toEqual([])
  })

  it('não deve carregar o motor de cores (nada de scale, Leonardo ou css/tokens no preset)', () => {
    const source = readFileSync('src/shared/unocss-preset.ts', 'utf8')
    expect(source).not.toMatch(/utils\/scale|leonardo|css\/tokens/i)
  })

  it('deve levar cursor-default/pointer/text às variáveis do cursor, com o do sistema como reserva', () => {
    const preset = venixUnoPreset()
    expect(preset.rules.filter(([name]) => name.startsWith('cursor-'))).toEqual([
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

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { jadeUnoPreset, venixUnoPreset } from '../../src/shared/unocss-preset'
import { TOKEN_NAMES } from '../../src/shared/token-names'

describe('jadeUnoPreset', () => {
  it('deve ter o nome do preset', () => {
    expect(jadeUnoPreset().name).toBe('jade')
    // o nome até a 1.5 segue valendo
    expect(venixUnoPreset).toBe(jadeUnoPreset)
  })

  it('deve expor todas as propriedades de cor como CSS vars', () => {
    const { theme } = jadeUnoPreset({ tokens: false })

    expect(theme.colors).toEqual({
      inverse: 'var(--jade-inverse)',
      primary: 'var(--jade-primary)',
      secondary: 'var(--jade-secondary)',
      accent: 'var(--jade-accent)',
      error: 'var(--jade-error)',
      info: 'var(--jade-info)',
      success: 'var(--jade-success)',
      warning: 'var(--jade-warning)',
      background: 'var(--jade-background)',
      background2: 'var(--jade-background2)',
      background3: 'var(--jade-background3)',
    })
  })

  it('deve expor cada token como uma classe color-<token>, com a propriedade a que ele serve', () => {
    const { rules, theme } = jadeUnoPreset()
    const byClass = Object.fromEntries(rules.map(([name, css]) => [name, css]))

    expect(byClass['jade-bg-subtle']).toEqual({ 'background-color': 'var(--jade-bg-subtle)' })
    expect(byClass['jade-fill-primary']).toEqual({ 'background-color': 'var(--jade-fill-primary)' })
    expect(byClass['jade-text-muted']).toEqual({ color: 'var(--jade-text-muted)' })
    expect(byClass['jade-on-secondary']).toEqual({ color: 'var(--jade-on-secondary)' })
    expect(byClass['jade-border-strong']).toEqual({ 'border-color': 'var(--jade-border-strong)' })
    expect(byClass['jade-text']).toEqual({ color: 'var(--jade-text)' })
    // uma classe por token, sem nenhuma cor de tema nova
    for (const name of TOKEN_NAMES) expect(byClass[`jade-${name}`]).toBeDefined()
    expect(Object.keys(theme.colors)).toEqual(Object.keys(jadeUnoPreset({ tokens: false }).theme.colors))
  })

  it('não deve usar nome de classe de outros sistemas de cor (Vuetify, Bootstrap, shadcn)', () => {
    const names = jadeUnoPreset().rules.map(([name]) => name).filter(name => !name.startsWith('cursor-'))
    expect(names.filter(name => !name.startsWith('jade-'))).toEqual([])
  })

  it('deve deixar os tokens de fora com { tokens: false }', () => {
    const preset = jadeUnoPreset({ tokens: false })
    expect(preset.rules.map(([name]) => name).filter(name => name.startsWith('jade-'))).toEqual([])
  })

  it('não deve carregar o motor de cores (nada de scale, Leonardo ou css/tokens no preset)', () => {
    const source = readFileSync('src/shared/unocss-preset.ts', 'utf8')
    expect(source).not.toMatch(/utils\/scale|leonardo|css\/tokens/i)
  })

  it('deve levar as classes de cursor às variáveis do cursor, com o do sistema como reserva', () => {
    const preset = jadeUnoPreset()
    expect(preset.rules.filter(([name]) => name.startsWith('cursor-'))).toEqual([
      ['cursor-default', { cursor: 'var(--jade-cursor-default, default)' }],
      ['cursor-pointer', { cursor: 'var(--jade-cursor-pointer, pointer)' }],
      ['cursor-text', { cursor: 'var(--jade-cursor-text, text)' }],
      ['cursor-grab', { cursor: 'var(--jade-cursor-grab, grab)' }],
      ['cursor-grabbing', { cursor: 'var(--jade-cursor-grabbing, grabbing)' }],
    ])
    // Depois do presetWind/presetUno, cujas regras de mesmo nome substitui
    expect(preset.enforce).toBe('post')
  })

  it('deve retornar uma nova instância a cada chamada (sem estado compartilhado)', () => {
    const a = jadeUnoPreset()
    const b = jadeUnoPreset()

    expect(a).not.toBe(b)
    expect(a.theme.colors).not.toBe(b.theme.colors)
  })
})

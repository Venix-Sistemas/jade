import { describe, it, expect } from 'vitest'
import { venixUnoPreset } from '../../src/shared/unocss-preset'

describe('venixUnoPreset', () => {
  it('deve ter o nome do preset', () => {
    expect(venixUnoPreset().name).toBe('venix-theme')
  })

  it('deve expor todas as propriedades de cor como CSS vars', () => {
    const { theme } = venixUnoPreset()

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

  it('deve retornar uma nova instância a cada chamada (sem estado compartilhado)', () => {
    const a = venixUnoPreset()
    const b = venixUnoPreset()

    expect(a).not.toBe(b)
    expect(a.theme.colors).not.toBe(b.theme.colors)
  })
})

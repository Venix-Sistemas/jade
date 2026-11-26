import { describe, it, expect } from 'vitest'
import { generateBoldSurface } from '../../src/shared/css/bold'
import { checkTokenContrast, generateTokens } from '../../src/shared/css/tokens'
import { contrastRatio } from '../../src/shared/utils/contrast'
import { normalizeColorThemes } from '../../src/shared/utils/merge-themes'
import type { ThemeColors } from '../../src/shared/types'

const DARK: ThemeColors = { dark: true, tokens: true, surfaces: 'vivid', primary: '#4FC3D9', secondary: '#7FD8C9', background: '#08141A' }
const LIGHT: ThemeColors = { dark: false, tokens: true, surfaces: 'bold', primary: '#0B6E8A', secondary: '#0A6462', background: '#F4FAFC' }
const VARIANTS = [
  ['escuro', DARK],
  ['claro bold', LIGHT],
  ['escuro bold', { ...DARK, surfaces: 'bold' } as ThemeColors],
] as const

const toMap = (colors: ThemeColors) => Object.fromEntries(generateTokens(colors))
const toBoldMap = (colors: ThemeColors) => Object.fromEntries(generateBoldSurface(colors)!.tokens)
const OUTLINE = /^border(?:-(?:primary|secondary|accent|error|info|success|warning))?$/

describe('borders: "soft"', () => {
  it('aproxima a borda neutra e a dos papéis da cor do card', () => {
    const before = toMap(DARK)
    const after = toMap({ ...DARK, borders: 'soft' })
    expect(after.border).toBe(after['bg-muted'])
    expect(contrastRatio(after.border!, after['bg-subtle']!)).toBeLessThan(contrastRatio(before.border!, before['bg-subtle']!))
    expect(after['border-primary']).toBe(after['bg-primary-hover'])
  })

  it.each(VARIANTS)('só muda as bordas decorativas (%s)', (_label, colors) => {
    const pairs = [[toMap(colors), toMap({ ...colors, borders: 'soft' })]]
    if (colors.surfaces === 'bold') pairs.push([toBoldMap(colors), toBoldMap({ ...colors, borders: 'soft' })])
    for (const [before, after] of pairs) {
      const changed = Object.keys(before!).filter(name => before![name] !== after![name])
      expect(changed).toContain('border')
      expect(changed.filter(name => !OUTLINE.test(name))).toEqual([])
    }
  })

  it('dentro do painel bold usa um tom mais fundo, não uma linha clara', () => {
    const tokens = toBoldMap({ ...DARK, surfaces: 'bold', borders: 'soft' })
    expect(tokens.border).toBe(tokens['bg-muted'])
    expect(contrastRatio(tokens.border!, '#000000')).toBeLessThan(contrastRatio(tokens.bg!, '#000000'))
  })

  it.each(VARIANTS)('mantém os pares de contraste (%s)', (_label, colors) => {
    const check = (entry: ThemeColors) => checkTokenContrast(generateTokens(entry), 'AA')
    expect(check({ ...colors, borders: 'soft' })).toEqual(check(colors))
  })

  it('perde para um token re-apontado pelo tema', () => {
    const tokens = toMap({ ...DARK, borders: 'soft', tokens: { border: 'neutral-9' } })
    expect(tokens.border).toBe(tokens['border-strong'])
  })

  it('"default" gera o mesmo que sem a opção', () => {
    expect(toMap({ ...DARK, borders: 'default' })).toEqual(toMap(DARK))
  })

  it('vale no tema ou na variante, que vence', () => {
    const light = { primary: '#0B6E8A', background: '#FFFFFF' }
    const dark = { primary: '#4FC3D9', background: '#08141A' }
    const { themes } = normalizeColorThemes({ t: { tokens: true, borders: 'soft', light: { ...light, borders: 'default' }, dark } })
    expect(themes['t-light']).toMatchObject({ borders: 'default' })
    expect(themes['t-dark']).toMatchObject({ borders: 'soft' })
  })
})

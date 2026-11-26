import { describe, it, expect } from 'vitest'
import { generateThemeVars } from '../../src/shared/css/colors'
import { generateMenuCss, generateMenuSurface, menuOf } from '../../src/shared/css/menu'
import { generateTokens } from '../../src/shared/css/tokens'
import { applyChoice, choiceOf, decodeChoices, encodeChoices } from '../../src/shared/lab/choice'
import { contrastRatio } from '../../src/shared/utils/contrast'
import { normalizeColorThemes } from '../../src/shared/utils/merge-themes'
import builtIn from '../../src/shared/theme.json'
import type { ThemeColors } from '../../src/shared/types'

const LIGHT: ThemeColors = { dark: false, tokens: true, primary: '#D80000', secondary: '#FF8800', background: '#FAFAFA' }
const DARK: ThemeColors = { dark: true, tokens: true, primary: '#FF6B6B', secondary: '#FFB96A', background: '#0C0C0C' }
const BUILT_IN = Object.entries(normalizeColorThemes(builtIn.colors.themes as never).themes)
  .filter(([, colors]) => colors.tokens && colors.primary)

describe('menu lateral', () => {
  it('é forte num tema bold e discreto nos outros, até o tema escolher', () => {
    expect(menuOf(LIGHT)).toBe('bold')
    expect(menuOf(DARK)).toBe('soft')
    expect(menuOf({ ...LIGHT, menu: 'soft' })).toBe('soft')
    expect(menuOf({ ...DARK, menu: 'bold' })).toBe('bold')
  })

  it('discreto: o tom claro da cor principal, seguindo os valores do tema', () => {
    const css = generateMenuCss('dark', DARK)
    expect(css).toContain(':root[data-jade-theme=\'dark\'] [data-jade-surface=\'menu\'] {')
    expect(css).toContain('--jade-bg: var(--jade-bg-primary);')
    expect(css).toContain('background-color: var(--jade-bg);')
    expect(generateMenuSurface(DARK)).toBeNull()
  })

  it('forte: o painel bold, mesmo num tema que não é bold', () => {
    const colors: ThemeColors = { ...DARK, menu: 'bold' }
    const panel = Object.fromEntries(generateMenuSurface(colors)!.tokens)
    expect(generateMenuCss('dark', colors)).toContain(`--jade-bg: ${panel.bg};`)
    expect(generateThemeVars('dark', colors)).not.toContain('[data-jade-surface=\'bold\']')
  })

  it.each(BUILT_IN)('discreto em %s: o texto se lê sobre o menu e sobre o item marcado', (id, colors) => {
    const tokens = Object.fromEntries(generateTokens(colors))
    const css = generateMenuCss(id, { ...colors, menu: 'soft' })
    const texts = css.includes('--jade-text-muted: var(--jade-text);') ? ['text'] : ['text', 'text-muted']
    for (const text of texts) {
      for (const background of ['bg-primary', 'bg-primary-hover', 'bg-primary-active']) {
        expect(contrastRatio(tokens[text]!, tokens[background]!), `${text} sobre ${background}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('não gera nada sem tokens', () => {
    expect(generateMenuCss('x', { ...DARK, tokens: false })).toBe('')
  })

  it('vale no tema ou na variante, que vence', () => {
    const { themes } = normalizeColorThemes({ t: { tokens: true, menu: 'bold', light: { primary: '#000000', menu: 'soft' }, dark: { primary: '#FFFFFF' } } })
    expect(themes['t-light']).toMatchObject({ menu: 'soft' })
    expect(themes['t-dark']).toMatchObject({ menu: 'bold' })
  })

  it('a escolha do visitante vai no cookie e vale sobre o estilo', () => {
    const choice = { ...choiceOf(LIGHT), menu: 'soft' as const }
    expect(applyChoice(LIGHT, choice).menu).toBe('soft')
    const encoded = encodeChoices({ light: { ...choice, colors: { primary: '#123456' } } })
    expect(encoded).toBe('light,1,v,d,ms,0-123456')
    expect(decodeChoices(encoded, ['light']).light).toMatchObject({ menu: 'soft', colors: { primary: '#123456' } })
    expect(decodeChoices('light,1,v,d,mx', ['light'])).toEqual({})
  })
})

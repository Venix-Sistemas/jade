import { describe, it, expect } from 'vitest'
import { generateThemeVars } from '../../src/shared/css/colors'
import { generateMenuCss, generateMenuSurface, menuOf } from '../../src/shared/css/menu'
import { generateFaintMenu } from '../../src/shared/css/faint-menu'
import { generateTokens } from '../../src/shared/css/tokens'
import { applyChoice, choiceOf, decodeChoices, encodeChoices } from '../../src/shared/lab/choice'
import { contrastRatio } from '../../src/shared/utils/contrast'
import { chromaOf } from '../../src/shared/utils/oklab'
import { normalizeColorThemes } from '../../src/shared/utils/merge-themes'
import builtIn from '../../src/shared/theme.json'
import type { ThemeColors } from '../../src/shared/types'

const LIGHT: ThemeColors = { dark: false, tokens: true, primary: '#D80000', secondary: '#FF8800', background: '#FAFAFA' }
const DARK: ThemeColors = { dark: true, tokens: true, primary: '#FF6B6B', secondary: '#FFB96A', background: '#0C0C0C' }
const BUILT_IN = Object.entries(normalizeColorThemes(builtIn.colors.themes as never).themes)
  .filter(([, colors]) => colors.tokens && colors.primary)

describe('menu lateral', () => {
  it('é forte num tema bold, fraco no escuro e discreto no claro, até o tema escolher', () => {
    expect(menuOf(LIGHT)).toBe('bold')
    expect(menuOf(DARK)).toBe('faint')
    expect(menuOf({ ...LIGHT, neutralTint: false })).toBe('soft')
    expect(menuOf({ ...DARK, surfaces: 'bold' })).toBe('bold')
    expect(menuOf({ ...LIGHT, menu: 'soft' })).toBe('soft')
    expect(menuOf({ ...DARK, menu: 'bold' })).toBe('bold')
  })

  it('discreto: o tom claro da cor principal, seguindo os valores do tema', () => {
    const css = generateMenuCss('dark', { ...DARK, menu: 'soft' })
    expect(css).toContain(':root[data-jade-theme=\'dark\'] [data-jade-surface=\'menu\'] {')
    expect(css).toContain('--jade-bg: var(--jade-bg-primary);')
    expect(css).toContain('background-color: var(--jade-bg);')
    expect(generateMenuSurface({ ...DARK, menu: 'soft' })).toBeNull()
  })

  it('fraco: o tom da página com um toque da cor principal, quase sem se destacar', () => {
    const page = Object.fromEntries(generateTokens(DARK))
    const menu = Object.fromEntries(generateFaintMenu(DARK)!)
    const css = generateMenuCss('dark', DARK)
    expect(css).toContain(`--jade-bg: ${menu.bg};`)
    expect(css).not.toContain('--jade-bg: var(--jade-bg-primary);')
    expect(generateMenuSurface(DARK)).toBeNull()

    // perto da página, e bem menos colorido que o passo mais fraco da escala do primary
    expect(contrastRatio(menu.bg!, page.bg!)).toBeLessThan(1.1)
    expect(chromaOf(menu.bg!)).toBeLessThan(0.035)
    expect(chromaOf(menu.bg!)).toBeLessThan(chromaOf(page['bg-primary']!) / 2)
    // o item sob o cursor e o marcado se afastam um pouco mais, nesta ordem
    expect(contrastRatio(menu['bg-hover']!, page.bg!)).toBeGreaterThan(contrastRatio(menu.bg!, page.bg!))
    expect(contrastRatio(menu['bg-active']!, page.bg!)).toBeGreaterThan(contrastRatio(menu['bg-hover']!, page.bg!))
  })

  it('fraco: um primary cinza dá um menu cinza, e sem primary não há menu', () => {
    const gray = Object.fromEntries(generateFaintMenu({ ...DARK, primary: '#808080' })!)
    expect(chromaOf(gray.bg!)).toBeLessThan(0.002)
    expect(generateFaintMenu({ ...DARK, primary: undefined })).toBeNull()
  })

  it('fraco: o alto contraste leva os valores AAA ao prefers-contrast', () => {
    const css = generateMenuCss('dark', DARK, 'AA', true)
    const aaa = Object.fromEntries(generateFaintMenu(DARK, 'AAA')!)
    expect(css).toContain('@media (prefers-contrast: more)')
    expect(css.slice(css.indexOf('@media'))).toContain(`--jade-text-muted: ${aaa['text-muted']};`)
  })

  it.each(BUILT_IN.flatMap(entry => (['AA', 'AAA'] as const).map(level => [...entry, level] as const)))('fraco em %s: textos e contornos se leem sobre o menu (%s)', (_id, colors, level) => {
    const menu = new Map([...generateTokens(colors, level), ...generateFaintMenu(colors, level)!])
    const texts = [...menu.keys()].filter(name => /^text(?:-muted|-primary|-secondary|-accent|-error|-info|-success|-warning)?$/.test(name))
    for (const surface of ['bg', 'bg-subtle', 'bg-muted', 'bg-hover', 'bg-active', 'bg-primary', 'bg-primary-hover', 'bg-primary-active']) {
      for (const text of texts) {
        expect(contrastRatio(menu.get(text)!, menu.get(surface)!), `${text} sobre ${surface}`).toBeGreaterThanOrEqual(level === 'AA' ? 4.5 : 7)
      }
    }
    for (const surface of ['bg', 'bg-subtle']) {
      for (const outline of ['border-strong', 'border-focus']) {
        expect(contrastRatio(menu.get(outline)!, menu.get(surface)!), `${outline} sobre ${surface}`).toBeGreaterThanOrEqual(3)
      }
    }
    // o texto de apoio continua mais fraco que o principal
    expect(contrastRatio(menu.get('text')!, menu.get('bg')!)).toBeGreaterThan(contrastRatio(menu.get('text-muted')!, menu.get('bg')!))
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

  it.each(['faint', 'soft', 'bold'] as const)('o menu %s escrito na configuração chega à variante', (menu) => {
    const { themes } = normalizeColorThemes({ t: { tokens: true, dark: { primary: '#FF6B6B', menu } } })
    expect(themes['t-dark']!.menu).toBe(menu)
  })

  it('a escolha do visitante vai no cookie e vale sobre o estilo', () => {
    const choice = { ...choiceOf(LIGHT), menu: 'soft' as const }
    expect(applyChoice(LIGHT, choice).menu).toBe('soft')
    const encoded = encodeChoices({ light: { ...choice, colors: { primary: '#123456' } } })
    expect(encoded).toBe('light,1,v,d,ms,0-123456')
    expect(decodeChoices(encoded, ['light']).light).toMatchObject({ menu: 'soft', colors: { primary: '#123456' } })
    expect(decodeChoices('light,1,v,d,mx', ['light'])).toEqual({})
  })

  it.each(['faint', 'soft', 'bold'] as const)('o cookie guarda o menu %s', (menu) => {
    const encoded = encodeChoices({ dark: { ...choiceOf(DARK), menu } })
    expect(decodeChoices(encoded, ['dark']).dark!.menu).toBe(menu)
  })
})

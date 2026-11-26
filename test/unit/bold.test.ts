import { describe, it, expect } from 'vitest'
import { buildVuetifyThemes } from '../../src/setup/register-vuetify'
import { generateBoldCss, generateBoldSurface } from '../../src/shared/css/bold'
import { generateThemeVars } from '../../src/shared/css/colors'
import { generateCustomScrollbarCSS } from '../../src/shared/css/scrollbar'
import { checkTokenContrast, findTokenContrastIssues, generateTokens } from '../../src/shared/css/tokens'
import { contrastRatio, relativeLuminance } from '../../src/shared/utils/contrast'
import { normalizeColorThemes } from '../../src/shared/utils/merge-themes'
import type { ColorsConfig, ThemeColors, ThemeConfig } from '../../src/shared/types'

const GREEN: ThemeColors = { dark: false, tokens: true, surfaces: 'bold', primary: '#2D900C', secondary: '#1565C0', background: '#FFFFFF' }
const GREEN_DARK: ThemeColors = { dark: true, tokens: true, surfaces: 'bold', primary: '#2D900C', secondary: '#64B5F6', background: '#121212' }
const YELLOW: ThemeColors = { dark: false, tokens: true, surfaces: 'bold', primary: '#F4B400', background: '#FFFFFF' }
const PINK: ThemeColors = { dark: false, tokens: true, surfaces: 'bold', primary: '#C2185B', background: '#FFFFFF' }
const RED: ThemeColors = { dark: false, tokens: true, surfaces: 'bold', primary: '#FF0000', secondary: '#FF8800', background: '#FAFAFA' }
const VARIANTS = [['verde claro', GREEN], ['verde escuro', GREEN_DARK], ['amarelo', YELLOW], ['rosa', PINK], ['vermelho', RED]] as const

const BACKGROUNDS = ['bg', 'bg-subtle', 'bg-muted', 'bg-hover', 'bg-active']
const tokensOf = (colors: ThemeColors, level: 'AA' | 'AAA' = 'AA') => Object.fromEntries(generateBoldSurface(colors, level)!.tokens)

describe('generateBoldSurface', () => {
  it('não deve gerar sem `surfaces: "bold"`, sem tokens ou sem seed', () => {
    expect(generateBoldSurface({ ...GREEN, surfaces: 'vivid' })).toBeNull()
    expect(generateBoldSurface({ ...GREEN_DARK, surfaces: undefined })).toBeNull()
    expect(generateBoldSurface({ ...GREEN, tokens: false })).toBeNull()
    expect(generateBoldSurface({ dark: false, tokens: true, surfaces: 'bold', background: '#FFFFFF' })).toBeNull()
  })

  it('deve ser o padrão de uma variante clara, mas não da escura', () => {
    expect(generateBoldSurface({ ...GREEN, surfaces: undefined })).toEqual(generateBoldSurface(GREEN))
    expect(generateBoldSurface({ ...GREEN_DARK, surfaces: undefined })).toBeNull()
  })

  it('não deve ser o padrão de uma variante clara que escolhe os neutros com `neutralTint`', () => {
    for (const neutralTint of [true, false, 'vivid'] as const) {
      expect(generateBoldSurface({ ...GREEN, surfaces: undefined, neutralTint })).toBeNull()
    }
  })

  it.each(VARIANTS)('deve gerar os mesmos tokens do tema, para o escopo substituí-los por inteiro (%s)', (_label, colors) => {
    const names = generateBoldSurface(colors)!.tokens.map(([name]) => name)
    expect(names).toEqual(generateTokens(colors).map(([name]) => name))
  })

  it.each(VARIANTS)('deve passar os pares de contraste do nível, menos o texto sobre as sementes dos papéis (%s)', (_label, colors) => {
    for (const level of ['AA', 'AAA'] as const) {
      const issues = checkTokenContrast(generateBoldSurface(colors, level)!.tokens, level)
      expect(issues.filter(issue => !issue.text.startsWith('on-')), level).toEqual([])
    }
  })

  it('deve usar texto branco sobre um verde escuro, com folga para o texto suave', () => {
    const tokens = tokensOf(GREEN)
    expect(tokens.text).toBe('#FFFFFF')
    expect(contrastRatio(tokens.text!, tokens.bg!)).toBeGreaterThanOrEqual(4.5 * 1.2)
    expect(contrastRatio(tokens['text-muted']!, tokens.bg!)).toBeGreaterThanOrEqual(4.5)
    expect(tokens['text-muted']).not.toBe(tokens.text)
  })

  it('deve manter o matiz do verde na superfície', () => {
    const [r, g, b] = [1, 3, 5].map(i => Number.parseInt(tokensOf(GREEN).bg!.slice(i, i + 2), 16))
    expect(g!).toBeGreaterThan(r!)
    expect(g!).toBeGreaterThan(b!)
  })

  it('deve usar texto preto sobre uma semente clara, em vez de escurecê-la até virar outra cor', () => {
    const bold = generateBoldSurface(YELLOW)!
    const tokens = Object.fromEntries(bold.tokens)
    expect(bold.dark).toBe(false)
    expect(tokens.text).toBe('#000000')
    expect(tokens.bg).toBe('#F4B400')
  })

  it('deve levar os fundos mais fortes para longe do texto, para o contraste só crescer', () => {
    const dark = tokensOf(GREEN)
    const darkLuminance = BACKGROUNDS.map(name => relativeLuminance(dark[name]!))
    expect([...darkLuminance].sort((a, b) => b - a)).toEqual(darkLuminance)

    const light = tokensOf(YELLOW)
    const lightLuminance = BACKGROUNDS.map(name => relativeLuminance(light[name]!))
    expect([...lightLuminance].sort((a, b) => a - b)).toEqual(lightLuminance)
  })

  it('deve inverter o preenchimento do papel da marca: botão na cor do texto, com a cor do painel sobre ele', () => {
    const tokens = tokensOf(GREEN)
    expect(tokens['fill-primary']).toBe(tokens.text)
    expect(tokens['on-primary']).toBe(tokens.bg)
    expect(contrastRatio(tokens['on-primary']!, tokens['fill-primary-hover']!)).toBeGreaterThanOrEqual(4.5)
  })

  it('deve dar a uma variante escura de semente clara um painel profundo com texto branco, não um painel claro', () => {
    const lightSeed: ThemeColors = { dark: true, tokens: true, surfaces: 'bold', primary: '#6FCF7F', background: '#121212' }
    const bold = generateBoldSurface(lightSeed)!
    const tokens = Object.fromEntries(bold.tokens)
    expect(bold.dark).toBe(true)
    expect(tokens.text).toBe('#FFFFFF')
    expect(relativeLuminance(tokens.bg!)).toBeLessThan(0.2)
    expect(checkTokenContrast(bold.tokens, 'AA').filter(issue => !issue.text.startsWith('on-'))).toEqual([])
    // numa variante clara, a mesma semente clara fica como é, com texto escuro
    expect(generateBoldSurface({ ...lightSeed, dark: false, background: '#FFFFFF' })!.dark).toBe(false)
  })

  it('deve gerar o mesmo painel no claro e no escuro, já que ele não depende da página', () => {
    expect(tokensOf(GREEN).bg).toBe(tokensOf(GREEN_DARK).bg)
  })

  it('deve pedir mais ao nível AAA: painel mais fundo', () => {
    expect(relativeLuminance(tokensOf(GREEN, 'AAA').bg!)).toBeLessThan(relativeLuminance(tokensOf(GREEN, 'AA').bg!))
    expect(contrastRatio('#FFFFFF', tokensOf(GREEN, 'AAA').bg!)).toBeGreaterThanOrEqual(7)
  })

  it('não deve misturar níveis no cache', () => {
    const aa = tokensOf(GREEN, 'AA').bg
    tokensOf(GREEN, 'AAA')
    expect(tokensOf(GREEN, 'AA').bg).toBe(aa)
  })
})

describe('surfaces e neutralTint', () => {
  const page = (colors: ThemeColors) => Object.fromEntries(generateTokens(colors))

  it('deve tratar `surfaces: "vivid"` e `"bold"` como o neutro vivid, e `"soft"` como o tom padrão', () => {
    const vivid = page({ ...GREEN, surfaces: undefined, neutralTint: 'vivid' })
    expect(page({ ...GREEN, surfaces: 'vivid' })).toEqual(vivid)
    expect(page(GREEN)).toEqual(vivid)
    expect(page({ ...GREEN, surfaces: 'soft', neutralTint: false })).toEqual(page({ ...GREEN, surfaces: undefined, neutralTint: true }))
  })

  it.each([false, true, 'vivid'] as const)('com `surfaces: "bold"`, deve deixar a página no `neutralTint: %s` definido', (neutralTint) => {
    expect(page({ ...GREEN, neutralTint })).toEqual(page({ ...GREEN, surfaces: undefined, neutralTint }))
    expect(generateBoldSurface({ ...GREEN, neutralTint })).toEqual(generateBoldSurface(GREEN))
  })

  it('deve levar `surfaces` do tema para as variantes', () => {
    const light = { primary: '#2D900C', background: '#FFFFFF' }
    const { themes } = normalizeColorThemes({ t: { tokens: true, surfaces: 'bold', light, dark: { primary: '#4CAF50', background: '#121212' } } })
    expect(themes['t-light']).toMatchObject({ tokens: true, surfaces: 'bold' })
    expect(themes['t-dark']).toMatchObject({ tokens: true, surfaces: 'bold' })
    expect(normalizeColorThemes({ t: { tokens: true, light } }).themes['t-light']).not.toHaveProperty('surfaces')
    // sem tokens também: o `experimental` pode ligá-los depois
    expect(normalizeColorThemes({ t: { surfaces: 'soft', light } }).themes['t-light']).toMatchObject({ surfaces: 'soft' })
  })
})

describe('generateBoldCss', () => {
  it('deve escrever o escopo com os tokens e pintar o próprio elemento', () => {
    const css = generateThemeVars('verde-light', GREEN)
    expect(css).toContain(':root[data-jade-theme=\'verde-light\'] [data-jade-surface=\'bold\'] {')
    const scope = css.slice(css.indexOf('[data-jade-surface'))
    expect(scope).toContain('color-scheme: dark;')
    expect(scope).toContain('--jade-bg: ')
    expect(scope).toContain('background-color: var(--jade-bg);')
    expect(scope).toContain('color: var(--jade-text);')
  })

  it('deve usar color-scheme light quando o texto é escuro', () => {
    expect(generateBoldCss('amarelo', YELLOW)).toContain('color-scheme: light;')
  })

  it('não deve escrever nada sem bold', () => {
    expect(generateThemeVars('x', { ...GREEN, surfaces: 'vivid' })).not.toContain('data-jade-surface')
    expect(generateBoldCss('x', { ...GREEN_DARK, surfaces: undefined })).toBe('')
  })

  it('deve escrever o AAA do escopo em prefers-contrast: more só com highContrast, e só o que muda', () => {
    expect(generateBoldCss('x', GREEN, 'AA', false)).not.toContain('prefers-contrast')
    const css = generateBoldCss('x', GREEN, 'AA', true)
    expect(css).toContain('@media (prefers-contrast: more)')
    const block = css.slice(css.indexOf('@media'))
    expect(block).toContain('--jade-bg: ')
    expect(block).not.toContain('--jade-text: ')
    expect(generateBoldCss('x', GREEN, 'AAA', true)).not.toContain('prefers-contrast')
  })
})

describe('barra de rolagem no painel', () => {
  const theme = (surfaces: ThemeColors['surfaces'], colors: Record<string, string> = {}) => ({
    colors: { themes: { verde: { ...GREEN, surfaces } } },
    customScrollbar: { enabled: true, colors },
  }) as unknown as ThemeConfig

  it('deve definir no escopo as cores que a barra lê', () => {
    const css = generateBoldCss('verde', GREEN)
    for (const name of ['thumb', 'thumb-hover', 'track', 'border']) expect(css).toContain(`--jade-scrollbar-${name}: var(--jade-`)
  })

  it('deve ler as variáveis do painel com a cor do tema como reserva, quando há um tema bold', () => {
    const css = generateCustomScrollbarCSS(theme('bold'))
    expect(css).toContain('var(--jade-scrollbar-thumb, var(--jade-primary))')
    expect(css).toContain('var(--jade-scrollbar-thumb-hover, var(--jade-secondary))')
    expect(css).toContain('var(--jade-scrollbar-track, var(--jade-background2, var(--jade-bg-subtle)))')
    expect(css).toContain('[data-jade-surface=\'bold\']')
  })

  it('não deve mudar o CSS da barra sem tema bold', () => {
    const css = generateCustomScrollbarCSS(theme('vivid'))
    expect(css).not.toContain('--jade-scrollbar-')
    expect(css).not.toContain('data-jade-surface')
  })

  it('deve manter uma cor literal escolhida pelo projeto também dentro do painel', () => {
    const css = generateCustomScrollbarCSS(theme('bold', { thumb: '#123456' }))
    expect(css).toContain('background: #123456;')
    expect(css).not.toContain('--jade-scrollbar-thumb,')
  })
})

describe('contraste do escopo no build', () => {
  it('não deve avisar de um tema bold que passa', () => {
    expect(findTokenContrastIssues({ a: GREEN, b: YELLOW }, 'AA')).toEqual([])
  })
})

describe('Vuetify com bold', () => {
  const config = (themes: Record<string, ThemeColors>) => ({ enabled: true, defaults: true, defaultColor: 'dark', themes, groups: {}, modes: {} }) as unknown as ColorsConfig

  it('deve registrar um tema `<id>-bold` com o painel como fundo e o botão invertido', () => {
    const themes = buildVuetifyThemes(config({ verde: GREEN }))
    const tokens = tokensOf(GREEN)
    const bold = themes['verde-bold']!
    expect(bold.dark).toBe(true)
    expect(bold.colors.background).toBe(tokens.bg)
    expect(bold.colors.surface).toBe(tokens['bg-subtle'])
    expect(bold.colors['on-surface']).toBe(tokens.text)
    expect(bold.colors.primary).toBe(tokens['fill-primary'])
    expect(bold.colors['on-primary']).toBe(tokens.bg)
    expect(themes.verde!.colors.primary).toBe('#2D900C')
  })

  it('não deve registrar `-bold` para temas sem bold', () => {
    const themes = buildVuetifyThemes(config({ verde: { ...GREEN, surfaces: 'vivid' } }))
    expect(Object.keys(themes)).toEqual(['verde'])
  })
})

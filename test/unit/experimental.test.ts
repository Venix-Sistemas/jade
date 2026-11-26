import { describe, it, expect } from 'vitest'
import { customizeTheme } from '../../src/setup/customize-theme'
import { buildVuetifyThemes } from '../../src/setup/register-vuetify'
import { processTheme } from '../../src/shared/css'
import { collectTokens, findTokenContrastIssues, findTokenOverrideIssues, generateTokens } from '../../src/shared/css/tokens'
import { loadTheme } from '../../src/shared/utils/load'
import { chromaOf } from '../../src/shared/utils/oklab'
import type { ModuleOptions } from '../../src/module'

// Os temas embutidos trazem os tokens por padrão (o modelo antigo segue ao
// lado), e a opção `experimental` estende isso aos temas do projeto, só no build.

const base = loadTheme()
const customize = (options: ModuleOptions = {}) => customizeTheme(base, options)
const tokenIds = (theme: ReturnType<typeof customizeTheme>) =>
  Object.entries(theme.colors.themes).filter(([, colors]) => colors.tokens !== undefined && colors.tokens !== false).map(([id]) => id)

const BUILT_IN = ['light', 'dark', 'carnaval-light', 'carnaval', 'pascoa-light', 'pascoa-dark', 'natal-light', 'natal', 'halloween-light', 'halloween']
const OWN = { light: { primary: '#1D4ED8', background: '#FFFFFF' } }

describe('tokens nos temas embutidos', () => {
  const theme = customize()

  it('deve ligar os tokens nas dez variantes dos cinco temas', () => {
    expect(tokenIds(theme).sort()).toEqual([...BUILT_IN].sort())
  })

  it('deve gerar o CSS dos tokens ao lado das variáveis de sempre', () => {
    const rule = processTheme(theme).match(/:root\[data-jade-theme='dark'\] \{([^}]*)\}/)?.[1]
    expect(rule).toContain('--jade-primary: #FF6B6B')
    expect(rule).toContain('--jade-background2: #191919')
    expect(rule).toContain('--jade-text-primary:')
    expect(rule).toContain('--jade-bg-subtle:')
  })

  it('deve levar os tokens ao runtime config', () => {
    expect(Object.keys(collectTokens(theme.colors.themes)).sort()).toEqual([...BUILT_IN].sort())
  })

  it('não deve gerar nenhum aviso de contraste nos temas embutidos (AA)', () => {
    expect(findTokenContrastIssues(theme.colors.themes, 'AA')).toEqual([])
    expect(findTokenOverrideIssues(theme.colors.themes)).toEqual([])
  })

  it('deve manter o Venix escuro em cinzas puros, sem o tom do vermelho', () => {
    const tokens = Object.fromEntries(generateTokens(theme.colors.themes.dark!))
    expect(chromaOf(tokens['bg-subtle']!)).toBeLessThan(0.002)
    expect(chromaOf(tokens['bg-muted']!)).toBeLessThan(0.002)
  })

  it('deve dar o tom do vermelho às superfícies do Venix claro', () => {
    const tokens = Object.fromEntries(generateTokens(theme.colors.themes.light!))
    expect(chromaOf(tokens['bg-subtle']!)).toBeGreaterThan(0.01)
    expect(chromaOf(tokens['bg-muted']!)).toBeGreaterThan(0.01)
  })

  it('deve dar o escopo bold às variantes claras e não às escuras', () => {
    const scopes = [...processTheme(theme).matchAll(/:root\[data-jade-theme='([^']+)'\] \[data-jade-surface='bold'\] \{/g)].map(match => match[1])
    expect(scopes.sort()).toEqual(BUILT_IN.filter(id => theme.colors.themes[id]!.dark === false).sort())
  })

  it('não deve alterar o tema base nem a cópia de outra chamada', () => {
    customize({ experimental: true, color: { themes: { own: OWN } } })
    expect(customize().colors.themes['own-light']).toBeUndefined()
  })
})

describe('tokens padrão × Vuetify', () => {
  it('deve marcar as variantes embutidas como padrão do módulo', () => {
    expect([...customize().colors.defaultTokens ?? []].sort()).toEqual([...BUILT_IN].sort())
  })

  it('não deve dar ao Vuetify as superfícies dos tokens padrão, só o texto sobre as cores', () => {
    const vuetify = buildVuetifyThemes(customize().colors)
    expect(vuetify.light?.colors['on-primary']).toBe('#FFFFFF')
    expect(vuetify.dark?.colors['on-primary']).toBe('#000000')
    expect(vuetify.dark?.colors['on-surface']).toBeUndefined()
    // (os temas `-bold` do escopo são novos: não mudam nenhum dos que já existiam)
    const withoutBold = Object.fromEntries(Object.entries(vuetify).filter(([name]) => !name.endsWith('-bold')))
    expect(withoutBold).toEqual(buildVuetifyThemes(loadThemeWithoutTokens().colors))
    expect(Object.keys(vuetify).filter(name => name.endsWith('-bold')).length).toBeGreaterThan(0)
  })

  it('deve dar ao Vuetify as cores dos tokens que o projeto ligou no próprio tema', () => {
    const theme = customize({ color: { themes: { own: { ...OWN, tokens: true } } } })
    expect(theme.colors.defaultTokens).not.toContain('own-light')
    expect(buildVuetifyThemes(theme.colors)['own-light']?.colors['on-surface']).toBeDefined()
  })

  it('deve dar ao Vuetify as cores dos tokens de um tema embutido em que o projeto mexeu em `tokens`', () => {
    const theme = customize({ color: { themes: { natal: { tokens: { 'bg-subtle': 'neutral-3' } } } } })
    expect(theme.colors.defaultTokens).not.toContain('natal-light')
    expect(theme.colors.defaultTokens).not.toContain('natal')
    expect(buildVuetifyThemes(theme.colors).natal?.colors['on-surface']).toBeDefined()
    expect(buildVuetifyThemes(theme.colors)['halloween-light']?.colors['on-surface']).toBeUndefined()
  })

  it('deixa de fora um tema embutido com `tokens: false`', () => {
    const theme = customize({ color: { themes: { natal: { tokens: false } } } })
    expect(theme.colors.themes.natal?.tokens).toBe(false)
    expect(processTheme(theme)).not.toMatch(/data-jade-theme='natal'\] \{[^}]*\/\* Semantic tokens/)
  })

  it('não marca nada como padrão com as cores desligadas', () => {
    expect(customize({ color: false }).colors.defaultTokens).toBeUndefined()
  })
})

describe('experimental', () => {
  it('não liga os tokens num tema do projeto por padrão', () => {
    const theme = customize({ color: { themes: { own: OWN } } })
    expect(theme.colors.themes['own-light']?.tokens).toBeUndefined()
  })

  it.each([true, { enabled: true }])('%j liga os tokens nos temas do projeto', (experimental) => {
    const theme = customize({ experimental, color: { themes: { own: OWN } } })
    expect(theme.colors.themes['own-light']?.tokens).toBe(true)
  })

  it.each([false, { enabled: false }])('%j mantém o tema do projeto sem tokens', (experimental) => {
    expect(customize({ experimental, color: { themes: { own: OWN } } }).colors.themes['own-light']?.tokens).toBeUndefined()
  })

  it('respeita o `tokens` do próprio tema: `false` fica de fora e `true` continua valendo', () => {
    const theme = customize({
      experimental: true,
      color: { themes: { fora: { ...OWN, tokens: false }, proprio: { ...OWN, tokens: true }, sem: OWN } },
    })
    expect(theme.colors.themes['fora-light']?.tokens).toBe(false)
    expect(theme.colors.themes['proprio-light']?.tokens).toBe(true)
    expect(theme.colors.themes['sem-light']?.tokens).toBe(true)
  })

  it('pede os tokens em todo lugar: nada é "padrão do módulo", e o Vuetify recebe as cores de todos', () => {
    const theme = customize({ experimental: true })
    expect(theme.colors.defaultTokens).toBeUndefined()
    expect(buildVuetifyThemes(theme.colors).light?.colors['on-surface']).toBeDefined()
  })

  it('não faz nada com as cores desligadas', () => {
    expect(tokenIds(customize({ experimental: true, color: false }))).toEqual(tokenIds(customize({ color: false })))
  })
})

/** Os temas embutidos como eram, sem `tokens` (para comparar o que o Vuetify recebe). */
function loadThemeWithoutTokens() {
  const theme = structuredClone(customize())
  for (const colors of Object.values(theme.colors.themes)) delete colors.tokens
  return theme
}

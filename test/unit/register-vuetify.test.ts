import { describe, it, expect } from 'vitest'
import { buildVuetifyThemes } from '../../src/setup/register-vuetify'
import { generateTokens } from '../../src/shared/css/tokens'
import { contrastRatio } from '../../src/shared/utils/contrast'
import type { ColorsConfig, ThemeColors } from '../../src/shared/types'

const colors = (themes: Record<string, ThemeColors>, contrast?: ColorsConfig['contrast']): ColorsConfig => ({
  enabled: true,
  defaults: true,
  defaultColor: 'dark',
  contrast,
  themes,
  groups: {},
  modes: {},
})

const FLAT: ThemeColors = { dark: false, primary: '#FF0000', secondary: '#FF8800', background: '#FAFAFA', background2: '#EEEEEE' }
const TOKENS: ThemeColors = { dark: false, tokens: true, primary: '#FF0000', secondary: '#FF8800', background: '#FAFAFA' }

describe('buildVuetifyThemes', () => {
  it('deve manter as cores dos temas sem tokens, com o texto legível sobre elas', () => {
    expect(buildVuetifyThemes(colors({ flat: FLAT }))).toEqual({
      flat: {
        dark: false,
        colors: { 'primary': '#FF0000', 'secondary': '#FF8800', 'background': '#FAFAFA', 'background2': '#EEEEEE', 'surface': '#EEEEEE', 'inverse': '#000000', 'on-primary': '#000000', 'on-secondary': '#000000' },
      },
    })
  })

  it('deve dar ao Vuetify o on-primary e o on-secondary dos tokens (preto sobre o vermelho do Venix)', () => {
    const theme = buildVuetifyThemes(colors({ t: TOKENS })).t!
    expect(theme.colors['on-primary']).toBe('#000000')
    expect(theme.colors['on-secondary']).toBe('#000000')
    expect(contrastRatio(theme.colors['on-primary']!, theme.colors.primary!)).toBeGreaterThan(5)
  })

  it.each([['com', TOKENS], ['sem', FLAT]] as const)('deve dar o texto legível sobre todas as cores, num tema %s tokens', (_label, base) => {
    const full: ThemeColors = { ...base, accent: '#82B1FF', error: '#B00020', info: '#2196F3', success: '#4CAF50', warning: '#FCCF3D' }
    const theme = buildVuetifyThemes(colors({ t: full })).t!
    for (const role of ['primary', 'secondary', 'accent', 'error', 'info', 'success', 'warning'] as const) {
      expect(theme.colors[role], role).toBe(full[role])
      expect(contrastRatio(theme.colors[`on-${role}`]!, theme.colors[role]!), role).toBeGreaterThanOrEqual(4.5)
    }
    // O mesmo que os tokens `on-<cor>`
    const tokens = Object.fromEntries(generateTokens({ ...full, tokens: true }))
    expect(theme.colors['on-error']).toBe(tokens['on-error'])
    expect(theme.colors['on-error']).toBe('#FFFFFF')
  })

  it('não deve dar ao Vuetify o on-secondary de um secondary derivado: não há cor secondary para ele', () => {
    const theme = buildVuetifyThemes(colors({ t: { dark: false, tokens: true, primary: '#FF0000', background: '#FAFAFA' } })).t!
    expect(theme.colors['on-primary']).toBe('#000000')
    expect(theme.colors.secondary).toBeUndefined()
    expect(theme.colors['on-secondary']).toBeUndefined()
  })

  it('deve usar bg-subtle como surface e o texto principal como on-surface e on-background', () => {
    const theme = buildVuetifyThemes(colors({ t: TOKENS })).t!
    const tokens = Object.fromEntries(generateTokens(TOKENS))
    expect(theme.colors.surface).toBe(tokens['bg-subtle'])
    expect(theme.colors['on-surface']).toBe(tokens.text)
    expect(theme.colors['on-background']).toBe(tokens.text)
    expect(theme.colors.background).toBe('#FAFAFA')
  })

  it('deve respeitar o background2 de um tema com tokens', () => {
    const theme = buildVuetifyThemes(colors({ t: { ...TOKENS, background2: '#EEEEEE' } })).t!
    expect(theme.colors.surface).toBe('#EEEEEE')
  })

  it('deve tratar `color.contrast: false` como AA (só o aviso é pulado, não a geração)', () => {
    expect(buildVuetifyThemes(colors({ t: TOKENS }, false))).toEqual(buildVuetifyThemes(colors({ t: TOKENS }, 'AA')))
    expect(buildVuetifyThemes(colors({ t: TOKENS }))).toEqual(buildVuetifyThemes(colors({ t: TOKENS }, 'AA')))
  })

  it('deve aceitar o nível AAA', () => {
    expect(buildVuetifyThemes(colors({ t: TOKENS }, 'AAA')).t!.colors['on-primary']).toBe('#000000')
  })

  it('deve pular o on-<papel> de um papel que o tema não define', () => {
    const theme = buildVuetifyThemes(colors({ t: { dark: true, tokens: true, primary: '#FF6B6B', background: '#0C0C0C' } })).t!
    expect(theme.colors['on-primary']).toBe('#000000')
    expect(theme.colors).not.toHaveProperty('on-secondary')
    expect(theme.dark).toBe(true)
  })
})

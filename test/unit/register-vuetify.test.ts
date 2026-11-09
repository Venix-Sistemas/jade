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
  it('deve manter os temas sem tokens como estavam', () => {
    expect(buildVuetifyThemes(colors({ flat: FLAT }))).toEqual({
      flat: {
        dark: false,
        colors: { primary: '#FF0000', secondary: '#FF8800', background: '#FAFAFA', background2: '#EEEEEE', surface: '#EEEEEE', inverse: '#000000' },
      },
    })
  })

  it('deve dar ao Vuetify o on-primary e o on-secondary dos tokens (preto sobre o vermelho do Venix)', () => {
    const theme = buildVuetifyThemes(colors({ t: TOKENS })).t!
    expect(theme.colors['on-primary']).toBe('#000000')
    expect(theme.colors['on-secondary']).toBe('#000000')
    expect(contrastRatio(theme.colors['on-primary']!, theme.colors.primary!)).toBeGreaterThan(5)
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

import { describe, it, expect } from 'vitest'
import { processTheme } from '../../src/shared/css'
import { generateThemeVars } from '../../src/shared/css/colors'
import { loadTheme } from '../../src/shared/utils/load'

describe('processTheme', () => {
  const theme = loadTheme()

  it('deve gerar CSS com cores', () => {
    const css = processTheme(theme)
    expect(css).toContain('--color-primary')
    expect(css).toContain(':root[data-theme=\'dark\']')
  })

  it('não deve gerar CSS de cores se desabilitado', () => {
    // Usa um tema sem cores habilitadas
    const themeWithoutColors = {
      ...theme,
      colors: {
        ...theme.colors,
        enabled: false,
      },
    }

    const css = processTheme(themeWithoutColors)

    // Só a definição das variáveis: a scrollbar ainda as usa (`var(--color-primary)`)
    expect(css).not.toContain('--color-primary:')
    expect(css).not.toContain(':root[data-theme=\'dark\']')
  })

  it('deve gerar CSS de scrollbar se habilitado', () => {
    const css = processTheme(theme)
    expect(css).toContain('::-webkit-scrollbar')
  })

  it('deve gerar CSS de transição de tema junto com as cores', () => {
    const css = processTheme(theme)
    expect(css).toContain('::view-transition-old(root)')
    expect(css).toContain('::view-transition-new(root)')
  })

  it('deve desligar pointer-events em toda a árvore de pseudo-elementos da transição, para não travar cursor/hover do conteúdo real', () => {
    const css = processTheme(theme)
    expect(css).toMatch(/::view-transition,\n::view-transition-group\(\*\),\n::view-transition-image-pair\(\*\),\n::view-transition-old\(\*\),\n::view-transition-new\(\*\)\s*\{[^}]*pointer-events:\s*none\s*!important/)
  })
})

describe('generateThemeVars', () => {
  it('deve ignorar o tema system', () => {
    const css = generateThemeVars('system', {
      translations: { 'pt-BR': 'Sistema' },
      icon: 'i-line-md:light-dark-loop',
    })
    expect(css).not.toContain('--color-primary')
  })

  it('deve gerar cores válidas', () => {
    const css = generateThemeVars('dark', {
      dark: true,
      primary: '#FF6B6B',
      secondary: '#FFB96A',
    })
    expect(css).toContain('--color-primary: #FF6B6B')
    expect(css).toContain('--color-secondary: #FFB96A')
  })
})

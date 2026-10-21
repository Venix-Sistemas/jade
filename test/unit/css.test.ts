import { describe, it, expect } from 'vitest'
import { processTheme } from '../../src/shared/css'
import { generateThemeVars } from '../../src/shared/css/colors'
import { generateCustomCursorCSS } from '../../src/shared/css/cursor'
import { generateCursorSVG } from '../../src/shared/css/cursor-svg'
import { loadTheme } from '../../src/shared/utils/load'
import { customizeTheme } from '../../src/setup/customize-theme'
import type { CursorConfig } from '../../src/shared/types'

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

  it('deve aplicar scrollbar-color/scrollbar-width só sem ::-webkit-scrollbar, que o Chromium desliga quando eles existem', () => {
    const css = processTheme(theme)
    expect(css).toMatch(/@supports not selector\(::-webkit-scrollbar\) \{\n {2}html \{\n {4}scrollbar-width: [^;]+;\n {4}scrollbar-color: [^;]+;\n {2}\}\n\}/)
    expect(css.replace(/@supports not selector\(::-webkit-scrollbar\) \{[\s\S]*?\n\}\n/, '')).not.toContain('scrollbar-color')
  })

  it('deve pintar o canto entre as duas scrollbars com a cor da trilha', () => {
    expect(processTheme(theme)).toContain('::-webkit-scrollbar-corner {\n  background: var(--color-background2);\n}')
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

describe('generateCustomCursorCSS', () => {
  const base = loadTheme()
  const theme = { ...base, customCursor: { ...base.customCursor, enabled: true } }
  const withCursor = (cursor: Partial<CursorConfig>) => generateCustomCursorCSS({ ...theme, customCursor: { ...theme.customCursor, ...cursor } })
  const block = (css: string, id: string) => css.match(new RegExp(`:root\\[data-theme='${id}'\\] \\{([^}]*)\\}`))?.[1]

  it('deve desenhar os cursores na cor primary de cada variante de tema', () => {
    const css = generateCustomCursorCSS(theme)
    const halloween = block(css, 'halloween') ?? ''
    for (const type of ['default', 'pointer', 'text']) {
      expect(halloween).toMatch(new RegExp(`--cursor-${type}: url\\("data:image/svg\\+xml,[^"]+"\\) \\d+ \\d+, url\\('[^']+'\\)`))
    }
    expect(decodeURIComponent(halloween)).toContain('#FF8A3D')
    // `#` e `<`/`>` cortariam ou invalidariam a URI no `url()`
    for (const [, uri] of halloween.matchAll(/url\("data:image\/svg\+xml,([^"]+)"\)/g)) {
      expect(uri).not.toMatch(/[#<>]/)
    }
    expect(css).not.toContain('data-theme=\'system\'')
  })

  it('deve usar as imagens como valor padrão, para quando o tema não tem cursor desenhado', () => {
    const css = generateCustomCursorCSS(theme)
    expect(css).toMatch(/:root \{\n {2}--cursor-default: url\('\/images\/ui\/cursor\/cursor\.png'\) 4 0, default;/)
    expect(css).toContain('cursor: var(--cursor-default);')
    expect(css).toContain('cursor: var(--cursor-pointer) !important;')
    expect(css).toContain('cursor: var(--cursor-text) !important;')
  })

  it('deve manter as imagens no tema Venix Sistemas, nas duas variantes', () => {
    const css = generateCustomCursorCSS(theme)
    expect(block(css, 'dark')).toBeUndefined()
    expect(block(css, 'light')).toBeUndefined()
  })

  it('não deve desenhar cursores com themed: false', () => {
    const css = withCursor({ themed: false })
    expect(css).not.toContain('data:image/svg+xml')
    expect(css).toContain('--cursor-default: url(\'/images/ui/cursor/cursor.png\') 4 0, default;')
  })

  it('deve aceitar imagens próprias por tema, desenhando os cursores que ficaram de fora', () => {
    const css = withCursor({ themeCursors: { halloween: { pointer: { path: '/abobora.png', hotspot: '8 0' } } } })
    expect(block(css, 'halloween')).toContain('--cursor-pointer: url(\'/abobora.png\') 8 0, pointer;')
    expect(block(css, 'halloween')).toMatch(/--cursor-default: url\("data:image\/svg\+xml,/)
    expect(block(css, 'halloween-light')).toContain('--cursor-pointer: url(\'/abobora.png\') 8 0, pointer;')
  })

  it('deve usar os cursores do sistema operacional com \'none\'', () => {
    const css = withCursor({ themeCursors: { natal: 'none' } })
    expect(block(css, 'natal')).toBe('\n  --cursor-default: default;\n  --cursor-pointer: pointer;\n  --cursor-text: text;\n')
  })

  it('deve priorizar o id da variante sobre o nome do tema', () => {
    const css = withCursor({ themeCursors: { 'carnaval': 'none', 'carnaval-light': 'themed' } })
    expect(block(css, 'carnaval')).toContain('--cursor-pointer: pointer;')
    expect(block(css, 'carnaval-light')).toMatch(/--cursor-pointer: url\("data:image\/svg\+xml,/)
  })

  it('deve desenhar cursores mesmo sem imagens, caindo no cursor do sistema', () => {
    const css = withCursor({ defaultCursors: {} })
    expect(css).toContain('--cursor-pointer: pointer;')
    expect(css).toMatch(/--cursor-pointer: url\("data:image\/svg\+xml,[^"]+"\) \d+ \d+, pointer;/)
  })

  it('não deve gerar nada sem imagens e sem cores', () => {
    const css = generateCustomCursorCSS({
      ...theme,
      customCursor: { ...theme.customCursor, defaultCursors: {} },
      colors: { ...theme.colors, enabled: false },
    })
    expect(css).toBe('')
  })
})

describe('generateCursorSVG', () => {
  it('deve mostrar o cursor em 28×28, com o hotspot na mesma escala do desenho', () => {
    const { url, hotspot } = generateCursorSVG('pointer', '#FF0000')
    expect(url).toContain('width=\'28\' height=\'28\' viewBox=\'0 0 32 32\'')
    expect(hotspot).toBe('10 1')
    expect(generateCursorSVG('text', '#FF0000').hotspot).toBe('14 14')
  })
})

describe('customizeTheme (cursor)', () => {
  it('deve juntar os cursores por tema do projeto com os do módulo', () => {
    const theme = customizeTheme(loadTheme(), { cursor: { themeCursors: { halloween: 'none' } } })
    expect(theme.customCursor.themeCursors).toEqual({ ...loadTheme().customCursor.themeCursors, halloween: 'none' })
  })

  it('deve deixar o projeto trocar o cursor do tema Venix Sistemas', () => {
    const theme = customizeTheme(loadTheme(), { cursor: { themeCursors: { venix: 'themed' } } })
    expect(theme.customCursor.themeCursors?.venix).toBe('themed')
  })

  it('deve aceitar o nome antigo `cursors` como defaultCursors', () => {
    const cursors = { pointer: { path: '/mao.png', hotspot: '8 0' } }
    const theme = customizeTheme(loadTheme(), { cursor: { cursors } })
    expect(theme.customCursor.defaultCursors).toEqual(cursors)
    expect(theme.customCursor.cursors).toBeUndefined()
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

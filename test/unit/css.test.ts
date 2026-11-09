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
  const overlayTheme = { ...theme, customScrollbar: { ...theme.customScrollbar, overlay: true } }

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
    expect(css).toMatch(/@supports not selector\(::-webkit-scrollbar\) \{\n {2}html:not\(\[data-venix-scrollbar='off'\]\) \{\n {4}scrollbar-width: [^;]+;\n {4}scrollbar-color: [^;]+;\n {2}\}\n\}/)
    expect(css.replace(/@supports not selector\(::-webkit-scrollbar\) \{[\s\S]*?\n\}\n/, '')).not.toContain('scrollbar-color')
  })

  it('deve aplicar a scrollbar só enquanto o visitante não a desligou, na da página e nas dos elementos', () => {
    const css = processTheme(theme)
    const selectors = [...css.matchAll(/^(?!@)([^\n{]*::-webkit-scrollbar[^{]*)\{/gm)].map(match => match[1]!)
    expect(selectors).toHaveLength(5)
    for (const selector of selectors) {
      const [page, elements] = selector.trim().split(',\n')
      expect(page).toMatch(/^html:not\(\[data-venix-scrollbar='off'\]\)::-webkit-scrollbar/)
      expect(elements).toMatch(/^html:not\(\[data-venix-scrollbar='off'\]\) ::-webkit-scrollbar/)
    }
  })

  it('deve deixar só as fontes padrão quando o visitante desliga a fonte personalizada', () => {
    const off = processTheme(theme).match(/:root\[data-venix-font='off'\] \{([^}]*)\}/)?.[1]
    const defaults = theme.typography.defaultFonts
    expect(off).toBe(`\n  --font-family-base: ${defaults};\n  --v-font-body: ${defaults};\n  --v-font-heading: ${defaults};\n`)
  })

  it('deve usar initial sem fontes padrão, para o var() cair no fallback do site', () => {
    const css = processTheme({ ...theme, typography: { ...theme.typography, defaultFonts: '' } })
    expect(css).toContain(':root[data-venix-font=\'off\'] {\n  --font-family-base: initial;')
  })

  it('não deve gerar a regra de fonte desligada sem fontes personalizadas', () => {
    const css = processTheme({ ...theme, typography: { ...theme.typography, customFonts: [] } })
    expect(css).not.toContain('data-venix-font')
  })

  it('deve qualificar as regras da scrollbar com html, não :root, para o :hover da alça funcionar no Chromium', () => {
    const css = processTheme(theme)
    expect(css).toContain('html:not([data-venix-scrollbar=\'off\'])::-webkit-scrollbar-thumb:hover,\nhtml:not([data-venix-scrollbar=\'off\']) ::-webkit-scrollbar-thumb:hover {\n  background: var(--color-secondary);')
    expect(css).not.toContain(':root:not([data-venix-scrollbar')
  })

  it('deve mostrar a mão do cursor personalizado sobre a alça da scrollbar em CSS', () => {
    expect(processTheme(theme)).toMatch(/::-webkit-scrollbar-thumb \{[^}]*cursor: var\(--cursor-pointer, default\);/)
  })

  it('deve gerar o tema do OverlayScrollbars com as mesmas opções da scrollbar', () => {
    const css = processTheme(overlayTheme)
    const rule = css.match(/\.os-theme-jade \{([^}]*)\}/)?.[1] ?? ''
    expect(rule).toContain('--os-size: 10px;')
    expect(rule).toContain('--os-handle-border-radius: 8px;')
    expect(rule).toContain('--os-handle-bg: var(--color-primary);')
    expect(rule).toContain('--os-handle-bg-hover: var(--color-secondary);')
    expect(rule).toContain('--os-track-bg: var(--color-background2);')
  })

  it('deve mudar a cor da alça ao passar o mouse em qualquer ponto da scrollbar, não só sobre a alça', () => {
    expect(processTheme(overlayTheme)).toContain('.os-theme-jade.os-scrollbar:hover {\n  --os-handle-bg: var(--color-secondary);\n}')
  })

  it('deve esconder a scrollbar nativa da página até o OverlayScrollbars assumir, só com JavaScript e com a scrollbar ligada', () => {
    expect(processTheme(overlayTheme)).toContain('@media (scripting: enabled) {\n  html:not([data-venix-scrollbar=\'off\']):not([data-overlayscrollbars]) {\n    scrollbar-width: none;')
  })

  it('deve anular o deslocamento do <html> que o Vuetify aplica atrás de um diálogo', () => {
    expect(processTheme(overlayTheme)).toContain('html[data-overlayscrollbars].v-overlay-scroll-blocked {\n  top: auto;\n  left: auto;\n}')
  })

  it('não deve gerar nada do OverlayScrollbars sem overlay: true (o padrão)', () => {
    const css = processTheme(theme)
    expect(css).not.toContain('os-theme-jade')
    expect(css).not.toContain('data-overlayscrollbars')
    expect(css).toContain('::-webkit-scrollbar')
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
  // Os seletores e o corpo da seção `/* <n>. … */`
  const section = (css: string, n: string) => {
    const [, selectors = '', body = ''] = css.match(new RegExp(`/\\* ${n}\\. [^\\n]*\\n([^{]*)\\{([^}]*)\\}`)) ?? []
    return { selectors: selectors.split(/,\s*/).map(s => s.trim()), body }
  }
  // Especificidade (ids, classes/atributos/pseudo-classes, elementos), contando o que está dentro de `:not()`
  const specificity = (selector: string): number => {
    const flat = selector.replace(/:not\(([^)]*)\)/g, ' $1')
    const ids = flat.match(/#[\w-]+/g)?.length ?? 0
    const classes = flat.match(/\.[\w-]+|\[[^\]]+\]|:[\w-]+/g)?.length ?? 0
    const elements = flat.replace(/\[[^\]]+\]|[.#:][\w-]+/g, ' ').match(/(^|[\s>+~])[a-z][\w-]*/gi)?.length ?? 0
    return ids * 10000 + classes * 100 + elements
  }

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

  it('deve mostrar a mão só no que é clicável', () => {
    const css = generateCustomCursorCSS(theme)
    const pointer = [...section(css, '2').selectors, ...section(css, '2b').selectors]
    expect(pointer).toContain('a[href]')
    expect(pointer).toContain('a[href] *')
    expect(pointer).toContain('.v-icon--clickable')
    expect(pointer).toContain('.v-list-item--link')
    expect(pointer).toContain('.v-chip--link')
    // A scrollbar do OverlayScrollbars é um elemento da página: arrastável e clicável
    expect(pointer).toContain('.os-scrollbar *')
    for (const decoration of ['a', '.v-icon', '.v-list-item', '.v-chip']) expect(pointer).not.toContain(decoration)
  })

  it('deve dar a variável aos elementos em que o Vuetify fixa `cursor: pointer`, sem !important', () => {
    const css = generateCustomCursorCSS(theme)
    const { selectors, body } = section(css, '2b')
    expect(body).toBe('\n  cursor: var(--cursor-pointer);\n')
    // Um de cada grupo: tabela, cartão, chip, campos, seleção, slider, navegação, ativadores, pickers, calendário, labs
    for (const selector of [
      '.v-data-table__tr--clickable', '.v-data-table__th--sortable',
      '.v-card--hover', '.v-chip__close', '.v-icon-btn',
      '.v-field__clearable', '.v-select .v-field.v-field', '.v-label--clickable',
      '.v-selection-control__input input', '.v-switch__track', '.v-slider-thumb__surface',
      '.v-slide-group__next', '.v-rating__item label', '.v-avatar-group--hoverable .v-avatar',
      '[aria-controls]', '.v-date-picker-header--clickable .v-date-picker-header__content',
      '.v-color-picker-swatches__color', '.v-file-upload-dropzone input[type=file]',
      '.v-calendar .v-event', '.v-calendar-weekly__day-label', '.v-heatmap--hover .v-heatmap__cell',
      '.v-video:not(.v-video--error) .v-video__content',
    ]) expect(selectors).toContain(selector)
    // O campo de texto em volta do input, e o que o Vuetify deixa no `default`
    expect(section(css, '3b').selectors).toContain('.v-text-field .v-field')
    expect(section(css, '3b').body).toBe('\n  cursor: var(--cursor-text);\n')
    expect(section(css, '1c').selectors).toContain('.v-text-field__prefix')
    expect(section(css, '1c').body).toBe('\n  cursor: var(--cursor-default);\n')
  })

  it('deve deixar uma regra mais específica da tela trocar o cursor de uma linha clicável', () => {
    const css = generateCustomCursorCSS(theme)
    const { selectors, body } = section(css, '2b')
    // Sem !important, numa folha sem layer: perde para qualquer regra sem layer mais específica
    expect(body).not.toContain('!important')
    expect(specificity('.minha-tabela .v-data-table__tr--clickable')).toBeGreaterThan(specificity(selectors.find(s => s === '.v-data-table__tr--clickable')!))
    // E o `select` do Vuetify continua acima do campo de texto que ele também é
    expect(specificity('.v-select .v-field.v-field')).toBeGreaterThan(specificity('.v-text-field .v-field'))
  })

  it('deve voltar ao cursor do sistema nos elementos do Vuetify quando o visitante desliga o cursor', () => {
    const css = generateCustomCursorCSS(theme)
    const off = css.match(/:root\[data-venix-cursor='off'\] \{([^}]*)\}/)?.[1]
    expect(off).toContain('--cursor-pointer: pointer;')
    // Lido da variável, não fixo: segue o `off`
    for (const n of ['1c', '2b', '3b', '4']) expect(section(css, n).body).toMatch(/^\n {2}cursor: var\(--cursor-(default|pointer|text)\);\n$/)
  })

  it('deve levar as classes utilitárias de cursor às variáveis, acima das regras de componente', () => {
    const css = generateCustomCursorCSS(theme)
    for (const type of ['default', 'pointer', 'text']) {
      expect(css).toContain(`html .cursor-${type} {\n  cursor: var(--cursor-${type});\n}`)
    }
    // `<tr class="cursor-default">` numa tabela com @click:row
    expect(specificity('html .cursor-default')).toBeGreaterThan(specificity('.v-data-table__tr--clickable'))
    // E abaixo das de desabilitado, que vêm depois
    expect(css.indexOf('/* 5.')).toBeGreaterThan(css.indexOf('html .cursor-pointer'))
  })

  it('deve ficar fora de qualquer @layer, para vencer o Vuetify sem !important', () => {
    expect(processTheme(theme)).not.toContain('@layer')
  })

  it('deve usar o cursor de texto também em input sem type e em qualquer contenteditable', () => {
    const css = generateCustomCursorCSS(theme)
    const text = css.match(/\/\* 3\. [^\n]*\n([^{]*)\{/)?.[1] ?? ''
    expect(text).toContain('input:not([type])')
    expect(text).toContain('[contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"]')
  })

  it('deve fazer a regra de desabilitado vencer a de texto e a da mão, inclusive nos filhos', () => {
    const css = generateCustomCursorCSS(theme)
    const disabled = css.match(/\/\* 5\. [^\n]*\n([^{]*)\{/)?.[1] ?? ''
    // `html [disabled]` (0,1,1) empata com `input[type="text"]` e `a[href] *` e vem depois
    expect(disabled).toContain('html :disabled, html :disabled *')
    expect(disabled).toContain('html [disabled], html [disabled] *')
    expect(disabled).toContain('html [aria-disabled="true"]')
    expect(css.indexOf('/* 5.')).toBeGreaterThan(css.indexOf('/* 3.'))
  })

  it('deve manter as imagens no tema Venix, nas duas variantes', () => {
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

  it('deve voltar aos cursores do sistema quando o visitante desliga o cursor, depois dos blocos de tema', () => {
    const css = generateCustomCursorCSS(theme)
    const off = css.match(/:root\[data-venix-cursor='off'\] \{([^}]*)\}/)?.[1]
    expect(off).toBe('\n  --cursor-default: default;\n  --cursor-pointer: pointer;\n  --cursor-text: text;\n')
    // Mesma especificidade de `:root[data-theme='…']`: vence por vir depois
    expect(css.indexOf('data-venix-cursor')).toBeGreaterThan(css.lastIndexOf(':root[data-theme='))
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

  it('deve deixar o projeto trocar o cursor do tema Venix', () => {
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

describe('generateThemeVars com tokens', () => {
  const flat = { dark: false, primary: '#FF0000', secondary: '#FF8800', background: '#FAFAFA' }

  it('deve manter o CSS idêntico, byte a byte, para temas sem `tokens`', () => {
    const expected = `\n/* ============================================ */\n`
      + `/* Colors - Light Theme                     */\n`
      + `/* ============================================ */\n\n`
      + `:root[data-theme='light'] {\n`
      + `  color-scheme: light;\n`
      + `  --color-scheme: #FFFFFF;\n`
      + `  --color-inverse: #000000;\n`
      + `  --color-primary: #FF0000;\n`
      + `  --color-secondary: #FF8800;\n`
      + `  --color-background: #FAFAFA;\n`
      + `}\n`
    expect(generateThemeVars('light', flat)).toBe(expected)
    expect(generateThemeVars('light', { ...flat, tokens: false })).toBe(expected)
  })

  it('deve manter o CSS de todos os temas embutidos sem nenhum token', () => {
    const css = processTheme(loadTheme())
    expect(css).not.toContain('Semantic tokens')
    expect(css).not.toContain('--color-text-primary')
    expect(css).not.toContain('--color-fill-primary')
  })

  it('deve acrescentar os tokens ao bloco do tema, depois das variáveis de sempre', () => {
    const css = generateThemeVars('venixTokens-light', { ...flat, tokens: true })
    const block = css.slice(css.indexOf(':root'))
    expect(block.startsWith(`:root[data-theme='venixTokens-light'] {`)).toBe(true)
    expect(block.endsWith('}\n')).toBe(true)
    expect(block.indexOf('--color-primary: #FF0000;')).toBeLessThan(block.indexOf('/* Semantic tokens */'))
    expect(block.indexOf('/* Semantic tokens */')).toBeLessThan(block.indexOf('--color-bg: #FAFAFA;'))
    expect(block).toContain('--color-fill-primary: #FF0000;')
    expect(block).toContain('--color-on-primary: #000000;')
    expect(block).toContain('--color-text-secondary:')
    expect(block.match(/:root\[/g)).toHaveLength(1)
  })

  it('deve manter as variáveis antigas do tema com tokens iguais às de um tema sem tokens', () => {
    const withTokens = generateThemeVars('x', { ...flat, tokens: true })
    const without = generateThemeVars('x', flat)
    const head = without.slice(0, without.lastIndexOf('}'))
    expect(withTokens.startsWith(head)).toBe(true)
  })

  it('deve gerar os tokens também no escuro', () => {
    const css = generateThemeVars('d', { dark: true, tokens: true, primary: '#FF6B6B', background: '#0C0C0C' })
    expect(css).toContain('color-scheme: dark;')
    expect(css).toContain('--color-bg: #0C0C0C;')
    expect(css).toContain('--color-fill-primary: #FF6B6B;')
  })
})

describe('color.contrast', () => {
  const colors = { dark: false, tokens: true, primary: '#FF0000', background: '#FAFAFA' }

  it('deve gerar os tokens em AA por padrão e com `false`', () => {
    const base = generateThemeVars('x', colors)
    expect(generateThemeVars('x', colors, 'AA')).toBe(base)
  })

  it('deve gerar tokens mais fortes em AAA', () => {
    expect(generateThemeVars('x', colors, 'AAA')).not.toBe(generateThemeVars('x', colors, 'AA'))
  })

  it('deve levar `color.contrast` ao CSS gerado', () => {
    const config = (contrast: 'AA' | 'AAA' | false) => customizeTheme(loadTheme(), {
      color: { contrast, themes: { t: { tokens: true, light: colors, dark: { primary: '#FF6B6B', background: '#0C0C0C' } } } },
    })
    expect(config('AAA').colors.contrast).toBe('AAA')
    expect(config(false).colors.contrast).toBe(false)
    expect(processTheme(config('AAA'))).not.toBe(processTheme(config('AA')))
    expect(processTheme(config(false))).toBe(processTheme(config('AA')))
  })

  it('não deve definir `contrast` quando a opção não é usada', () => {
    expect(customizeTheme(loadTheme(), {}).colors.contrast).toBeUndefined()
    expect(customizeTheme(loadTheme(), { color: { themes: {} } }).colors.contrast).toBeUndefined()
  })
})

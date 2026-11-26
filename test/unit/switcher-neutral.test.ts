import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { contrastRatio } from '../../src/shared/utils/contrast'

// REGRA DO PROJETO: o `<VenixThemeSwitcher>` não tem cor. É por ele que o
// visitante sai de um tema ilegível, então só segue o modo claro/escuro, em
// preto, branco e cinzas, com texto em AA. Se um destes testes falhar, o
// estilo novo está errado, não o teste.

const source = readFileSync(new URL('../../src/runtime/components/VenixThemeSwitcher.vue', import.meta.url), 'utf-8')
const style = source.slice(source.indexOf('<style'), source.lastIndexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g, '')

const declarations = [...style.matchAll(/(?<=[{;]\s*)([\w-]+)\s*:\s*([^\s;{}][^;{}]*);/g)]
  .map(([, property, value]) => ({ property: property!, value: value!.trim() }))

const palette = (selector: string): Record<string, string> => {
  const block = style.match(new RegExp(`(?:^|\\n)${selector.replaceAll('.', '\\.')} \\{([^}]*)\\}`))?.[1] ?? ''
  return Object.fromEntries([...block.matchAll(/--venix-switcher-([\w-]+):\s*(#[\da-f]{6});/gi)].map(([, name, hex]) => [name!, hex!]))
}
const light = palette('.venix-theme-switcher')
const MODES = [['claro', light], ['escuro', { ...light, ...palette('.venix-theme-switcher--dark') }]] as const

describe('VenixThemeSwitcher: sem cores do tema', () => {
  it('não deve ler nenhuma variável de cor da página (tema, tokens, Vuetify)', () => {
    const variables = [...style.matchAll(/var\(\s*(--[\w-]+)/g)].map(match => match[1]!)
    expect(variables.filter(name => !name.startsWith('--venix-switcher-'))).toEqual([])
    expect(style).not.toMatch(/--(?:color|jade|v-theme)-/)
    expect(style).not.toContain('data-jade-surface')
  })

  it('deve usar só preto, branco e cinzas', () => {
    for (const [hex] of style.matchAll(/#[\da-f]{3,8}\b/gi)) {
      expect(hex, hex).toMatch(/^#([\da-f]{2})\1\1$/i)
    }
    for (const [color, channels] of style.matchAll(/(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(([^)]*)\)/gi)) {
      const [r, g, b] = channels!.split(',').map(part => part.trim())
      expect(color.startsWith('rgb') && r === g && g === b, color).toBe(true)
    }
  })

  it('deve tirar toda cor das variáveis do próprio seletor, nunca da página em volta', () => {
    const painted = declarations.filter(({ property }) => /^(?:color|background(?:-color)?|border(?:-color|-top|-bottom|-left|-right)?|outline(?:-color)?|box-shadow|scrollbar-color|fill|stroke)$/.test(property))
    expect(painted.length).toBeGreaterThan(20)
    for (const { property, value } of painted) {
      const rest = value
        .replace(/var\(--venix-switcher-[\w-]+\)/g, '')
        .replace(/\b(?:none|transparent|solid|inset)\b|-?[\d.]+(?:px|rem)?|[\s,]/g, '')
      expect(rest, `${property}: ${value}`).toBe('')
    }
  })

  it('não deve desbotar texto com opacity', () => {
    const values = declarations.filter(({ property }) => property === 'opacity').map(({ value }) => value)
    expect(values.filter(value => value !== '0' && value !== '1')).toEqual([])
  })

  it('deve seguir só o modo claro/escuro, não o color-scheme de onde está', () => {
    expect(style).not.toContain('light-dark(')
    expect(source).toContain('\'venix-theme-switcher--dark\': darkMode')
  })
})

describe.each(MODES)('VenixThemeSwitcher: contraste no modo %s', (_mode, colors) => {
  it('deve ter o texto em AA (4.5:1) sobre todo fundo', () => {
    for (const text of ['text', 'text-soft']) {
      for (const background of ['bg', 'hover', 'active']) {
        expect(contrastRatio(colors[text]!, colors[background]!), `${text} sobre ${background}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('deve ter bordas e chaves em 3:1', () => {
    expect(contrastRatio(colors.border!, colors.bg!)).toBeGreaterThanOrEqual(3)
    expect(contrastRatio(colors['switch-off']!, colors.bg!)).toBeGreaterThanOrEqual(3)
    expect(contrastRatio(colors['knob-off']!, colors['switch-off']!)).toBeGreaterThanOrEqual(3)
  })
})

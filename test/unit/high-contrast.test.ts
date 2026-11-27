import { describe, it, expect } from 'vitest'
import { generateThemeVars } from '../../src/shared/css/colors'
import { generateHighContrastVars, generateTokens } from '../../src/shared/css/tokens'
import { processTheme } from '../../src/shared/css'
import { menuOf } from '../../src/shared/css/menu'
import { loadTheme } from '../../src/shared/utils/load'
import type { ThemeColors } from '../../src/shared/types'
import { surfacesOf } from '../../src/shared/token-names'

const DARK: ThemeColors = { dark: true, tokens: true, primary: '#FF6B6B', secondary: '#FFB96A', background: '#0C0C0C' }
const LIGHT: ThemeColors = { dark: false, tokens: true, primary: '#1D4ED8', background: '#FFFFFF' }
const MEDIA = '@media (prefers-contrast: more)'

/** O bloco de alto contraste de uma variante, ou null. */
const block = (css: string) => {
  const start = css.indexOf(MEDIA)
  return start < 0 ? null : css.slice(start, css.indexOf('\n}\n', css.indexOf('\n  }\n', start)) + 3)
}
const declarations = (css: string) => Object.fromEntries([...css.matchAll(/--jade-([\w-]+): (#[0-9A-F]{6});/g)].map(m => [m[1]!, m[2]!]))

describe('generateHighContrastVars', () => {
  it.each([['escuro', DARK], ['claro', LIGHT]] as const)('deve escrever só os tokens que mudam de AA para AAA no tema %s', (_label, colors) => {
    const aa = Object.fromEntries(generateTokens(colors, 'AA'))
    const aaa = Object.fromEntries(generateTokens(colors, 'AAA'))
    const written = declarations(generateHighContrastVars(colors, 'AA'))

    expect(Object.keys(written).length).toBeGreaterThan(0)
    for (const [name, value] of Object.entries(written)) {
      expect(value, name).toBe(aaa[name])
      expect(value, name).not.toBe(aa[name])
    }
    // nada que mudou ficou de fora
    for (const name of Object.keys(aaa)) {
      if (aaa[name] !== aa[name]) expect(written, name).toHaveProperty(name)
    }
  })

  it('não deve repetir o fundo nem as sementes, que não mudam', () => {
    const written = declarations(generateHighContrastVars(DARK, 'AA'))
    expect(written).not.toHaveProperty('bg')
    expect(written).not.toHaveProperty('fill-primary')
  })

  it('deve ficar vazio quando o nível base já é AAA', () => {
    expect(generateHighContrastVars(DARK, 'AAA')).toBe('')
  })
})

describe('generateThemeVars com alto contraste', () => {
  it('deve pôr o bloco @media depois do bloco da variante, no mesmo seletor', () => {
    const css = generateThemeVars('dark', DARK, 'AA', true)
    const media = block(css)!
    expect(media).toContain(`:root[data-jade-theme='dark']`)
    expect(css.indexOf(MEDIA)).toBeGreaterThan(css.indexOf(`:root[data-jade-theme='dark'] {`))
    expect(declarations(media)['text-muted']).toBe(Object.fromEntries(generateTokens(DARK, 'AAA'))['text-muted'])
    expect(declarations(media)).not.toHaveProperty('text')
  })

  it('deve gerar o mesmo CSS de antes quando a opção está desligada', () => {
    expect(generateThemeVars('dark', DARK, 'AA')).toBe(generateThemeVars('dark', DARK, 'AA', false))
    expect(generateThemeVars('dark', DARK, 'AA', false)).not.toContain(MEDIA)
  })

  it('não deve escrever nada para um tema sem tokens', () => {
    expect(generateThemeVars('dark', { dark: true, primary: '#FF6B6B', background: '#0C0C0C' }, 'AA', true)).not.toContain(MEDIA)
  })

  it('não deve escrever nada quando o contraste já é AAA', () => {
    expect(generateThemeVars('dark', DARK, 'AAA', true)).not.toContain(MEDIA)
  })
})

describe('processTheme com colors.highContrast', () => {
  // quatro variantes bastam (o Venix e o Natal); gerar as dez dos temas embutidos duas vezes leva segundos
  const loaded = loadTheme()
  const themes = Object.fromEntries(['dark', 'light', 'natal', 'natal-light'].map(id => [id, loaded.colors.themes[id]!]))
  const theme = { ...loaded, colors: { ...loaded.colors, themes } }

  it('deve escrever um bloco por variante com tokens, só quando ligado', () => {
    const off = processTheme(theme)
    expect(off).not.toContain(MEDIA)

    const on = processTheme({ ...theme, colors: { ...theme.colors, highContrast: true } })
    // um bloco por variante; nas que têm o escopo `bold`, outro para o escopo e outro para o menu forte;
    // e um para o menu fraco das escuras
    const variants = Object.values(themes).filter(colors => colors.tokens)
    const bold = variants.filter(colors => surfacesOf(colors) === 'bold').length
    const faint = variants.filter(colors => menuOf(colors) === 'faint').length
    expect(on.split(MEDIA).length - 1).toBe(variants.length + 2 * bold + faint)
    expect(on.startsWith(off.slice(0, 200))).toBe(true)
  })
})

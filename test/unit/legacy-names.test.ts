import { describe, it, expect } from 'vitest'
import { customizeTheme } from '../../src/setup/customize-theme'
import { withLegacyConfigKey } from '../../src/setup/legacy-config'
import { createInitThemeOptions } from '../../src/runtime/scripts/theme-init'
import { processTheme } from '../../src/shared/css'
import { loadTheme } from '../../src/shared/utils/load'
import { themeClasses } from '../../src/shared/constants'
import type { ModuleOptions } from '../../src/module'

const css = (options: ModuleOptions = {}) => processTheme(customizeTheme(loadTheme(), { cursor: true, scrollbar: true, typography: true, ...options }))

// Os nomes até a 1.5. Com `legacyNames: false` nenhum deles pode sobrar na página
const OLD = [/--color-/, /--cursor-/, /--font-family-base/, /--font-size-base/, /data-theme/, /data-venix-/, /'\/fonts\//, /'\/images\//]

describe('nomes novos', () => {
  const on = css()
  const off = css({ legacyNames: false })

  it('deve ler só os nomes novos no CSS, com ou sem os antigos', () => {
    for (const output of [on, off]) {
      expect(output).toContain(':root[data-jade-theme=\'dark\']')
      expect(output).not.toMatch(/var\(--(?:color|cursor)-|var\(--font-(?:family|size)-base|data-theme|data-venix-/)
    }
  })

  it('não deve deixar nenhum nome antigo com `legacyNames: false`', () => {
    for (const name of OLD) expect(off).not.toMatch(name)
  })

  it('deve escrever os antigos como apelidos dos novos por padrão', () => {
    expect(on).toContain('--color-primary: var(--jade-primary);')
    expect(on).toContain('--color-scheme: var(--jade-scheme);')
    expect(on).toContain('--cursor-pointer: var(--jade-cursor-pointer);')
    expect(on).toContain('--font-family-base: var(--jade-font-family);')
  })

  it('deve escrever a classe do tema com o prefixo, e a antiga só com `legacyNames`', () => {
    expect(themeClasses('natal', true)).toEqual(['jade-theme-natal', 'natal'])
    expect(themeClasses('natal', false)).toEqual(['jade-theme-natal'])
  })

  it('deve dizer ao script do <head> quais atributos antigos escrever', () => {
    expect(createInitThemeOptions(true).legacy?.theme).toBe('data-theme')
    expect(createInitThemeOptions(true, null, false).legacy).toBeNull()
    expect(createInitThemeOptions(true).attributes.theme).toBe('data-jade-theme')
  })
})

describe('chave `venixTheme`', () => {
  const defaults: ModuleOptions = { color: true, cursor: true }

  it('deve valer quando é a única, com um aviso', () => {
    const result = withLegacyConfigKey(defaults, { venixTheme: { cursor: false } })
    expect(result.options).toEqual({ color: true, cursor: false })
    expect(result.warning).toContain('venixJade')
  })

  it('deve ser ignorada quando `venixJade` também está definida', () => {
    const result = withLegacyConfigKey(defaults, { venixJade: { color: true }, venixTheme: { color: false } })
    expect(result.options).toBe(defaults)
    expect(result.warning).toContain('ignored')
  })

  it('não deve avisar sem ela', () => {
    expect(withLegacyConfigKey(defaults, { venixJade: {} })).toEqual({ options: defaults })
  })
})

describe('vuetify0', () => {
  const output = css({ vuetify0: true, legacyNames: false })
  const block = (selector: string) => output.slice(output.indexOf(selector)).split('\n}')[0]!

  it('deve apontar as variáveis do Vuetify0 para os tokens em cada tema', () => {
    const light = block(':root[data-jade-theme=\'light\'] {')
    expect(light).toContain('--v0-primary: var(--jade-fill-primary);')
    expect(light).toContain('--v0-on-primary: var(--jade-on-primary);')
    expect(light).toContain('--v0-surface: var(--jade-bg-subtle);')
  })

  it('deve declará-las de novo no painel bold, para lerem as cores dele', () => {
    expect(block(':root[data-jade-theme=\'light\'] [data-jade-surface=\'bold\'] {')).toContain('--v0-primary: var(--jade-fill-primary);')
  })

  it('deve usar as cores do tema, com preto ou branco por cima, sem tokens', () => {
    const flat = css({ vuetify0: true, color: { themes: { own: { tokens: false, light: { primary: '#0B3D91', background: '#FFFFFF' } } } } })
    const own = flat.slice(flat.indexOf(':root[data-jade-theme=\'own-light\']')).split('\n}')[0]!
    expect(own).toContain('--v0-primary: var(--jade-primary);')
    expect(own).toContain('--v0-on-primary: #FFFFFF;')
    expect(own).toContain('--v0-on-background: #000000;')
    expect(own).toContain('--v0-surface: var(--jade-background);')
  })

  it('deve dar a mão de arrastar aos sliders, só com a opção', () => {
    expect(output).toContain('[role="slider"]')
    expect(css()).not.toContain('[role="slider"]')
    expect(css()).not.toContain('--v0-')
  })
})

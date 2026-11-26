import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import builtIn from '../../src/shared/theme.json'
import { contrastRatio } from '../../src/shared/utils/contrast'
import { SWITCHER_BACKGROUNDS, switcherThemeColor } from '../../src/shared/utils/switcher-color'

// Exceção à regra do seletor neutro: no menu, o nome e o ícone de cada tema
// usam a cor `primary` dele, ajustada para continuar em AA. Nada mais muda.

const source = readFileSync(new URL('../../src/runtime/components/VenixThemeSwitcher.vue', import.meta.url), 'utf-8')
const style = source.slice(source.lastIndexOf('<style>') + '<style>'.length, source.lastIndexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g, '')
const rules = [...style.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector!.trim(), body: body! }))

const MODES = [['claro', false], ['escuro', true]] as const
const BUILT_IN = Object.values(builtIn.colors.themes as unknown as Record<string, Record<string, { primary?: string }>>)
  .flatMap(theme => [theme.light?.primary, theme.dark?.primary, (theme as { primary?: string }).primary])
  .filter((color): color is string => !!color)
const HARD = ['#000000', '#ffffff', '#1f1f1f', '#f4b400', '#ffff00', '#0000ff', '#2d900c', '#fff', '#123']

describe.each(MODES)('switcherThemeColor no modo %s', (_mode, dark) => {
  const backgrounds = SWITCHER_BACKGROUNDS[dark ? 'dark' : 'light']

  it.each([...new Set([...BUILT_IN, ...HARD])])('deixa %s em AA sobre todo fundo do menu', (color) => {
    const result = switcherThemeColor(color, dark)!
    for (const background of backgrounds) expect(contrastRatio(result, background)).toBeGreaterThanOrEqual(4.5)
  })

  it('mantém a cor do tema quando ela já é legível', () => {
    const readable = dark ? '#ffb96a' : '#0b4f63'
    expect(switcherThemeColor(readable, dark)).toBe(readable)
  })

  it('não colore o que não é hexadecimal', () => {
    for (const color of [undefined, '', 'red', 'rgb(0, 0, 0)', '#12']) expect(switcherThemeColor(color, dark)).toBeNull()
  })

  it('usa os mesmos fundos do CSS do seletor', () => {
    const selector = dark ? '.venix-theme-switcher--dark' : '.venix-theme-switcher'
    const block = rules.find(rule => rule.selector === selector)!.body
    for (const [i, name] of ['bg', 'hover', 'active'].entries()) expect(block).toContain(`--venix-switcher-${name}: ${backgrounds[i]};`)
  })
})

describe('VenixThemeSwitcher: cor de cada tema', () => {
  it('só o nome e o ícone do tema leem a cor dele, sem fundo colorido', () => {
    const readers = rules.filter(rule => rule.body.includes('var(--venix-switcher-theme)'))
    expect(readers).toHaveLength(1)
    expect(readers[0]!.selector.split(',').map(part => part.trim())).toEqual(['.venix-theme-switcher__item-name', '.venix-theme-switcher__item--theme .venix-theme-switcher__item-icon'])
    expect(readers[0]!.body.trim()).toBe('color: var(--venix-switcher-theme);')
  })

  it('a cor é aplicada só nas opções de tema', () => {
    expect(source.match(/:style="themeColors\[item\.value\]"/g)).toHaveLength(1)
  })
})

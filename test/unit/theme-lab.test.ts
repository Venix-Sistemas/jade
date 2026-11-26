import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, it, expect } from 'vitest'
import { generateThemeVars } from '../../src/shared/css/colors'
import { applyChoice, choiceOf, decodeChoices, encodeChoices, limitBackground } from '../../src/shared/lab/choice'
import type { LabChoices } from '../../src/shared/lab/choice'
import { choicesCss, lostContrast, nearestColor } from '../../src/shared/lab/preview'
import { labRestoreScript } from '../../src/shared/lab/restore-script'
import { contrastRatio } from '../../src/shared/utils/contrast'
import { hexToOklab, hueOf } from '../../src/shared/utils/oklab'
import type { ThemeColors } from '../../src/shared/types'

const LIGHT: ThemeColors = { dark: false, tokens: true, surfaces: 'bold', primary: '#0B6E8A', secondary: '#0A6462', background: '#F4FAFC' }
const DARK: ThemeColors = { dark: true, primary: '#4FC3D9', background: '#08141A' }
const THEMES = { 'sea-light': LIGHT, 'sea-dark': DARK }
const OPTIONS = { contrast: 'AA', highContrast: false, legacyNames: false, vuetify0: false } as const
const CHOICES: LabChoices = {
  'sea-light': { bold: false, tint: 'vivid', borders: 'soft', colors: { primary: '#8A0B2E', background: '#FFFFFF', warning: '#8A6D00' } },
  'sea-dark': { bold: true, tint: false, borders: 'default', menu: 'soft' },
}

describe('escolhas do visitante', () => {
  it('parte do tema como ele é', () => {
    expect(choiceOf(LIGHT)).toEqual({ bold: true, tint: 'vivid', borders: 'default' })
    expect(choiceOf(DARK)).toEqual({ bold: false, tint: true, borders: 'default' })
  })

  it('aplicar a escolha inicial não muda o CSS de um tema com tokens', () => {
    expect(generateThemeVars('sea-light', applyChoice(LIGHT, choiceOf(LIGHT)))).toBe(generateThemeVars('sea-light', LIGHT))
  })

  it('liga os tokens, e normal tira o bold de uma variante clara', () => {
    expect(applyChoice(DARK, choiceOf(DARK)).tokens).toBe(true)
    const normal = applyChoice(LIGHT, { ...choiceOf(LIGHT), bold: false })
    expect(normal).not.toHaveProperty('surfaces')
    expect(generateThemeVars('sea-light', normal)).not.toContain('data-jade-surface=\'bold\'')
  })

  it('aplica qualquer cor do tema, e os fundos ficam do lado deles', () => {
    const applied = applyChoice(DARK, { ...choiceOf(DARK), colors: { error: '#ff8888', background2: '#EEEEEE' } })
    expect(applied.error).toBe('#FF8888')
    expect(hexToOklab(applied.background2!)[0]).toBeCloseTo(0.25, 1)
    expect(applied.primary).toBe(DARK.primary)
  })

  it('mantém o fundo do lado dele', () => {
    expect(hexToOklab(limitBackground('#222222', false))[0]).toBeCloseTo(0.92, 1)
    expect(hexToOklab(limitBackground('#EEEEEE', true))[0]).toBeCloseTo(0.25, 1)
    expect(limitBackground('#FAFAFA', false)).toBe('#FAFAFA')
    expect(limitBackground('#08141A', true)).toBe('#08141A')
  })
})

describe('cookie das escolhas', () => {
  it('vai e volta', () => {
    expect(decodeChoices(encodeChoices(CHOICES), Object.keys(THEMES))).toEqual(CHOICES)
  })

  it.each([
    ['outra variante', 'x-light,0,v,d,,,'],
    ['CSS no id', 'sea-light{}body,0,v,d,,,'],
    ['CSS na cor', 'sea-light,0,v,d,0-000000;}body{display:none'],
    ['cor curta', 'sea-light,0,v,d,0-fff'],
    ['cor que não existe', 'sea-light,0,v,d,x-000000'],
    ['tom desconhecido', 'sea-light,0,toString,d'],
    ['campos demais', `sea-light,0,v,d${',0-000000'.repeat(11)}`],
    ['campos a menos', 'sea-light,0,v'],
  ])('descarta %s', (_label, value) => {
    expect(decodeChoices(value, Object.keys(THEMES))).toEqual({})
  })

  it('não aceita o que não é texto', () => {
    for (const value of [undefined, null, 1, {}]) expect(decodeChoices(value, ['sea-light'])).toEqual({})
  })
})

describe('CSS das escolhas', () => {
  const css = choicesCss(THEMES, CHOICES, OPTIONS)

  it('vence o CSS do build, só nas variantes escolhidas', () => {
    expect(css).toContain(':root[data-jade-theme=\'sea-light\'][data-jade-lab~=\'sea-light\'] {')
    expect(css).toContain(':root[data-jade-theme=\'sea-dark\'][data-jade-lab~=\'sea-dark\'] [data-jade-surface=\'bold\'] {')
    expect(css).toContain('--jade-primary: #8A0B2E;')
    expect(css).not.toContain('--color-primary')
  })

  it('o escopo bold do build sai de cena numa variante personalizada', () => {
    const built = generateThemeVars('sea-light', LIGHT, 'AA', false, { lab: 'guard' })
    expect(built).toContain(':root[data-jade-theme=\'sea-light\']:not([data-jade-lab~=\'sea-light\']) [data-jade-surface=\'bold\'] {')
    expect(built).toContain(':root[data-jade-theme=\'sea-light\'] {')
  })

  it('sem `color.lab` o CSS do build não cita o atributo', () => {
    expect(generateThemeVars('sea-light', LIGHT)).not.toContain('data-jade-lab')
  })

  it('recusa uma cor de marca que some no fundo, no claro e no escuro', () => {
    const withPrimary = (base: ThemeColors, primary: string) => applyChoice(base, { ...choiceOf(base), colors: { primary } })
    expect(lostContrast(LIGHT, withPrimary(LIGHT, '#FFF176'), 'AA')).toContain('fill-primary / bg')
    expect(lostContrast(DARK, withPrimary(DARK, '#1A237E'), 'AA')).toContain('fill-primary / bg')
    expect(lostContrast(DARK, withPrimary(DARK, '#B388FF'), 'AA')).toEqual([])
  })

  it('não perde contraste nas combinações de estilo', () => {
    for (const bold of [true, false]) {
      for (const tint of [false, true, 'vivid'] as const) {
        for (const borders of ['default', 'soft'] as const) {
          for (const base of [LIGHT, DARK]) {
            expect(lostContrast(base, applyChoice(base, { ...choiceOf(base), bold, tint, borders }), 'AA')).toEqual([])
          }
        }
      }
    }
  })
})

describe('painel do editor: segue a regra do seletor', () => {
  const source = readFileSync(new URL('../../src/runtime/components/ThemeLabPanel.vue', import.meta.url), 'utf-8')
  const style = source.slice(source.lastIndexOf('<style>') + '<style>'.length, source.lastIndexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g, '')

  it('usa só as variáveis neutras do seletor, sem cor própria', () => {
    const variables = [...style.matchAll(/var\(\s*(--[\w-]+)/g)].map(match => match[1]!)
    expect(variables.length).toBeGreaterThan(10)
    expect(variables.filter(name => !name.startsWith('--venix-switcher-'))).toEqual([])
    expect(style).not.toMatch(/#[\da-f]{3,8}\b|(?:rgba?|hsla?|oklab|oklch)\(|light-dark\(/i)
  })

  it('não desbota texto com opacity', () => {
    const values = [...style.matchAll(/(?<=[{;]\s*)opacity:([^;]+);/g)].map(match => match[1]!.trim())
    // Só o botão de opção, escondido atrás do texto
    expect(values).toEqual(['0'])
  })
})

describe('tom legível mais próximo', () => {
  it('mantém a cor escolhida quando ela já é legível', () => {
    expect(nearestColor(DARK, choiceOf(DARK), 'primary', '#B388FF', 'AA')).toBe('#B388FF')
  })

  it.each([
    ['amarelo claro no claro', LIGHT, 'primary', '#FFF176'],
    ['azul escuro no escuro', DARK, 'primary', '#1A237E'],
    ['vermelho quase preto no escuro', DARK, 'error', '#200808'],
    ['amarelo na secundária do claro', LIGHT, 'secondary', '#FFEB3B'],
  ] as const)('troca %s por um tom da mesma cor que se lê', (_label, base, name, picked) => {
    const tone = nearestColor(base, choiceOf(base), name, picked, 'AA')!
    expect(tone).not.toBeNull()
    expect(lostContrast(base, applyChoice(base, { ...choiceOf(base), colors: { [name]: tone } }), 'AA')).toEqual([])
    expect(contrastRatio(tone, base.background!)).toBeGreaterThanOrEqual(3)
    // O matiz se mantém, com a folga do arredondamento em tons quase pretos
    expect(Math.abs(hueOf(tone)! - hueOf(picked)!)).toBeLessThan(12)
  })
})

describe('script que repõe as cores', () => {
  const key = encodeChoices(CHOICES)
  const run = (cookie: string, stored: object | null) => {
    const added: { id?: string, textContent?: string }[] = []
    const attributes: Record<string, string> = {}
    runInNewContext(labRestoreScript('abc'), {
      document: {
        cookie,
        createElement: () => ({}),
        head: { appendChild: (element: object) => added.push(element) },
        documentElement: { setAttribute: (name: string, value: string) => { attributes[name] = value } },
      },
      localStorage: { getItem: () => stored && JSON.stringify(stored) },
      decodeURIComponent,
      JSON,
    })
    return { added, attributes }
  }
  const stored = { v: 'abc', key, css: ':root{}', ids: 'sea-light sea-dark' }
  const cookie = `a=1; jade-theme-custom=${encodeURIComponent(key)}`

  it('repõe o CSS salvo quando o cookie confere', () => {
    const { added, attributes } = run(cookie, stored)
    expect(added).toEqual([{ id: 'jade-theme-lab', textContent: ':root{}' }])
    expect(attributes).toEqual({ 'data-jade-lab': 'sea-light sea-dark' })
  })

  it.each([
    ['sem cookie', '', stored],
    ['sem cache', cookie, null],
    ['de outro build', cookie, { ...stored, v: 'old' }],
    ['de outras escolhas', cookie, { ...stored, key: 'x' }],
  ])('não faz nada %s', (_label, value, cache) => {
    expect(run(value, cache).added).toEqual([])
  })
})

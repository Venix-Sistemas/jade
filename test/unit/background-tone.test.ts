import { describe, it, expect } from 'vitest'
import { checkTokenContrast, generateTokens } from '../../src/shared/css/tokens'
import { applyChoice, choiceOf, decodeChoices, encodeChoices } from '../../src/shared/lab/choice'
import { toneBackgrounds, toneColor } from '../../src/shared/utils/background-tone'
import { mergeColorThemes, normalizeColorThemes } from '../../src/shared/utils/merge-themes'
import { chromaOf, hexToOklab, hueOf } from '../../src/shared/utils/oklab'
import builtIn from '../../src/shared/theme.json'
import type { ThemeColors } from '../../src/shared/types'

const DARK: ThemeColors = { dark: true, tokens: true, primary: '#FF6B6B', background: '#0C0C0C', background2: '#191919', background3: '#282828' }
const NATAL: ThemeColors = { dark: true, tokens: true, primary: '#6FCF7F', background: '#0B1611' }
const BUILT_IN = Object.entries(normalizeColorThemes(builtIn.colors.themes as never).themes)
  .filter(([, colors]) => colors.tokens && colors.primary)

describe('toneColor', () => {
  it('deixa a cor do tema como está', () => {
    expect(toneColor('#0B1611', '#6FCF7F', 'theme', true)).toBe('#0B1611')
  })

  it('neutro: cinza na mesma luminosidade', () => {
    const toned = toneColor('#0B1611', '#6FCF7F', 'neutral', true)
    expect(chromaOf(toned)).toBeLessThan(0.002)
    expect(hexToOklab(toned)[0]).toBeCloseTo(hexToOklab('#0B1611')[0], 2)
  })

  it.each([['escuro', '#0C0C0C', true], ['claro', '#FAFAFA', false]] as const)('da marca no %s: um toque do primary, na mesma luminosidade', (_label, background, dark) => {
    const toned = toneColor(background, '#FF6B6B', 'brand', dark)
    expect(chromaOf(toned)).toBeGreaterThan(0.004)
    expect(chromaOf(toned)).toBeLessThan(0.035)
    expect(Math.abs(hueOf(toned)! - hueOf('#FF6B6B')!)).toBeLessThan(12)
    expect(hexToOklab(toned)[0]).toBeCloseTo(hexToOklab(background)[0], 1)
  })

  it('da marca: o branco puro desce um pouco para caber a cor', () => {
    expect(chromaOf(toneColor('#FFFFFF', '#FF0000', 'brand', false))).toBeGreaterThan(0.002)
  })

  it('da marca: primary cinza dá fundo cinza; sem primary ou cor inválida, nada muda', () => {
    expect(chromaOf(toneColor('#0B1611', '#808080', 'brand', true))).toBeLessThan(0.002)
    expect(toneColor('#0B1611', undefined, 'brand', true)).toBe('#0B1611')
    expect(toneColor('rgb(0 0 0)', '#FF0000', 'neutral', true)).toBe('rgb(0 0 0)')
  })

  it('muda só as cores da página', () => {
    const toned = toneBackgrounds(DARK, 'brand', true)
    expect(toned.primary).toBe(DARK.primary)
    for (const name of ['background', 'background2', 'background3'] as const) expect(toned[name], name).not.toBe(DARK[name])
    expect(toneBackgrounds(DARK, undefined, true)).toBe(DARK)
  })
})

describe('backgroundTone na configuração', () => {
  it('vale no tema ou na variante, que vence, e chega às cores resolvidas', () => {
    const merged = mergeColorThemes(builtIn.colors.themes as never, { venix: { backgroundTone: 'brand', light: { backgroundTone: 'theme' } } })
    const { themes } = normalizeColorThemes(merged)
    expect(chromaOf(themes.dark!.background!)).toBeGreaterThan(0.004)
    expect(themes.light!.background).toBe('#FAFAFA')
  })

  it('por padrão o Venix escuro continua cinza', () => {
    expect(normalizeColorThemes(builtIn.colors.themes as never).themes.dark!.background).toBe('#0C0C0C')
  })

  it.each(BUILT_IN.flatMap(entry => (['neutral', 'brand'] as const).map(tone => [...entry, tone] as const)))('os tokens de %s continuam legíveis sobre o fundo %s', (_id, colors, tone) => {
    const toned = { ...colors, ...toneBackgrounds(colors, tone, colors.dark === true) }
    expect(checkTokenContrast(generateTokens(toned), 'AA')).toEqual([])
  })
})

describe('backgroundTone no editor', () => {
  it('aplica o tom às cores do tema, sem mexer na que o visitante escolheu', () => {
    const applied = applyChoice(DARK, { ...choiceOf(DARK), tone: 'brand', colors: { background2: '#101820' } })
    expect(applied.background).toBe(toneColor('#0C0C0C', DARK.primary, 'brand', true))
    expect(applied.background2).toBe('#101820')
  })

  it('segue o primary escolhido', () => {
    const applied = applyChoice(DARK, { ...choiceOf(DARK), tone: 'brand', colors: { primary: '#3B82F6' } })
    expect(applied.background).toBe(toneColor('#0C0C0C', '#3B82F6', 'brand', true))
  })

  it('neutro tira a cor do fundo de um tema sazonal', () => {
    expect(chromaOf(applyChoice(NATAL, { ...choiceOf(NATAL), tone: 'neutral' }).background!)).toBeLessThan(0.002)
  })

  it.each(['theme', 'neutral', 'brand'] as const)('o cookie guarda o tom %s, junto do menu e das cores', (tone) => {
    const choice = { ...choiceOf(DARK), menu: 'plain' as const, tone, colors: { primary: '#123456' } }
    expect(decodeChoices(encodeChoices({ dark: choice }), ['dark']).dark).toMatchObject({ menu: 'plain', tone, colors: { primary: '#123456' } })
  })

  it('recusa um tom desconhecido no cookie', () => {
    expect(decodeChoices('dark,0,g,d,bx', ['dark'])).toEqual({})
  })
})

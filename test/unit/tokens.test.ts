import { describe, it, expect } from 'vitest'
import { checkTokenContrast, findTokenContrastIssues, findTokenOverrideIssues, generateTokens, generateTokenVars } from '../../src/shared/css/tokens'
import { contrastRatio } from '../../src/shared/utils/contrast'
import type { ThemeColors } from '../../src/shared/types'
import builtIn from '../../src/shared/theme.json'

const LIGHT: ThemeColors = { dark: false, tokens: true, primary: '#FF0000', secondary: '#FF8800', background: '#FAFAFA' }
const DARK: ThemeColors = { dark: true, tokens: true, primary: '#FF6B6B', secondary: '#FFB96A', background: '#0C0C0C' }

const toMap = (colors: ThemeColors, level: 'AA' | 'AAA' = 'AA') => Object.fromEntries(generateTokens(colors, level))

describe('generateTokens', () => {
  const NEUTRAL = ['bg', 'bg-subtle', 'bg-muted', 'bg-hover', 'bg-active', 'border', 'border-strong', 'border-focus', 'text', 'text-muted', 'text-disabled']
  const PER_ROLE = ['fill', 'fill-hover', 'on', 'bg', 'bg-hover', 'bg-active', 'text', 'text-strong', 'border', 'border-strong']

  it('deve gerar os tokens neutros e os de cada papel, com os nomes do plano', () => {
    const names = Object.keys(toMap(LIGHT))
    for (const name of NEUTRAL) expect(names).toContain(name)
    for (const role of ['primary', 'secondary']) {
      for (const token of PER_ROLE) {
        const [property, ...rest] = token.split('-')
        expect(names).toContain([property, role, ...rest].join('-'))
      }
    }
    expect(names).toHaveLength(NEUTRAL.length + PER_ROLE.length * 2)
  })

  it('deve usar exatamente o fundo e os seeds do tema', () => {
    const tokens = toMap(LIGHT)
    expect(tokens.bg).toBe('#FAFAFA')
    expect(tokens['fill-primary']).toBe('#FF0000')
    expect(tokens['fill-secondary']).toBe('#FF8800')
    expect(tokens['on-primary']).toBe('#000000')
  })

  it('deve gerar só os papéis que o tema define', () => {
    const names = Object.keys(toMap({ dark: false, tokens: true, primary: '#1D4ED8', background: '#FFFFFF' }))
    expect(names).toContain('fill-primary')
    expect(names).not.toContain('fill-secondary')
  })

  it('deve gerar sem border-focus quando não há primary', () => {
    const names = Object.keys(toMap({ dark: false, tokens: true, secondary: '#1D4ED8', background: '#FFFFFF' }))
    expect(names).not.toContain('border-focus')
    expect(names).toContain('fill-secondary')
  })

  it('deve usar um fundo padrão quando a variante não define background', () => {
    expect(toMap({ dark: false, tokens: true, primary: '#1D4ED8' }).bg).toBe('#FFFFFF')
    expect(toMap({ dark: true, tokens: true, primary: '#FF6B6B' }).bg).toBe('#121212')
  })

  describe.each([['claro', LIGHT], ['escuro', DARK]] as const)('tema %s', (_label, colors) => {
    describe.each([['AA', 4.5, 3], ['AAA', 7, 3]] as const)('nível %s', (level, text, outline) => {
      const t = toMap(colors, level)
      const pass = (fg: string, bg: string, min: number) => {
        expect(contrastRatio(t[fg]!, t[bg]!), `${fg} sobre ${bg}`).toBeGreaterThanOrEqual(min)
      }

      it('deve passar os pares do texto neutro', () => {
        for (const bg of ['bg', 'bg-subtle', 'bg-muted', 'bg-hover', 'bg-active']) pass('text', bg, text)
        for (const bg of ['bg', 'bg-subtle', 'bg-muted']) pass('text-muted', bg, text)
      })

      it('deve passar os pares dos contornos', () => {
        for (const bg of ['bg', 'bg-subtle']) {
          pass('border-strong', bg, outline)
          pass('border-focus', bg, outline)
        }
      })

      it.each(['primary', 'secondary'])('deve passar os pares do papel %s', (role) => {
        for (const bg of ['bg', 'bg-subtle', 'bg-muted', `bg-${role}`]) pass(`text-${role}`, bg, text)
        for (const bg of [`bg-${role}-hover`, `bg-${role}-active`]) pass(`text-${role}-strong`, bg, text)
        for (const bg of [`bg-${role}`, `bg-${role}-active`]) pass('text', bg, text)
        pass(`border-${role}-strong`, 'bg', outline)
      })

      it.skipIf(level === 'AAA')('deve passar o texto sobre o preenchimento (AA)', () => {
        for (const role of ['primary', 'secondary']) {
          pass(`on-${role}`, `fill-${role}`, 4.5)
          pass(`on-${role}`, `fill-${role}-hover`, 4.5)
        }
      })
    })
  })
})

describe('generateTokenVars', () => {
  it('deve escrever uma declaração --jade-* por token', () => {
    const lines = generateTokenVars(LIGHT).split('\n')
    expect(lines).toHaveLength(generateTokens(LIGHT).length)
    expect(lines[0]).toBe('  --jade-bg: #FAFAFA;')
    expect(lines).toContain('  --jade-fill-primary: #FF0000;')
    expect(lines.every(line => /^ {2}--jade-[a-z-]+: #[0-9A-F]{6};$/.test(line))).toBe(true)
  })
})

describe('checkTokenContrast', () => {
  it('não deve achar pares abaixo do alvo nos temas do Venix em AA', () => {
    expect(checkTokenContrast(generateTokens(LIGHT), 'AA')).toEqual([])
    expect(checkTokenContrast(generateTokens(DARK), 'AA')).toEqual([])
  })

  it('deve apontar o texto sobre o preenchimento em AAA (o vermelho do Venix não chega a 7:1)', () => {
    const issues = checkTokenContrast(generateTokens(LIGHT, 'AAA'), 'AAA')
    expect(issues.map(i => `${i.text}/${i.surface}`)).toEqual(expect.arrayContaining(['on-primary/fill-primary', 'on-primary/fill-primary-hover']))
    const onFill = issues.find(i => i.text === 'on-primary' && i.surface === 'fill-primary')!
    expect(onFill.min).toBe(7)
    expect(onFill.ratio).toBeCloseTo(5.25, 2)
    // o resto da escala continua passando
    expect(issues.every(i => i.text.startsWith('on-'))).toBe(true)
  })

  it('deve apontar um token trocado à mão por uma cor fraca', () => {
    const tokens = generateTokens(LIGHT).map(([name, value]): [string, string] => name === 'text-primary' ? [name, '#FF9999'] : [name, value])
    const issues = checkTokenContrast(tokens, 'AA')
    expect(issues.map(i => i.surface)).toEqual(expect.arrayContaining(['bg', 'bg-subtle', 'bg-muted', 'bg-primary']))
    expect(issues.every(i => i.text === 'text-primary' && i.ratio < i.min)).toBe(true)
  })

  it('deve exigir 3:1 dos contornos nos dois níveis', () => {
    const tokens = generateTokens(LIGHT).map(([name, value]): [string, string] => name === 'border-strong' ? [name, '#E0E0E0'] : [name, value])
    for (const level of ['AA', 'AAA'] as const) {
      const issue = checkTokenContrast(tokens, level).find(i => i.text === 'border-strong')
      expect(issue?.min).toBe(3)
    }
  })

  it('deve pular os pares de tokens que não existem', () => {
    const tokens = generateTokens({ dark: false, tokens: true, primary: '#1D4ED8', background: '#FFFFFF' })
    expect(() => checkTokenContrast(tokens, 'AA')).not.toThrow()
    expect(checkTokenContrast([], 'AA')).toEqual([])
  })
})

describe('findTokenContrastIssues', () => {
  it('não deve avisar de temas que passam nem de temas sem tokens', () => {
    expect(findTokenContrastIssues({ a: LIGHT, b: DARK, c: { dark: false, primary: '#FFFF00', background: '#FFFFFF' } }, 'AA')).toEqual([])
  })

  it('deve gerar um aviso por variante com os pares que falham', () => {
    const messages = findTokenContrastIssues({ 'venixTokens-light': LIGHT, 'venixTokens-dark': DARK }, 'AAA')
    // o escuro passa: preto sobre #FF6B6B dá 7.57:1
    expect(messages).toHaveLength(1)
    expect(messages[0]).toContain('`venixTokens-light`')
    expect(messages[0]).toContain('WCAG AAA')
    expect(messages[0]).toContain('`on-primary` on `fill-primary` 5.25:1 (needs 7:1)')
    expect(messages[0]).toContain('`color.contrast` to `\'AA\'`')
  })

  it('deve usar o contraste do nível pedido na geração', () => {
    // Em AAA o texto suave do neutro é mais escuro, então só o `on-*` falha
    const messages = findTokenContrastIssues({ x: LIGHT }, 'AAA')
    expect(messages[0]).not.toContain('`text-muted`')
  })
})

describe('neutralTint', () => {
  const isGray = (hex: string) => hex.slice(1, 3) === hex.slice(3, 5) && hex.slice(3, 5) === hex.slice(5, 7)
  const NEUTRAL_NAMES = ['bg', 'bg-subtle', 'bg-muted', 'bg-hover', 'bg-active', 'border', 'border-strong', 'text', 'text-muted', 'text-disabled']

  it('deve dar tom ao neutro por padrão', () => {
    const tokens = toMap(LIGHT)
    expect(NEUTRAL_NAMES.some(name => !isGray(tokens[name]!))).toBe(true)
  })

  it.each([['claro', LIGHT], ['escuro', DARK]] as const)('deve gerar o neutro em cinza com `neutralTint: false` (%s)', (_label, colors) => {
    const tokens = toMap({ ...colors, neutralTint: false })
    for (const name of NEUTRAL_NAMES) expect(isGray(tokens[name]!), name).toBe(true)
    // só o neutro muda: os papéis seguem com a cor do seed
    expect(tokens['fill-primary']).toBe(colors.primary)
  })

  it('deve passar os mesmos pares de contraste com o neutro em cinza', () => {
    for (const colors of [LIGHT, DARK]) {
      for (const level of ['AA', 'AAA'] as const) {
        const issues = checkTokenContrast(generateTokens({ ...colors, neutralTint: false }, level), level)
        expect(issues.filter(issue => !issue.text.startsWith('on-'))).toEqual([])
      }
    }
  })

  it('não deve misturar o resultado com e sem tom no cache', () => {
    const tinted = toMap(LIGHT)
    const gray = toMap({ ...LIGHT, neutralTint: false })
    expect(gray['bg-subtle']).not.toBe(tinted['bg-subtle'])
    expect(toMap(LIGHT)['bg-subtle']).toBe(tinted['bg-subtle'])
  })
})

describe('tokens com overrides de passo', () => {
  const GRAY = { neutralTint: false }

  it('deve apontar o token para outro passo da escala, sem mexer nos demais', () => {
    const base = toMap({ ...DARK, ...GRAY })
    const over = toMap({ ...DARK, ...GRAY, tokens: { 'bg-subtle': 'neutral-3', 'fill-primary': 'primary-10' } })
    expect(over['bg-subtle']).toBe(base['bg-muted'])
    expect(over['fill-primary']).toBe(base['fill-primary-hover'])
    expect(over['bg-muted']).toBe(base['bg-muted'])
    expect(over.bg).toBe(base.bg)
  })

  it('deve valer nos dois modos com a mesma referência', () => {
    for (const colors of [LIGHT, DARK]) {
      const base = toMap(colors)
      const over = toMap({ ...colors, tokens: { 'bg-subtle': 'neutral-3' } })
      expect(over['bg-subtle']).toBe(base['bg-muted'])
    }
  })

  it('deve seguir o fundo do tema, sem cor fixa', () => {
    const over = (background: string) => toMap({ ...DARK, tokens: { 'bg-subtle': 'neutral-3' }, background })['bg-subtle']
    expect(over('#0C0C0C')).not.toBe(over('#1A1A2E'))
  })

  it('não deve misturar o resultado com e sem override no cache', () => {
    const plain = toMap(DARK)['bg-subtle']
    expect(toMap({ ...DARK, tokens: { 'bg-subtle': 'neutral-3' } })['bg-subtle']).not.toBe(plain)
    expect(toMap(DARK)['bg-subtle']).toBe(plain)
  })

  it('deve ignorar nome, passo e papel inválidos', () => {
    const base = toMap(DARK)
    const over = toMap({ ...DARK, tokens: { 'bg-subtle': 'neutral-13', 'nada': 'neutral-3', 'on-primary': 'neutral-1', 'bg-muted': '#FFFFFF', 'text-muted': 'tertiary-5' } })
    expect(over).toEqual(base)
  })

  it('deve manter o texto muted mais fraco que o texto e dentro do nível nas superfícies elevadas', () => {
    // superfícies do venix: bg-subtle e bg-muted um passo acima do padrão
    const lifted = { 'bg-subtle': 'neutral-3', 'bg-muted': 'neutral-4' }
    for (const colors of [LIGHT, DARK]) {
      const base = toMap(colors)
      const over = toMap({ ...colors, tokens: lifted })
      expect(over.text).toBe(base.text)
      expect(over['text-muted']).not.toBe(over.text)
      for (const surface of ['bg', 'bg-subtle', 'bg-muted']) {
        expect(contrastRatio(over['text-muted']!, over[surface]!), `text-muted sobre ${surface}`).toBeGreaterThanOrEqual(4.5)
      }
      // a mesma hierarquia: o texto fica mais longe do fundo que o muted
      expect(contrastRatio(over.text!, over.bg!)).toBeGreaterThan(contrastRatio(over['text-muted']!, over.bg!))
      expect(checkTokenContrast(generateTokens({ ...colors, tokens: lifted }), 'AA').filter(issue => issue.text === 'text-muted')).toEqual([])
    }
  })

  it('não deve mexer no texto muted quando as superfícies seguem o padrão', () => {
    for (const colors of [LIGHT, DARK]) {
      expect(toMap({ ...colors, tokens: { 'bg-hover': 'neutral-5', 'bg-subtle': 'neutral-2' } })['text-muted']).toBe(toMap(colors)['text-muted'])
    }
  })

  it('deve entrar na checagem de contraste', () => {
    // texto muted sobre o passo 12 não passa
    const over = { ...DARK, tokens: { 'bg-subtle': 'neutral-11' } }
    const issues = checkTokenContrast(generateTokens(over), 'AA')
    expect(issues.some(issue => issue.surface === 'bg-subtle')).toBe(true)
    expect(findTokenContrastIssues({ d: over }, 'AA')[0]).toContain('bg-subtle')
  })
})

describe('papéis de status e accent', () => {
  const STATUS = ['accent', 'error', 'info', 'success', 'warning'] as const
  const WITH_STATUS = (colors: ThemeColors): ThemeColors => ({ ...colors, accent: '#82B1FF', error: '#FF5252', info: '#2196F3', success: '#4CAF50', warning: '#FCCF3D' })

  it.each([['claro', LIGHT], ['escuro', DARK]] as const)('deve gerar os 10 tokens de cada papel no tema %s', (_label, colors) => {
    const t = toMap(WITH_STATUS(colors))
    for (const role of STATUS) {
      for (const token of ['fill', 'fill-hover', 'bg', 'bg-hover', 'bg-active', 'text', 'text-strong', 'border', 'border-strong']) {
        const [property, ...rest] = token.split('-')
        expect(t[[property, role, ...rest].join('-')], `${token} de ${role}`).toMatch(/^#[0-9A-F]{6}$/)
      }
      expect(['#000000', '#FFFFFF']).toContain(t[`on-${role}`])
    }
  })

  it('deve usar exatamente o seed de cada papel como fill', () => {
    const t = toMap(WITH_STATUS(LIGHT))
    expect(t['fill-error']).toBe('#FF5252')
    expect(t['fill-warning']).toBe('#FCCF3D')
    expect(t['fill-accent']).toBe('#82B1FF')
  })

  it.each([['claro', LIGHT], ['escuro', DARK]] as const)('deve passar todos os pares dos papéis em AA e AAA no tema %s, menos o que o seed não alcança', (_label, colors) => {
    for (const level of ['AA', 'AAA'] as const) {
      const issues = checkTokenContrast(generateTokens(WITH_STATUS(colors), level), level)
      // em AAA um seed de brilho médio pode não alcançar 7:1 com preto nem com branco
      const unreachable = issues.filter(issue => !issue.text.startsWith('on-'))
      expect(unreachable, level).toEqual([])
    }
  })

  it('deve manter o amarelo vivo como fill e legível como texto (warning)', () => {
    const light = toMap(WITH_STATUS(LIGHT))
    expect(light['on-warning']).toBe('#000000')
    expect(contrastRatio(light['on-warning']!, light['fill-warning']!)).toBeGreaterThan(10)
    // o mesmo amarelo não passa como texto sobre o fundo claro; o text-warning é um âmbar escuro
    expect(contrastRatio(light['fill-warning']!, light.bg!)).toBeLessThan(2)
    expect(contrastRatio(light['text-warning']!, light.bg!)).toBeGreaterThanOrEqual(4.5)
    expect(light['text-warning']).not.toBe(light['fill-warning'])
  })

  it('não deve misturar no cache dois temas que só diferem no seed de um papel de status', () => {
    const a = toMap({ ...LIGHT, error: '#FF5252' })
    const b = toMap({ ...LIGHT, error: '#2E8B4E' })
    expect(a['fill-error']).toBe('#FF5252')
    expect(b['fill-error']).toBe('#2E8B4E')
    expect(a['text-error']).not.toBe(b['text-error'])
  })

  it('não deve gerar os papéis que o tema não define', () => {
    const names = Object.keys(toMap(LIGHT))
    expect(names.some(name => name.includes('error') || name.includes('warning') || name.includes('accent'))).toBe(false)
  })

  it('deve aceitar um papel novo como referência de override, e avisar quando falta o seed', () => {
    const colors = WITH_STATUS(LIGHT)
    const over = toMap({ ...colors, tokens: { 'bg-error': 'error-4' } })
    expect(over['bg-error']).toBe(toMap(colors)['bg-error-hover'])
    expect(findTokenOverrideIssues({ ok: { ...colors, tokens: { 'bg-error': 'error-4' } } })).toEqual([])
    const [message] = findTokenOverrideIssues({ x: { ...LIGHT, tokens: { 'bg-error': 'error-4' } } })
    expect(message).toContain('no `error` seed')
  })
})

describe('temas embutidos', () => {
  // text e text-muted resolviam para a mesma cor no venix (override neutral-12)
  type BuiltIn = { tokens?: boolean | Record<string, string>, neutralTint?: false } & Record<'dark' | 'light', ThemeColors>
  const themes = builtIn.colors.themes as unknown as Record<string, Partial<BuiltIn>>

  for (const [name, entry] of Object.entries(themes)) {
    if (!entry.tokens || !entry.dark || !entry.light) continue
    describe.each(['dark', 'light'] as const)(`${name} (%s)`, (mode) => {
      const colors = { ...entry[mode], dark: mode === 'dark', tokens: entry.tokens, neutralTint: entry.neutralTint } as ThemeColors
      const t = toMap(colors)

      it('deve deixar o texto mais forte que o texto muted', () => {
        expect(t['text-muted']).not.toBe(t.text)
        expect(contrastRatio(t.text!, t.bg!)).toBeGreaterThan(contrastRatio(t['text-muted']!, t.bg!))
      })

      it('deve passar todos os pares de contraste em AA, de todos os papéis', () => {
        expect(checkTokenContrast(generateTokens(colors, 'AA'), 'AA')).toEqual([])
      })

      it('deve gerar os tokens dos sete papéis que o tema define', () => {
        for (const role of ['primary', 'secondary', 'accent', 'error', 'info', 'success', 'warning']) {
          if (entry[mode]![role as 'primary']) expect(t[`fill-${role}`], `fill-${role}`).toBe(entry[mode]![role as 'primary']!.toUpperCase())
        }
      })

      it('deve passar o texto muted em AA nas superfícies neutras', () => {
        for (const surface of ['bg', 'bg-subtle', 'bg-muted']) {
          expect(contrastRatio(t['text-muted']!, t[surface]!), `text-muted sobre ${surface}`).toBeGreaterThanOrEqual(4.5)
        }
      })
    })
  }
})

describe('findTokenOverrideIssues', () => {
  it('não deve avisar de overrides válidos nem de tema sem override', () => {
    expect(findTokenOverrideIssues({ a: DARK, b: { ...DARK, tokens: { 'bg-subtle': 'neutral-3', 'text-primary': 'primary-12' } } })).toEqual([])
  })

  it('deve avisar do que foi ignorado', () => {
    const [message] = findTokenOverrideIssues({ x: { dark: true, primary: '#FF6B6B', background: '#0C0C0C', tokens: { 'nada': 'neutral-3', 'bg-muted': 'cinza', 'on-primary': 'neutral-1', 'text-secondary': 'secondary-11' } } })
    expect(message).toContain('`x`')
    for (const part of ['`nada`', '`bg-muted`', '`cinza`', '`on-primary`', 'no `secondary` seed']) expect(message).toContain(part)
  })
})

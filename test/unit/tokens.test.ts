import { describe, it, expect } from 'vitest'
import { generateTokens, generateTokenVars } from '../../src/shared/css/tokens'
import { contrastRatio } from '../../src/shared/utils/contrast'
import type { ThemeColors } from '../../src/shared/types'

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
  it('deve escrever uma declaração --color-* por token', () => {
    const lines = generateTokenVars(LIGHT).split('\n')
    expect(lines).toHaveLength(generateTokens(LIGHT).length)
    expect(lines[0]).toBe('  --color-bg: #FAFAFA;')
    expect(lines).toContain('  --color-fill-primary: #FF0000;')
    expect(lines.every(line => /^ {2}--color-[a-z-]+: #[0-9A-F]{6};$/.test(line))).toBe(true)
  })
})

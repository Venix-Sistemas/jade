import { describe, it, expect } from 'vitest'
import { renderThemeTypes } from '../../src/shared/utils/theme-types'
import { TOKEN_NAMES } from '../../src/shared/token-names'
import type { TokenName } from '../../src/shared/token-names'
import { buildResolvedTheme } from '../../src/shared/utils/theme-config'

/** Compila só se a união `TokenName` tem exatamente estas chaves: se um token entra ou sai da lista, o tsc acusa aqui. */
const EVERY_TOKEN: Record<TokenName, true> = {
  'bg': true,
  'bg-subtle': true,
  'bg-muted': true,
  'bg-hover': true,
  'bg-active': true,
  'border': true,
  'border-strong': true,
  'text': true,
  'text-muted': true,
  'text-disabled': true,
  'border-focus': true,
  'fill-primary': true,
  'fill-primary-hover': true,
  'bg-primary': true,
  'bg-primary-hover': true,
  'bg-primary-active': true,
  'text-primary': true,
  'text-primary-strong': true,
  'border-primary': true,
  'border-primary-strong': true,
  'on-primary': true,
  'fill-secondary': true,
  'fill-secondary-hover': true,
  'bg-secondary': true,
  'bg-secondary-hover': true,
  'bg-secondary-active': true,
  'text-secondary': true,
  'text-secondary-strong': true,
  'border-secondary': true,
  'border-secondary-strong': true,
  'on-secondary': true,
  'fill-accent': true,
  'fill-accent-hover': true,
  'bg-accent': true,
  'bg-accent-hover': true,
  'bg-accent-active': true,
  'text-accent': true,
  'text-accent-strong': true,
  'border-accent': true,
  'border-accent-strong': true,
  'on-accent': true,
  'fill-error': true,
  'fill-error-hover': true,
  'bg-error': true,
  'bg-error-hover': true,
  'bg-error-active': true,
  'text-error': true,
  'text-error-strong': true,
  'border-error': true,
  'border-error-strong': true,
  'on-error': true,
  'fill-info': true,
  'fill-info-hover': true,
  'bg-info': true,
  'bg-info-hover': true,
  'bg-info-active': true,
  'text-info': true,
  'text-info-strong': true,
  'border-info': true,
  'border-info-strong': true,
  'on-info': true,
  'fill-success': true,
  'fill-success-hover': true,
  'bg-success': true,
  'bg-success-hover': true,
  'bg-success-active': true,
  'text-success': true,
  'text-success-strong': true,
  'border-success': true,
  'border-success-strong': true,
  'on-success': true,
  'fill-warning': true,
  'fill-warning-hover': true,
  'bg-warning': true,
  'bg-warning-hover': true,
  'bg-warning-active': true,
  'text-warning': true,
  'text-warning-strong': true,
  'border-warning': true,
  'border-warning-strong': true,
  'on-warning': true,
}

describe('TokenName', () => {
  it('deve ter exatamente os nomes que o módulo gera', () => {
    expect(Object.keys(EVERY_TOKEN).sort()).toEqual([...TOKEN_NAMES].sort())
  })
})

describe('renderThemeTypes', () => {
  const resolved = buildResolvedTheme({
    colorThemes: {
      reveillon: { seasonal: true, dateRange: { start: '12-28', end: '01-03' }, dark: { primary: '#ffd700', background: '#111111' }, light: { primary: '#b8860b', background: '#fff8e0' } },
      solo: { dark: { primary: '#123456', background: '#000001' } },
    },
  })
  const output = renderThemeTypes(resolved.colors)
  const field = (name: 'themes' | 'variants') => new RegExp(`${name}: (.*)`).exec(output)![1]!.split(' | ').map(part => JSON.parse(part) as string)

  it('deve listar os temas que o visitante pode escolher, os embutidos e os do projeto', () => {
    expect(field('themes')).toEqual(expect.arrayContaining(['venix', 'natal', 'reveillon', 'solo']))
    expect(field('themes')).not.toContain('system')
  })

  it('deve listar o id de cada variante', () => {
    expect(field('variants')).toEqual(expect.arrayContaining(['dark', 'light', 'reveillon-dark', 'reveillon-light']))
    expect(field('variants')).toEqual(Object.keys(resolved.colors.themes))
  })

  it('deve declarar o registro global que o módulo lê e ser um módulo', () => {
    expect(output).toContain('interface VenixThemeRegistry')
    expect(output).toContain('declare global')
    expect(output).toMatch(/export \{\}\s*$/)
  })

  it('deve escrever never quando não há nenhum tema, e escapar o que vier no nome', () => {
    expect(renderThemeTypes({ themes: {}, groups: {} } as never)).toContain('themes: never')
    const odd = renderThemeTypes({ themes: { 'a"b': { primary: '#000000', background: '#000000' } }, groups: {} } as never)
    expect(odd).toContain('variants: "a\\"b"')
  })
})

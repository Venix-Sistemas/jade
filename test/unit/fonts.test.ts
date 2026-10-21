import { describe, it, expect } from 'vitest'
import { getFontPreloadLinks } from '../../src/setup/register-fonts'
import { loadTheme } from '../../src/shared/utils/load'
import type { FontConfig } from '../../src/shared/types'

describe('getFontPreloadLinks', () => {
  const base = loadTheme()
  const withFonts = (customFonts: FontConfig[], enabled = true) =>
    getFontPreloadLinks({ ...base, typography: { ...base.typography, enabled, customFonts } })

  it('deve pré-carregar a fonte Iceberg do módulo', () => {
    expect(getFontPreloadLinks(base)).toEqual([
      { rel: 'preload', as: 'font', href: '/fonts/Iceberg/Iceberg-Regular.woff2', type: 'font/woff2', crossorigin: 'anonymous' },
    ])
  })

  it('deve pré-carregar só as fontes com preload: true', () => {
    const links = withFonts([
      { name: 'A', preload: true, sources: { woff2: '/a.woff2' }, weight: 'normal', style: 'normal' },
      { name: 'B', sources: { woff2: '/b.woff2' }, weight: 'normal', style: 'normal' },
    ])
    expect(links.map(link => link.href)).toEqual(['/a.woff2'])
  })

  it('deve pré-carregar só a primeira fonte de cada uma, com o type do formato', () => {
    const links = withFonts([
      { name: 'A', preload: true, sources: { woff: '/a.woff', woff2: '/a.woff2' } as FontConfig['sources'], weight: 'normal', style: 'normal' },
    ])
    expect(links).toEqual([{ rel: 'preload', as: 'font', href: '/a.woff', type: 'font/woff', crossorigin: 'anonymous' }])
  })

  it('não deve pré-carregar nada com a tipografia desligada', () => {
    expect(withFonts([{ name: 'A', preload: true, sources: { woff2: '/a.woff2' }, weight: 'normal', style: 'normal' }], false)).toEqual([])
  })
})

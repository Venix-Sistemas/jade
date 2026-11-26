import { describe, it, expect } from 'vitest'
import { withAppBaseURL, withBaseURL } from '../../src/shared/utils/base-url'
import { loadTheme } from '../../src/shared/utils/load'
import { processTheme } from '../../src/shared/css'
import { getFontPreloadLinks } from '../../src/setup/register-fonts'
import type { ThemeConfig } from '../../src/shared/types'

describe('withBaseURL', () => {
  it.each([
    ['/fonts/a.woff2', '/jade/', '/jade/fonts/a.woff2'],
    ['/fonts/a.woff2', '/jade', '/jade/fonts/a.woff2'],
    ['/fonts/a.woff2', '/a/b/', '/a/b/fonts/a.woff2'],
  ])('deve pôr %s sob a base %s', (path, base, expected) => {
    expect(withBaseURL(path, base)).toBe(expected)
  })

  it.each(['/', '', undefined])('não deve mexer em nada com a base %s', (base) => {
    expect(withBaseURL('/fonts/a.woff2', base)).toBe('/fonts/a.woff2')
  })

  it.each(['https://cdn.example.com/a.woff2', '//cdn.example.com/a.woff2', 'data:image/svg+xml,<svg/>', 'fonts/a.woff2', './a.woff2'])('deve deixar %s onde está', (path) => {
    expect(withBaseURL(path, '/jade/')).toBe(path)
  })

  it('não deve pôr a base duas vezes', () => {
    expect(withBaseURL('/jade/fonts/a.woff2', '/jade/')).toBe('/jade/fonts/a.woff2')
    expect(withBaseURL('/jadefonts/a.woff2', '/jade/')).toBe('/jade/jadefonts/a.woff2')
  })
})

describe('withAppBaseURL', () => {
  const theme = loadTheme()

  it('deve devolver o próprio tema sem base', () => {
    expect(withAppBaseURL(theme, '/')).toBe(theme)
    expect(withAppBaseURL(theme, undefined)).toBe(theme)
  })

  it('deve pôr fontes e cursores sob a base, sem mudar o tema original', () => {
    const before = JSON.stringify(theme)
    const based = withAppBaseURL(theme, '/jade/')

    expect(JSON.stringify(theme)).toBe(before)
    expect(Object.values(based.typography.customFonts![0]!.sources)[0]).toMatch(/^\/jade\/_jade\/fonts\//)
    expect(based.customCursor!.defaultCursors!.pointer!.path).toMatch(/^\/jade\/_jade\/images\//)
    expect(based.customCursor!.defaultCursors!.pointer!.hotspot).toBe(theme.customCursor!.defaultCursors!.pointer!.hotspot)
  })

  it('deve levar a base ao CSS e aos preloads das fontes', () => {
    const based = withAppBaseURL(theme, '/jade/')
    const css = processTheme(based)
    expect(css).toContain(`url('/jade/_jade/fonts/`)
    expect(css).not.toContain(`url('/_jade/fonts/`)
    expect(getFontPreloadLinks(based)[0]!.href).toMatch(/^\/jade\/_jade\/fonts\//)
    expect(getFontPreloadLinks(theme)[0]!.href).toMatch(/^\/_jade\/fonts\//)
  })

  it('deve prefixar também o cursor de um tema', () => {
    const custom = {
      ...theme,
      customCursor: { ...theme.customCursor!, enabled: true, themeCursors: { venix: { pointer: { path: '/c/hand.png', hotspot: '1 1' } }, natal: 'themed' } },
    } as ThemeConfig
    const based = withAppBaseURL(custom, '/jade/')
    expect(based.customCursor!.themeCursors!.venix).toEqual({ pointer: { path: '/jade/c/hand.png', hotspot: '1 1' } })
    expect(based.customCursor!.themeCursors!.natal).toBe('themed')
  })
})

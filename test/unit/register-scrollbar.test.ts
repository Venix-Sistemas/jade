import { describe, it, expect, vi } from 'vitest'
import type { Nuxt } from '@nuxt/schema'
import type { Resolver } from '@nuxt/kit'
import { registerOverlayScrollbars } from '../../src/setup/register-scrollbar'
import { loadTheme } from '../../src/shared/utils/load'

const warn = vi.fn()
vi.mock('@nuxt/kit', () => ({ addPlugin: vi.fn(), useLogger: () => ({ warn }) }))

describe('registerOverlayScrollbars', () => {
  const nuxt = () => ({ options: { css: [] as string[] } }) as unknown as Nuxt
  const resolver = { resolve: (path: string) => path } as unknown as Resolver
  const withOverlay = (overlay?: boolean) => {
    const base = loadTheme()
    return { ...base, customScrollbar: { ...base.customScrollbar, overlay } }
  }

  it('não deve fazer nada sem overlay: true (o padrão)', () => {
    const app = nuxt()
    const resolveCSS = vi.fn(() => '/os.css')
    registerOverlayScrollbars(app, resolver, withOverlay(undefined), resolveCSS)
    expect(resolveCSS).not.toHaveBeenCalled()
    expect(app.options.css).toEqual([])
  })

  it('deve adicionar o CSS da biblioteca com overlay: true e o pacote instalado', () => {
    const app = nuxt()
    const theme = withOverlay(true)
    registerOverlayScrollbars(app, resolver, theme, () => '/os.css')
    expect(app.options.css).toEqual(['/os.css'])
    expect(theme.customScrollbar.overlay).toBe(true)
  })

  it('deve avisar e desligar o overlay quando o pacote não está instalado', () => {
    const app = nuxt()
    const theme = withOverlay(true)
    warn.mockClear()
    registerOverlayScrollbars(app, resolver, theme, () => null)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('pnpm add overlayscrollbars'))
    expect(theme.customScrollbar.overlay).toBe(false)
    expect(app.options.css).toEqual([])
  })
})

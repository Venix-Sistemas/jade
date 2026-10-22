import { describe, it, expect, vi, afterEach } from 'vitest'
import { createInitThemeOptions, renderInitThemeScript } from '../../src/runtime/scripts/theme-init'
import { buildResolvedTheme } from '../../src/shared/utils/theme-config'
import { THEME_COOKIE_MAX_AGE } from '../../src/shared/constants'

// `color.requireConsent` no script de pré-hidratação: com `true` (padrão) ele
// só grava os cookies de tema depois do consentimento; com `false` grava sempre.

const theme = buildResolvedTheme()
let lastWrites: string[] = []

// Roda o script serializado, como o navegador recebe no <head>
function runInitTheme(requireConsent: boolean, consent: boolean): string[] {
  const writes: string[] = []
  vi.stubGlobal('document', {
    get cookie() { return '' },
    set cookie(value: string) { writes.push(value) },
    documentElement: { classList: { add: () => {} }, setAttribute: () => {} },
  })
  vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) })
  vi.stubGlobal('localStorage', {
    getItem: () => (consent ? JSON.stringify({ functionality: true }) : null),
  })

  new Function(renderInitThemeScript(theme, createInitThemeOptions(requireConsent)))()
  lastWrites = writes
  return writes.map(write => write.split('=')[0]!)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('initTheme × color.requireConsent', () => {
  it('sem consentimento, não grava cookies com requireConsent: true', () => {
    expect(runInitTheme(true, false)).toEqual([])
  })

  it('com consentimento, grava os três cookies', () => {
    expect(runInitTheme(true, true)).toEqual(['venix-theme-resolved', 'venix-theme-preference', 'venix-theme-mode'])
  })

  it('com requireConsent: false, grava os três cookies mesmo sem consentimento', () => {
    expect(runInitTheme(false, false)).toEqual(['venix-theme-resolved', 'venix-theme-preference', 'venix-theme-mode'])
  })

  it('grava os cookies com a mesma validade de THEME_COOKIE_MAX_AGE, não como cookies de sessão', () => {
    runInitTheme(false, false)
    for (const write of lastWrites) expect(write).toContain(`max-age=${THEME_COOKIE_MAX_AGE}`)
  })
})

describe('initTheme × scrollbar/cursor desligados pelo visitante', () => {
  // Os atributos que o script põe no <html> a partir dos cookies
  function runWithCookies(cookie: string): Record<string, string> {
    const attributes: Record<string, string> = {}
    vi.stubGlobal('document', {
      cookie,
      documentElement: { classList: { add: () => {} }, setAttribute: (name: string, value: string) => { attributes[name] = value } },
    })
    vi.stubGlobal('window', { matchMedia: () => ({ matches: true }) })
    vi.stubGlobal('localStorage', { getItem: () => null })

    new Function(renderInitThemeScript(theme, createInitThemeOptions(true)))()
    return attributes
  }

  it('desliga antes da primeira pintura o que o cookie marca como off', () => {
    const attributes = runWithCookies('venix-scrollbar=off; venix-cursor=off; venix-font=off')
    expect(attributes['data-venix-scrollbar']).toBe('off')
    expect(attributes['data-venix-cursor']).toBe('off')
    expect(attributes['data-venix-font']).toBe('off')
  })

  it('mantém ligados sem cookie ou com on', () => {
    const attributes = runWithCookies('venix-scrollbar=on')
    expect(attributes).not.toHaveProperty('data-venix-scrollbar')
    expect(attributes).not.toHaveProperty('data-venix-cursor')
    expect(attributes).not.toHaveProperty('data-venix-font')
  })
})

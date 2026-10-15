import { describe, it, expect, vi, afterEach } from 'vitest'
import initTheme from '../../src/runtime/scripts/theme-init'
import type { InitThemeOptions } from '../../src/runtime/scripts/theme-init'
import { buildResolvedTheme } from '../../src/shared/utils/theme-config'

// `color.requireConsent` no script de pré-hidratação: com `true` (padrão) ele
// só grava os cookies de tema depois do consentimento; com `false` grava sempre.

const theme = buildResolvedTheme()

function runInitTheme(options: InitThemeOptions | undefined, consent: boolean): string[] {
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

  initTheme(theme, options)
  return writes.map(write => write.split('=')[0]!)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('initTheme × color.requireConsent', () => {
  it('sem consentimento, não grava cookies por padrão', () => {
    expect(runInitTheme(undefined, false)).toEqual([])
  })

  it('sem consentimento, não grava cookies com requireConsent: true', () => {
    expect(runInitTheme({ requireConsent: true }, false)).toEqual([])
  })

  it('com consentimento, grava os três cookies', () => {
    expect(runInitTheme(undefined, true)).toEqual(['venix-theme-resolved', 'venix-theme-preference', 'venix-theme-mode'])
  })

  it('com requireConsent: false, grava os três cookies mesmo sem consentimento', () => {
    expect(runInitTheme({ requireConsent: false }, false)).toEqual(['venix-theme-resolved', 'venix-theme-preference', 'venix-theme-mode'])
  })
})

import { describe, it, expect, vi, afterEach } from 'vitest'
import initTheme from '../../src/runtime/scripts/theme-init'
import { resolveThemePreference } from '../../src/shared/utils/theme-resolve'
import { buildResolvedTheme } from '../../src/shared/utils/theme-config'
import { DEFAULT_THEME } from '../../src/shared/constants'
import type { ThemeConfig } from '../../src/shared/types'

// `runtime/scripts/theme-init.ts` duplica de propósito a regra de
// `resolveThemePreference` (precisa rodar como IIFE autocontida, sem imports).
// Este teste garante que as duas implementações não divirjam: para cada
// combinação de preferência × modo do sistema × data, o tema aplicado pelo
// script tem que ser o mesmo que a versão compartilhada resolve.

const base = buildResolvedTheme()
const theme: ThemeConfig = {
  ...base,
  colors: {
    ...base.colors,
    themes: {
      ...base.colors.themes,
      // Faixa que atravessa a virada do ano (dez → jan)
      reveillon: {
        dark: true,
        primary: '#ffd700',
        seasonal: true,
        dateRange: { start: '12-28', end: '01-03' },
      },
      // `dateRange` malformado — nunca deve ficar ativo
      quebrado: {
        dark: false,
        primary: '#000000',
        seasonal: true,
        dateRange: { start: '12', end: '01-03' },
      },
    },
  },
}

const themes = theme.colors.themes
const defaultTheme = theme.colors.defaultColor || DEFAULT_THEME

function runInitTheme(cookie: string, prefersDark: boolean): string | null {
  const attrs: Record<string, string> = {}
  const documentElement = {
    classList: { add: () => {} },
    setAttribute: (name: string, value: string) => { attrs[name] = value },
  }

  vi.stubGlobal('document', { cookie, documentElement })
  vi.stubGlobal('window', { matchMedia: () => ({ matches: prefersDark }) })

  initTheme(theme)
  return attrs['data-theme'] ?? null
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

const preferences = [undefined, 'system', ...Object.keys(themes), 'inexistente']
const dates = ['2026-01-01', '2026-02-05', '2026-06-15', '2026-10-31', '2026-12-25', '2026-12-30']

describe('initTheme × resolveThemePreference (paridade)', () => {
  for (const date of dates) {
    for (const prefersDark of [true, false]) {
      for (const preference of preferences) {
        it(`${date}, prefersDark=${prefersDark}, preferência=${preference ?? '(nenhuma)'}`, () => {
          vi.useFakeTimers()
          vi.setSystemTime(new Date(`${date}T12:00:00`))

          const cookie = preference ? `venix-theme-preference=${encodeURIComponent(preference)}` : ''
          const expected = resolveThemePreference(preference, themes, defaultTheme, prefersDark)

          expect(runInitTheme(cookie, prefersDark)).toBe(expected)
        })
      }
    }
  }
})

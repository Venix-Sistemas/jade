import { describe, it, expect, vi, afterEach } from 'vitest'
import initTheme from '../../src/runtime/scripts/theme-init'
import { resolveThemePreference } from '../../src/shared/utils/theme-resolve'
import { buildResolvedTheme } from '../../src/shared/utils/theme-config'
import type { ThemeConfig } from '../../src/shared/types'

// `runtime/scripts/theme-init.ts` duplica de propósito a regra de
// `normalizeThemeSelection`/`resolveThemeSelection` (precisa rodar como IIFE
// autocontida, sem imports). Este teste garante que as duas implementações
// não divirjam: para cada combinação de tema × modo salvos × modo do sistema
// × data, o tema aplicado pelo script tem que ser o mesmo que a versão
// compartilhada resolve.

const theme: ThemeConfig = buildResolvedTheme({
  colorThemes: {
    // Faixa que atravessa a virada do ano (dez → jan)
    reveillon: {
      seasonal: true,
      dateRange: { start: '12-28', end: '01-03' },
      dark: { primary: '#ffd700' },
      light: { primary: '#b8860b' },
    },
    // Só uma variante (clara)
    pascoa: {
      seasonal: true,
      dateRange: { start: 'easter-6', end: 'easter' },
      light: { primary: '#f4a6c0' },
    },
    // `dateRange` malformado — nunca deve ficar ativo
    quebrado: {
      seasonal: true,
      dateRange: { start: '12', end: '01-03' },
      light: { primary: '#000000' },
    },
    // Formato plano (obsoleto)
    legado: { dark: false, primary: '#123456' },
  },
})

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

const themePreferences = [undefined, 'system', ...Object.keys(theme.colors.groups), ...Object.keys(theme.colors.themes), 'inexistente']
const modePreferences = [undefined, 'system', 'light', 'dark', 'roxo']
const dates = ['2026-01-01', '2026-02-05', '2026-02-18', '2026-02-19', '2026-03-31', '2027-01-25', '2027-02-09', '2026-06-15', '2026-10-31', '2026-12-25', '2026-12-30']

describe('initTheme × resolveThemePreference (paridade)', () => {
  for (const date of dates) {
    for (const prefersDark of [true, false]) {
      for (const themePreference of new Set(themePreferences)) {
        for (const modePreference of modePreferences) {
          it(`${date}, prefersDark=${prefersDark}, tema=${themePreference ?? '(nenhum)'}, modo=${modePreference ?? '(nenhum)'}`, () => {
            vi.useFakeTimers()
            vi.setSystemTime(new Date(`${date}T12:00:00`))

            const cookie = [
              themePreference && `venix-theme-preference=${encodeURIComponent(themePreference)}`,
              modePreference && `venix-theme-mode=${encodeURIComponent(modePreference)}`,
            ].filter(Boolean).join('; ')
            const expected = resolveThemePreference(themePreference, modePreference, theme.colors, prefersDark)

            expect(runInitTheme(cookie, prefersDark)).toBe(expected)
          })
        }
      }
    }
  }
})

import { describe, it, expect, vi, afterEach } from 'vitest'
import { createInitThemeOptions, renderInitThemeScript } from '../../src/runtime/scripts/theme-init'
import { resolveThemePreference } from '../../src/shared/utils/theme-resolve'
import { buildResolvedTheme } from '../../src/shared/utils/theme-config'
import type { ThemeConfig } from '../../src/shared/types'

// O script de pré-hidratação recebe a regra de resolução serializada
// (`createThemeResolver.toString()`) e roda como IIFE no <head>. Este teste
// executa o script serializado de verdade e garante que ele aplica o mesmo
// tema que a versão chamada normalmente, para cada combinação de tema × modo
// salvos × modo do sistema × data — o que também pega qualquer referência
// externa que quebraria o script fora do bundle.

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
    semanaSanta: {
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

  // O script serializado, como o navegador recebe no <head>
  new Function(renderInitThemeScript(theme, createInitThemeOptions(true)))()
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

describe('initTheme com cookie resolvido desatualizado', () => {
  it('recalcula o tema por data em vez de manter o tema sazonal salvo em outra época', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-17T12:00:00'))

    // Salvo numa visita em dezembro; hoje (outubro) o automático é Halloween
    const cookie = 'venix-theme-preference=system; venix-theme-mode=system; venix-theme-resolved=natal'
    const expected = resolveThemePreference('system', 'system', theme.colors, true)

    expect(expected).not.toBe('natal')
    expect(runInitTheme(cookie, true)).toBe(expected)
  })

  it('recalcula o modo quando o sistema operacional mudou desde a última visita', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T12:00:00'))

    // Salvo com o SO no escuro; agora o SO está no claro
    const cookie = 'venix-theme-preference=venix; venix-theme-mode=system; venix-theme-resolved=dark'

    expect(runInitTheme(cookie, false)).toBe(resolveThemePreference('venix', 'system', theme.colors, false))
    expect(runInitTheme(cookie, false)).not.toBe('dark')
  })
})

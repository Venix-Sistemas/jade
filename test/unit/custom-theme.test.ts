import { describe, it, expect } from 'vitest'
import { customizeTheme } from '../../src/setup/customize-theme'
import { loadTheme } from '../../src/shared/utils/load'
import { processTheme } from '../../src/shared/css'
import { resolveThemePreference, getActiveSeasonalTheme } from '../../src/shared/utils/theme-resolve'
import { buildResolvedTheme } from '../../src/shared/utils/theme-config'
import type { ModuleOptions } from '../../src/module'

// A consumer registering a brand-new theme — not present in the bundled
// theme.json at all, and not overriding an existing one — via `color.themes`.
// Easter used here only as a stand-in for "some custom one-off seasonal
// theme a specific project needs", the same way the module ships Carnival/
// Halloween/Christmas.
const options: ModuleOptions = {
  color: {
    themes: {
      easter: {
        dark: false,
        seasonal: true,
        dateRange: { start: '03-25', end: '04-05' },
        primary: '#F7C6D9',
        background: '#FFFDF5',
        translations: { 'en-US': 'Easter', 'pt-BR': 'Páscoa' },
      },
    },
  },
}

describe('registering a brand-new custom theme (not overriding a built-in one)', () => {
  it('customizeTheme adds it alongside the built-in themes', () => {
    const theme = customizeTheme(loadTheme(), options)

    expect(theme.colors.themes.easter).toBeDefined()
    expect(theme.colors.themes.easter?.primary).toBe('#F7C6D9')
    // Built-ins are untouched
    expect(theme.colors.themes.dark).toBeDefined()
    expect(theme.colors.themes.light).toBeDefined()
  })

  it('generates real CSS for it, same as any built-in theme', () => {
    const theme = customizeTheme(loadTheme(), options)
    const css = processTheme(theme)

    expect(css).toContain(':root[data-theme=\'easter\']')
    expect(css).toContain('--color-primary: #F7C6D9')
  })

  it('participates in \'system\' seasonal auto-selection like a built-in seasonal theme', () => {
    const theme = customizeTheme(loadTheme(), options)
    const easterDay = new Date(2026, 2, 28) // March 28 — inside the 03-25..04-05 range

    const resolved = resolveThemePreference('system', theme.colors.themes, 'dark', false)
    // prefersDark=false matches `dark: false` on the custom theme; without a
    // fixed `now`, this only checks resolution logic picks a real theme
    // (see the dedicated date-range test below for the actual date match)
    expect(theme.colors.themes[resolved]).toBeDefined()

    // Directly exercise the date-range match the same way the client/SSR do
    expect(getActiveSeasonalTheme(theme.colors.themes, false, easterDay)).toBe('easter')
  })

  it('is also picked up at runtime (client/SSR), via the colorThemes runtimeConfig round-trip', () => {
    // This is the separate merge path `useVenixTheme`/`theme-init.server.ts`
    // actually use — reconstructed from `runtimeConfig.public.venixTheme` at
    // request/app-init time, not by reusing the build-time `customizeTheme()`
    // result directly. Exercising it here (instead of only the build-time
    // path above) is what actually proves a consumer's custom theme reaches
    // the browser and the theme switcher, not just the generated CSS file.
    const runtimeTheme = buildResolvedTheme({ colorThemes: options.color && typeof options.color === 'object' ? options.color.themes : undefined })

    expect(runtimeTheme.colors.themes.easter).toBeDefined()
    expect(runtimeTheme.colors.themes.easter?.primary).toBe('#F7C6D9')
    expect(runtimeTheme.colors.themes.dark).toBeDefined()
  })
})

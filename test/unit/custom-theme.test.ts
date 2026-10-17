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
        seasonal: true,
        dateRange: { start: '03-25', end: '04-05' },
        translations: { 'en-US': 'Easter', 'pt-BR': 'Páscoa' },
        light: { primary: '#F7C6D9', background: '#FFFDF5' },
        dark: { primary: '#FF6FB0', background: '#1B1225' },
      },
    },
  },
}

describe('registering a brand-new custom theme (not overriding a built-in one)', () => {
  it('customizeTheme adds it alongside the built-in themes', () => {
    const theme = customizeTheme(loadTheme(), options)

    expect(theme.colors.groups.easter?.variants).toEqual({ light: 'easter-light', dark: 'easter-dark' })
    expect(theme.colors.themes['easter-light']?.primary).toBe('#F7C6D9')
    // Built-ins are untouched
    expect(theme.colors.themes.dark).toBeDefined()
    expect(theme.colors.themes.light).toBeDefined()
  })

  it('generates real CSS for it, same as any built-in theme', () => {
    const theme = customizeTheme(loadTheme(), options)
    const css = processTheme(theme)

    expect(css).toContain(':root[data-theme=\'easter-light\']')
    expect(css).toContain(':root[data-theme=\'easter-dark\']')
    expect(css).toContain('--color-primary: #F7C6D9')
  })

  it('participates in \'system\' seasonal auto-selection like a built-in seasonal theme', () => {
    const theme = customizeTheme(loadTheme(), options)
    const easterDay = new Date(2026, 2, 28) // March 28 — inside the 03-25..04-05 range

    expect(resolveThemePreference('system', 'light', theme.colors, true, easterDay)).toBe('easter-light')
    expect(resolveThemePreference('system', 'system', theme.colors, true, easterDay)).toBe('easter-dark')
    expect(getActiveSeasonalTheme(theme.colors.groups, 'light', easterDay)).toBe('easter')
  })

  it('is also picked up at runtime (client/SSR), via the colorThemes runtimeConfig round-trip', () => {
    // This is the separate merge path `useVenixTheme`/`theme-init.server.ts`
    // actually use — reconstructed from `runtimeConfig.public.venixTheme` at
    // request/app-init time, not by reusing the build-time `customizeTheme()`
    // result directly. Exercising it here (instead of only the build-time
    // path above) is what actually proves a consumer's custom theme reaches
    // the browser and the theme switcher, not just the generated CSS file.
    const runtimeTheme = buildResolvedTheme({ colorThemes: options.color && typeof options.color === 'object' ? options.color.themes : undefined })

    expect(runtimeTheme.colors.groups.easter).toBeDefined()
    expect(runtimeTheme.colors.themes['easter-light']?.primary).toBe('#F7C6D9')
    expect(runtimeTheme.colors.themes.dark).toBeDefined()
  })
})

describe('buildResolvedTheme (memoização)', () => {
  it('reaproveita o resultado para o mesmo objeto de config', () => {
    const config = { defaultTheme: 'dark' }
    expect(buildResolvedTheme(config)).toBe(buildResolvedTheme(config))
  })

  it('recalcula para outro objeto de config', () => {
    expect(buildResolvedTheme({ seasonal: false })).not.toBe(buildResolvedTheme({ seasonal: false }))
  })
})

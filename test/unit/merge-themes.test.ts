import { describe, it, expect, vi } from 'vitest'
import { mergeColorThemes } from '../../src/shared/utils/merge-themes'
import { buildResolvedTheme } from '../../src/shared/utils/theme-config'
import { customizeTheme } from '../../src/setup/customize-theme'
import { loadTheme } from '../../src/shared/utils/load'
import { useThemeColors } from '../../src/runtime/composables/useThemeColors'
import type { ThemeColors } from '../../src/shared/types'

// `vue` isn't a direct dependency of the module (the consumer app provides
// it), so it can't be resolved here — `useThemeColors` only needs `computed`.
vi.mock('vue', () => ({
  computed: <T>(getter: () => T) => ({
    get value() {
      return getter()
    },
  }),
}))

// Overriding only the main colors of the built-in themes, as a consumer
// project would in `nuxt.config.ts` (`venixTheme.color.themes`).
const overrides: Record<string, Partial<ThemeColors>> = {
  dark: { primary: '#7CC544', secondary: '#4FB3A9' },
  light: { primary: '#3E8E1E', secondary: '#1F7A70' },
}

const base = buildResolvedTheme()

describe('mergeColorThemes', () => {
  it('only replaces the keys the override sets', () => {
    const merged = mergeColorThemes(base.colors.themes, { dark: { primary: '#7CC544' } })

    expect(merged.dark).toEqual({ ...base.colors.themes.dark, primary: '#7CC544' })
  })

  it('adds a theme missing from the base as dark by default', () => {
    const merged = mergeColorThemes(base.colors.themes, { brand: { primary: '#123456' } })

    expect(merged.brand).toEqual({ dark: true, primary: '#123456' })
  })

  it('does not mutate the base themes', () => {
    const baseThemes = structuredClone(base.colors.themes)
    mergeColorThemes(baseThemes, overrides)

    expect(baseThemes).toEqual(base.colors.themes)
  })
})

describe('buildResolvedTheme with `colorThemes` overrides', () => {
  it('keeps translations, icon, dark flag and the other colors of an overridden built-in theme', () => {
    const resolved = buildResolvedTheme({ colorThemes: { dark: { primary: '#7CC544' } } })
    const dark = resolved.colors.themes.dark!
    const baseDark = base.colors.themes.dark!

    expect(dark.primary).toBe('#7CC544')
    expect(dark.translations).toEqual(baseDark.translations)
    expect(dark.icon).toEqual(baseDark.icon)
    expect(dark.dark).toBe(true)
    expect(dark.secondary).toBe(baseDark.secondary)
    expect(dark.background).toBe(baseDark.background)
    expect(dark.background2).toBe(baseDark.background2)
    expect(dark.error).toBe(baseDark.error)
  })

  it('gives a brand-new theme with only some colors `dark: true`, like the build-time merge', () => {
    const resolved = buildResolvedTheme({ colorThemes: { brand: { primary: '#123456' } } })

    expect(resolved.colors.themes.brand).toEqual({ dark: true, primary: '#123456' })
  })

  it('is unchanged when there are no overrides', () => {
    expect(buildResolvedTheme({})).toEqual(base)
    expect(buildResolvedTheme({ colorThemes: {} })).toEqual(base)
    expect(base.colors.themes).toEqual(loadTheme().colors.themes)
  })

  it('matches the build-time result (`customizeTheme`) theme by theme', () => {
    const buildTime = customizeTheme(loadTheme(), { color: { themes: overrides } })
    const runtime = buildResolvedTheme({ colorThemes: overrides })

    expect(runtime.colors.themes).toEqual(buildTime.colors.themes)
  })
})

describe('useVenixTheme().themes with overrides', () => {
  it('lists "Escuro" and "Claro" with their icons', () => {
    const resolved = buildResolvedTheme({ colorThemes: overrides })
    const translate = (translations?: Record<string, string>, fallback = '') => translations?.['pt-BR'] ?? fallback
    const { themes } = useThemeColors(resolved, translate)

    const dark = themes.value.find(t => t.value === 'dark')
    const light = themes.value.find(t => t.value === 'light')

    expect(dark?.name).toBe('Escuro')
    expect(light?.name).toBe('Claro')
    expect(dark?.icon).toEqual(useThemeColors(base, translate).themes.value.find(t => t.value === 'dark')?.icon)
    expect(dark?.icon).toBeTruthy()
    expect(light?.icon).toBeTruthy()
  })
})

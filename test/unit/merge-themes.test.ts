import { describe, it, expect, vi } from 'vitest'
import { mergeColorThemes, normalizeColorThemes, findDeprecatedThemeEntries } from '../../src/shared/utils/merge-themes'
import { buildResolvedTheme, getBaseThemeEntries } from '../../src/shared/utils/theme-config'
import { customizeTheme } from '../../src/setup/customize-theme'
import { loadTheme } from '../../src/shared/utils/load'
import { useThemeColors } from '../../src/runtime/composables/useThemeColors'
import type { ThemeDefinition, ThemeEntry } from '../../src/shared/types'

// `vue` isn't a direct dependency of the module (the consumer app provides
// it), so it can't be resolved here — `useThemeColors` only needs `computed`.
vi.mock('vue', () => ({
  computed: <T>(getter: () => T) => ({
    get value() {
      return getter()
    },
  }),
}))

// Overriding only the main colors of the built-in theme, as a consumer
// project would in `nuxt.config.ts` (`venixTheme.color.themes`).
const overrides: Record<string, Partial<ThemeEntry>> = {
  venix: {
    dark: { primary: '#7CC544', secondary: '#4FB3A9' },
    light: { primary: '#3E8E1E', secondary: '#1F7A70' },
  },
}

const baseEntries = getBaseThemeEntries()
const baseVenix = baseEntries.venix as ThemeDefinition
const base = buildResolvedTheme()

describe('mergeColorThemes', () => {
  it('only replaces the keys the override sets, variant by variant', () => {
    const merged = mergeColorThemes(baseEntries, { venix: { dark: { primary: '#7CC544' } } })

    expect(merged.venix).toEqual({ ...baseVenix, dark: { ...baseVenix.dark, primary: '#7CC544' } })
  })

  it('merges a deprecated flat override named after a variant id into that variant', () => {
    const merged = mergeColorThemes(baseEntries, { dark: { primary: '#7CC544' } })

    expect((merged.venix as ThemeDefinition).dark).toEqual({ ...baseVenix.dark, primary: '#7CC544' })
    expect(merged.dark).toBeUndefined()
  })

  it('merges a deprecated flat override of a seasonal theme into its old (dark) variant', () => {
    const merged = mergeColorThemes(baseEntries, { carnaval: { primary: '#123456' } })
    const carnaval = merged.carnaval as ThemeDefinition

    expect(carnaval.dark?.primary).toBe('#123456')
    expect(carnaval.light).toEqual((baseEntries.carnaval as ThemeDefinition).light)
  })

  it('adds a flat theme missing from the base as dark by default', () => {
    const merged = mergeColorThemes(baseEntries, { brand: { primary: '#123456' } })

    expect(merged.brand).toEqual({ dark: true, primary: '#123456' })
  })

  it('does not mutate the base entries', () => {
    const snapshot = structuredClone(baseEntries)
    mergeColorThemes(baseEntries, overrides)

    expect(baseEntries).toEqual(snapshot)
  })
})

describe('normalizeColorThemes', () => {
  it('splits grouped themes into variants (`<theme>-<mode>` unless `id` is set)', () => {
    const { themes, groups } = normalizeColorThemes({
      brand: { translations: { 'en-US': 'Brand' }, light: { primary: '#ffffff' }, dark: { id: 'brand', primary: '#000000' } },
    })

    expect(themes).toEqual({
      'brand-light': { dark: false, primary: '#ffffff' },
      'brand': { dark: true, primary: '#000000' },
    })
    expect(groups.brand).toEqual({ translations: { 'en-US': 'Brand' }, variants: { light: 'brand-light', dark: 'brand' } })
  })

  it('turns a flat theme into a single-variant theme keeping its name as id', () => {
    const { themes, groups } = normalizeColorThemes({ old: { dark: false, primary: '#eeeeee' } })

    expect(themes.old).toEqual({ dark: false, primary: '#eeeeee' })
    expect(groups.old?.variants).toEqual({ light: 'old' })
  })

  it('keeps the built-in variant ids from before the theme/mode split', () => {
    expect(Object.keys(base.colors.themes)).toEqual(expect.arrayContaining(['dark', 'light', 'carnaval', 'natal', 'halloween']))
    expect(base.colors.groups.venix?.variants).toEqual({ dark: 'dark', light: 'light' })
  })

  it('gives every built-in theme both a light and a dark variant', () => {
    for (const name of ['venix', 'carnaval', 'natal', 'halloween']) {
      expect(base.colors.groups[name]?.variants.light, name).toBeTruthy()
      expect(base.colors.groups[name]?.variants.dark, name).toBeTruthy()
    }
  })
})

describe('findDeprecatedThemeEntries', () => {
  it('flags flat overrides, pointing at the grouped equivalent', () => {
    const messages = findDeprecatedThemeEntries(baseEntries, {
      dark: { primary: '#000000' },
      brand: { dark: false, primary: '#ffffff' },
      venix: { light: { primary: '#ffffff' } },
      system: { translations: { 'en-US': 'Auto' } },
    })

    expect(messages).toHaveLength(2)
    expect(messages[0]).toContain('venix: { dark:')
    expect(messages[1]).toContain('`color.themes.brand`')
  })
})

describe('buildResolvedTheme with `colorThemes` overrides', () => {
  it('keeps translations, icon and the other colors of an overridden built-in theme', () => {
    const resolved = buildResolvedTheme({ colorThemes: { venix: { dark: { primary: '#7CC544' } } } })
    const dark = resolved.colors.themes.dark!
    const baseDark = base.colors.themes.dark!

    expect(dark.primary).toBe('#7CC544')
    expect(dark.dark).toBe(true)
    expect(dark.secondary).toBe(baseDark.secondary)
    expect(dark.background).toBe(baseDark.background)
    expect(resolved.colors.groups.venix?.translations).toEqual(base.colors.groups.venix?.translations)
    expect(resolved.colors.groups.venix?.icon).toEqual(base.colors.groups.venix?.icon)
    expect(resolved.colors.themes.light).toEqual(base.colors.themes.light)
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
    expect(runtime.colors.groups).toEqual(buildTime.colors.groups)
  })
})

describe('useVenixTheme().themes / modes', () => {
  const translate = (translations?: Record<string, string>, fallback = '') => translations?.['pt-BR'] ?? fallback

  it('lists the themes, "Automático" first, without separate light/dark entries', () => {
    const { themes } = useThemeColors(buildResolvedTheme({ colorThemes: overrides }), translate)

    expect(themes.value.map(t => t.value)).toEqual(['system', 'venix', 'carnaval', 'natal', 'halloween'])
    expect(themes.value.map(t => t.name)).toEqual(['Automático', 'Venix Sistemas', 'Carnaval', 'Natal', 'Dia das Bruxas'])
    expect(themes.value.every(t => !!t.icon)).toBe(true)
  })

  it('lists the modes with their icons', () => {
    const { modes } = useThemeColors(base, translate)

    expect(modes.value.map(m => [m.value, m.name])).toEqual([['system', 'Automático'], ['light', 'Claro'], ['dark', 'Escuro']])
    expect(modes.value.every(m => !!m.icon)).toBe(true)
  })
})

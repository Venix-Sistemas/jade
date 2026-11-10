import { describe, it, expect, vi } from 'vitest'
import { mergeColorThemes, normalizeColorThemes, findDeprecatedThemeEntries, overridesBrandColors } from '../../src/shared/utils/merge-themes'
import { buildResolvedTheme, findInvalidDefaultColor, getBaseThemeEntries } from '../../src/shared/utils/theme-config'
import type { VenixRuntimeThemeConfig } from '../../src/shared/utils/theme-config'
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
    for (const name of ['venix', 'carnaval', 'pascoa', 'natal', 'halloween']) {
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

describe('overridesBrandColors', () => {
  it('flags color changes to venix, by name or by its variant ids', () => {
    expect(overridesBrandColors(baseEntries, { venix: { dark: { primary: '#000000' } } })).toBe(true)
    expect(overridesBrandColors(baseEntries, { venix: { primary: '#000000' } as Partial<ThemeEntry> })).toBe(true)
    expect(overridesBrandColors(baseEntries, { dark: { primary: '#000000' } })).toBe(true)
    expect(overridesBrandColors(baseEntries, { light: { background: '#ffffff' } })).toBe(true)
  })

  it('ignores names, icons, other themes and new themes', () => {
    expect(overridesBrandColors(baseEntries, undefined)).toBe(false)
    expect(overridesBrandColors(baseEntries, { venix: { translations: { 'en-US': 'Brand' }, icon: '⭐' } })).toBe(false)
    expect(overridesBrandColors(baseEntries, { natal: { dark: { primary: '#000000' } } })).toBe(false)
    expect(overridesBrandColors(baseEntries, { carnaval: { primary: '#000000' } as Partial<ThemeEntry> })).toBe(false)
    expect(overridesBrandColors(baseEntries, { acme: { light: { primary: '#000000' }, dark: { primary: '#ffffff' } } })).toBe(false)
  })
})

describe('findInvalidDefaultColor', () => {
  const colorsFor = (defaultTheme: string, extra: Partial<VenixRuntimeThemeConfig> = {}) =>
    buildResolvedTheme({ defaultTheme, ...extra }).colors

  it('accepts a theme name, a variant id and system', () => {
    expect(findInvalidDefaultColor(colorsFor('venix'))).toBeNull()
    expect(findInvalidDefaultColor(colorsFor('dark'))).toBeNull()
    expect(findInvalidDefaultColor(colorsFor('light'))).toBeNull()
    expect(findInvalidDefaultColor(colorsFor('system'))).toBeNull()
    expect(findInvalidDefaultColor(colorsFor('natal'))).toBeNull()
  })

  it('accepts a project theme', () => {
    const colorThemes = { acme: { light: { primary: '#111111' }, dark: { primary: '#eeeeee' } } }
    expect(findInvalidDefaultColor(colorsFor('acme', { colorThemes }))).toBeNull()
    expect(findInvalidDefaultColor(colorsFor('acme-dark', { colorThemes }))).toBeNull()
  })

  it('flags an unknown theme, listing the available ones', () => {
    const message = findInvalidDefaultColor(colorsFor('acme'))
    expect(message).toContain('`\'acme\'`')
    expect(message).toContain('`\'venix\'`')
    expect(message).not.toContain('`\'system\'`,')
  })

  it('flags a seasonal theme removed with `seasonal: false`', () => {
    expect(findInvalidDefaultColor(colorsFor('natal', { seasonal: false }))).toContain('`\'natal\'`')
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

  it('flags the project themes as custom, but not overrides of built-in ones', () => {
    const resolved = buildResolvedTheme({
      colorThemes: { ...overrides, brand: { light: { primary: '#123456' } }, legacy: { dark: false, primary: '#654321' } },
    })

    expect(resolved.colors.groups.brand?.custom).toBe(true)
    expect(resolved.colors.groups.legacy?.custom).toBe(true)
    expect(resolved.colors.groups.venix?.custom).toBeUndefined()
    expect(resolved.colors.groups.system?.custom).toBeUndefined()
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

describe('color.seasonal: false', () => {
  const noSeasonal = buildResolvedTheme({ seasonal: false, colorThemes: { feriado: { seasonal: true, dateRange: { start: '01-01', end: '12-31' }, dark: { primary: '#000001' } } } })

  it('removes every seasonal theme, built-in and custom, with its variants', () => {
    expect(Object.keys(noSeasonal.colors.groups)).toEqual(['system', 'venix'])
    expect(Object.keys(noSeasonal.colors.themes).sort()).toEqual(['dark', 'light'])
  })

  it('matches the build-time result, so no CSS or Vuetify theme is generated for them', () => {
    const buildTime = customizeTheme(loadTheme(), { color: { seasonal: false } })
    expect(buildTime.colors.groups).toEqual(buildResolvedTheme({ seasonal: false }).colors.groups)
  })

  it('leaves "Automatic" out of the theme list', () => {
    const translate = (translations?: Record<string, string>, fallback = '') => translations?.['pt-BR'] ?? fallback
    expect(useThemeColors(noSeasonal, translate).themes.value.map(t => t.value)).toEqual(['venix'])
  })
})

describe('useVenixTheme().themes / modes', () => {
  const translate = (translations?: Record<string, string>, fallback = '') => translations?.['pt-BR'] ?? fallback

  it('lists the themes, "Automático" first, without separate light/dark entries', () => {
    const { themes } = useThemeColors(buildResolvedTheme({ colorThemes: overrides }), translate)

    expect(themes.value.map(t => t.value)).toEqual(['system', 'venix', 'carnaval', 'pascoa', 'natal', 'halloween'])
    expect(themes.value.map(t => t.name)).toEqual(['Automático', 'Venix', 'Carnaval', 'Páscoa', 'Natal', 'Dia das Bruxas'])
    expect(themes.value.every(t => !!t.icon)).toBe(true)
  })

  it('lists the modes with their icons', () => {
    const { modes } = useThemeColors(base, translate)

    expect(modes.value.map(m => [m.value, m.name])).toEqual([['system', 'Automático'], ['dark', 'Escuro'], ['light', 'Claro']])
    expect(modes.value.every(m => !!m.icon)).toBe(true)
  })
})

describe('tokens (experimental)', () => {
  const light = { primary: '#FF0000', background: '#FAFAFA' }
  const dark = { primary: '#FF6B6B', background: '#0C0C0C' }

  it('deve levar `tokens: true` do tema para as duas variantes', () => {
    const { themes, groups } = normalizeColorThemes({ t: { tokens: true, light, dark } })
    expect(themes['t-light']).toMatchObject({ dark: false, tokens: true })
    expect(themes['t-dark']).toMatchObject({ dark: true, tokens: true })
    expect(groups.t!.tokens).toBe(true)
  })

  it('não deve acrescentar `tokens` a temas que não optaram', () => {
    const { themes, groups } = normalizeColorThemes({ t: { light, dark }, u: { tokens: false, light } })
    expect(themes['t-light']).not.toHaveProperty('tokens')
    expect(themes['u-light']).not.toHaveProperty('tokens')
    expect(groups.t).not.toHaveProperty('tokens')
  })

  it('deve levar `tokens` também no formato antigo (flat)', () => {
    const { themes } = normalizeColorThemes({ legacy: { dark: true, tokens: true, ...dark } })
    expect(themes.legacy).toMatchObject({ dark: true, tokens: true })
  })

  it('deve ativar `tokens` num tema existente por override, sem mexer nas cores', () => {
    const merged = mergeColorThemes({ t: { light, dark } }, { t: { tokens: true } })
    expect(merged.t).toMatchObject({ tokens: true, light, dark })
  })

  it('não deve contar `tokens` como cor do tema', () => {
    const base = { venix: { light, dark } } as Record<string, ThemeEntry>
    expect(overridesBrandColors(base, { venix: { tokens: true } })).toBe(false)
  })
})

describe('neutralTint (experimental)', () => {
  const light = { primary: '#FF0000', background: '#FAFAFA' }
  const dark = { primary: '#FF6B6B', background: '#0C0C0C' }

  it('deve levar `neutralTint: false` do tema para as duas variantes, junto de `tokens`', () => {
    const { themes } = normalizeColorThemes({ t: { tokens: true, neutralTint: false, light, dark } })
    expect(themes['t-light']).toMatchObject({ tokens: true, neutralTint: false })
    expect(themes['t-dark']).toMatchObject({ tokens: true, neutralTint: false })
  })

  it('não deve acrescentar `neutralTint` quando o tema deixa o padrão', () => {
    const { themes } = normalizeColorThemes({ t: { tokens: true, light, dark }, u: { tokens: true, neutralTint: true, light } })
    expect(themes['t-light']).not.toHaveProperty('neutralTint')
    expect(themes['u-light']).not.toHaveProperty('neutralTint')
  })

  it('não deve levar `neutralTint` a um tema sem tokens', () => {
    const { themes } = normalizeColorThemes({ t: { neutralTint: false, light, dark } })
    expect(themes['t-light']).not.toHaveProperty('neutralTint')
  })

  it('deve aplicar `neutralTint` por override num tema existente', () => {
    const merged = mergeColorThemes({ t: { tokens: true, light, dark } }, { t: { neutralTint: false } })
    expect(merged.t).toMatchObject({ tokens: true, neutralTint: false, light, dark })
  })
})

describe('tokens com overrides', () => {
  const light = { primary: '#FF0000', background: '#FAFAFA' }
  const dark = { primary: '#FF6B6B', background: '#0C0C0C' }

  it('deve levar os overrides de `tokens` do tema para as duas variantes', () => {
    const tokens = { 'bg-subtle': 'neutral-3' }
    const { themes } = normalizeColorThemes({ t: { tokens, light, dark } })
    expect(themes['t-light']).toMatchObject({ tokens })
    expect(themes['t-dark']).toMatchObject({ tokens })
  })

  it('deve trocar os overrides por outros em vez de misturá-los', () => {
    const merged = mergeColorThemes({ t: { tokens: { 'bg-subtle': 'neutral-3' }, light, dark } }, { t: { tokens: { 'bg-muted': 'neutral-4' } } })
    expect((merged.t as { tokens: unknown }).tokens).toEqual({ 'bg-muted': 'neutral-4' })
  })
})

// src/shared/utils/merge-themes.ts
import type { ThemeColors, ThemeDefinition, ThemeEntry, ThemeMode, ThemePalette, ThemeVariant, ResolvedThemeGroup } from '../types'
import { COLOR_PROPERTIES, THEME_MODES } from '../constants'
import { tokensEnabled } from '../token-names'

const META_PROPERTIES = ['seasonal', 'dateRange', 'translations', 'icon', 'tokens', 'neutralTint'] as const

/** Grouped format: at least one `light`/`dark` variant object. */
export function isThemeDefinition(entry: Partial<ThemeEntry> | undefined): entry is ThemeDefinition {
  if (!entry) return false
  return THEME_MODES.some(mode => typeof (entry as ThemeDefinition)[mode] === 'object')
}

/**
 * Deprecated flat format: a boolean `dark` flag and/or colors at the top
 * level. An entry with only metadata (`translations`, `icon`…) is neither —
 * it's valid in both formats.
 */
export function isLegacyThemeEntry(entry: Partial<ThemeEntry> | undefined): entry is ThemeColors {
  if (!entry || isThemeDefinition(entry)) return false
  return typeof (entry as ThemeColors).dark === 'boolean'
    || COLOR_PROPERTIES.some(key => (entry as ThemeColors)[key] !== undefined)
}

function pickMeta(entry: Partial<ThemeEntry>): Partial<ThemeDefinition> {
  const meta: Partial<ThemeDefinition> = {}
  for (const key of META_PROPERTIES) {
    if (entry[key] !== undefined) (meta as Record<string, unknown>)[key] = entry[key]
  }
  return meta
}

function pickPalette(entry: Partial<ThemeEntry> | ThemeVariant): ThemePalette {
  const palette: ThemePalette = {}
  for (const key of COLOR_PROPERTIES) {
    const value = (entry as ThemePalette)[key]
    if (value !== undefined) palette[key] = value
  }
  return palette
}

/**
 * `{ tokens: true }` for a theme that opted in (plus `neutralTint: false` when it
 * turned the tint off), `{ tokens: false }` for one that opted out on purpose
 * (the `experimental` option leaves it alone), nothing otherwise, so other
 * variants stay as they were.
 */
function tokensFlag(entry: Partial<ThemeEntry>): { tokens?: boolean | Record<string, string>, neutralTint?: false } {
  if (entry.tokens === false) return { tokens: false }
  if (!tokensEnabled(entry)) return {}
  const tokens = typeof entry.tokens === 'object' ? { ...entry.tokens } : true as const
  return entry.neutralTint === false ? { tokens, neutralTint: false } : { tokens }
}

const variantId = (themeName: string, mode: ThemeMode, variant: ThemeVariant): string =>
  variant.id || `${themeName}-${mode}`

/** Finds the grouped theme and mode a variant id belongs to (e.g. `'dark'` → venix/dark). */
function findVariantOwner(entries: Record<string, ThemeEntry>, id: string): { theme: string, mode: ThemeMode } | null {
  for (const [themeName, entry] of Object.entries(entries)) {
    if (!isThemeDefinition(entry)) continue
    for (const mode of THEME_MODES) {
      const variant = entry[mode]
      if (variant && variantId(themeName, mode, variant) === id) return { theme: themeName, mode }
    }
  }
  return null
}

/**
 * Which variant of the grouped theme `themeName` a deprecated flat override
 * of that same name targets: the variant whose id is the theme's own name
 * (e.g. `carnaval` → the dark one, which keeps the old id), else the one its
 * `dark` flag points at.
 */
function legacyOverrideMode(group: ThemeDefinition, themeName: string, override: ThemeColors): ThemeMode {
  const byId = THEME_MODES.find(mode => group[mode] && variantId(themeName, mode, group[mode]) === themeName)
  return byId ?? (override.dark === false ? 'light' : 'dark')
}

/**
 * Layers the `color.themes` overrides from `nuxt.config` on top of the base
 * entries (`theme.json`), still in config format:
 *
 * - an existing theme only gets the keys the override sets — metadata at the
 *   theme level, colors variant by variant;
 * - a deprecated flat override named after a variant id (`dark: { primary }`)
 *   is merged into that variant (`venix.dark`);
 * - anything else is added as a new theme (a flat one is dark unless it sets
 *   `dark: false`, as before).
 *
 * Single implementation — used both at build time (`customizeTheme`, which
 * feeds the generated CSS and Vuetify) and at runtime (`buildResolvedTheme`),
 * so the two can't diverge.
 */
export function mergeColorThemes(
  baseThemes: Record<string, ThemeEntry>,
  overrides?: Record<string, Partial<ThemeEntry>>,
): Record<string, ThemeEntry> {
  const merged: Record<string, ThemeEntry> = { ...baseThemes }

  for (const [themeName, override] of Object.entries(overrides ?? {})) {
    const existing = merged[themeName]

    if (existing && isThemeDefinition(existing)) {
      const next: ThemeDefinition = { ...existing, ...pickMeta(override) }
      if (isThemeDefinition(override)) {
        for (const mode of THEME_MODES) {
          if (override[mode]) next[mode] = { ...existing[mode], ...override[mode] }
        }
      }
      else if (isLegacyThemeEntry(override)) {
        const mode = legacyOverrideMode(existing, themeName, override)
        next[mode] = { ...existing[mode], ...pickPalette(override) }
      }
      merged[themeName] = next
      continue
    }

    if (existing) {
      merged[themeName] = { ...existing, ...override } as ThemeEntry
      continue
    }

    const owner = isLegacyThemeEntry(override) ? findVariantOwner(merged, themeName) : null
    if (owner) {
      const group = merged[owner.theme] as ThemeDefinition
      merged[owner.theme] = {
        ...group,
        [owner.mode]: { ...group[owner.mode], ...pickPalette(override) },
      }
      continue
    }

    merged[themeName] = isThemeDefinition(override)
      ? override
      : { dark: true, ...override } as ThemeColors
  }

  return merged
}

/**
 * Turns config entries (both formats) into what the runtime works with:
 * `themes`, every concrete variant by id (feeds `data-theme`, the CSS and
 * Vuetify), and `groups`, the selectable themes pointing at their variants.
 * A deprecated flat entry becomes a single-variant theme whose id is its own
 * name, so its `data-theme` value doesn't change.
 */
export function normalizeColorThemes(entries: Record<string, ThemeEntry>): {
  themes: Record<string, ThemeColors>
  groups: Record<string, ResolvedThemeGroup>
} {
  const themes: Record<string, ThemeColors> = {}
  const groups: Record<string, ResolvedThemeGroup> = {}

  for (const [themeName, entry] of Object.entries(entries)) {
    const group: ResolvedThemeGroup = { ...pickMeta(entry), variants: {} }

    if (isThemeDefinition(entry)) {
      for (const mode of THEME_MODES) {
        const variant = entry[mode]
        if (!variant) continue
        const id = variantId(themeName, mode, variant)
        themes[id] = { dark: mode === 'dark', ...tokensFlag(entry), ...pickPalette(variant) }
        group.variants[mode] = id
      }
    }
    else if (isLegacyThemeEntry(entry)) {
      const mode: ThemeMode = entry.dark === false ? 'light' : 'dark'
      themes[themeName] = { dark: mode === 'dark', ...tokensFlag(entry), ...pickPalette(entry) }
      group.variants[mode] = themeName
    }

    groups[themeName] = group
  }

  return { themes, groups }
}

/** The built-in theme carrying the Venix Sistemas brand. */
export const BRAND_THEME = 'venix'

function hasPaletteColors(entry: Partial<ThemeEntry> | ThemeVariant | undefined): boolean {
  return !!entry && COLOR_PROPERTIES.some(key => (entry as ThemePalette)[key] !== undefined)
}

/**
 * Whether the overrides change any color of the brand theme (`venix`) —
 * by its name, in either format, or by one of its variant ids in the flat
 * format (`dark: { primary }`). Its name and icon don't count.
 */
export function overridesBrandColors(
  baseThemes: Record<string, ThemeEntry>,
  overrides?: Record<string, Partial<ThemeEntry>>,
): boolean {
  for (const [themeName, override] of Object.entries(overrides ?? {})) {
    if (themeName === BRAND_THEME) {
      if (isThemeDefinition(override)
        ? THEME_MODES.some(mode => hasPaletteColors(override[mode]))
        : hasPaletteColors(override)) return true
      continue
    }
    if (baseThemes[themeName] || !isLegacyThemeEntry(override)) continue
    if (findVariantOwner(baseThemes, themeName)?.theme === BRAND_THEME && hasPaletteColors(override)) return true
  }
  return false
}

const HEX_COLOR = /^#(?:[\da-f]{3}|[\da-f]{6})$/i
const EASTER_BOUND = /^easter(?:[+-]\d+)?$/
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

/** A `dateRange` bound: `MM-DD` (a real day of the year) or `easter±N`. */
function isValidDateBound(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const bound = value.trim()
  if (EASTER_BOUND.test(bound)) return true

  const match = /^(\d{1,2})-(\d{1,2})$/.exec(bound)
  if (!match) return false
  const month = Number(match[1])
  const day = Number(match[2])
  return month >= 1 && month <= 12 && day >= 1 && day <= DAYS_IN_MONTH[month - 1]!
}

/**
 * Values in the project's `color.themes` that the module would otherwise
 * drop or never use, without a word: a color that isn't a hex (the CSS, the
 * tokens and Vuetify only take `#RGB`/`#RRGGBB`), a seasonal theme whose
 * `dateRange` is missing or malformed (it would never turn on), and two
 * variants that share an id (the last one overwrites the other). Only the
 * themes the project set are checked; the built-in ones are the module's own.
 * Logged once at build time by `module.ts`.
 */
export function findThemeConfigIssues(
  baseThemes: Record<string, ThemeEntry>,
  overrides?: Record<string, Partial<ThemeEntry>>,
): string[] {
  const messages: string[] = []
  const projectThemes = new Set(Object.keys(overrides ?? {}))
  const ownersById = new Map<string, Array<{ themeName: string, path: string }>>()

  for (const [themeName, entry] of Object.entries(mergeColorThemes(baseThemes, overrides))) {
    // Every concrete variant of the entry: its path in `color.themes`, id and colors
    const variants: Array<{ path: string, id: string, palette: ThemePalette }> = []
    if (isThemeDefinition(entry)) {
      for (const mode of THEME_MODES) {
        const variant = entry[mode]
        if (variant) variants.push({ path: `${themeName}.${mode}`, id: variantId(themeName, mode, variant), palette: variant })
      }
    }
    else if (isLegacyThemeEntry(entry)) {
      variants.push({ path: themeName, id: themeName, palette: entry })
    }

    for (const { path, id, palette } of variants) {
      ownersById.set(id, [...(ownersById.get(id) ?? []), { themeName, path }])

      if (!projectThemes.has(themeName)) continue
      for (const key of COLOR_PROPERTIES) {
        const value = palette[key]
        if (value === undefined || (typeof value === 'string' && HEX_COLOR.test(value))) continue
        messages.push(`\`color.themes.${path}.${key}\` is \`${JSON.stringify(value)}\`, which is not a hex color (\`#RGB\` or \`#RRGGBB\`), so it is ignored.`)
      }
    }

    if (!projectThemes.has(themeName)) continue

    const { seasonal, dateRange } = entry
    if (seasonal === true && !dateRange) {
      messages.push(`\`color.themes.${themeName}\` is \`seasonal\` but has no \`dateRange\`, so it never turns on. Add \`dateRange: { start: 'MM-DD', end: 'MM-DD' }\`.`)
    }
    else if (dateRange && seasonal !== true) {
      messages.push(`\`color.themes.${themeName}.dateRange\` has no effect without \`seasonal: true\`.`)
    }
    else if (dateRange) {
      for (const bound of ['start', 'end'] as const) {
        if (isValidDateBound(dateRange[bound])) continue
        messages.push(`\`color.themes.${themeName}.dateRange.${bound}\` is \`${JSON.stringify(dateRange[bound])}\`, which is not a date, so the theme never turns on. Use \`'MM-DD'\`, \`'easter'\`, \`'easter-47'\` or \`'easter+1'\`.`)
      }
    }
  }

  for (const [id, owners] of ownersById) {
    if (owners.length < 2 || !owners.some(owner => projectThemes.has(owner.themeName))) continue
    messages.push(`${owners.map(owner => `\`color.themes.${owner.path}\``).join(' and ')} share the id \`${id}\`, so one overwrites the other. Give one of them a different \`id\` (or name).`)
  }

  return messages
}

/**
 * Overrides still written in the deprecated flat format, with the message to
 * show for each — logged once at build time by `module.ts`.
 */
export function findDeprecatedThemeEntries(
  baseThemes: Record<string, ThemeEntry>,
  overrides?: Record<string, Partial<ThemeEntry>>,
): string[] {
  const messages: string[] = []

  for (const [themeName, override] of Object.entries(overrides ?? {})) {
    if (!isLegacyThemeEntry(override)) continue

    const base = baseThemes[themeName]
    const owner = base && isThemeDefinition(base)
      ? { theme: themeName, mode: legacyOverrideMode(base, themeName, override) }
      : base ? null : findVariantOwner(baseThemes, themeName)
    messages.push(owner
      ? `\`color.themes.${themeName}\` overrides a theme variant in the deprecated flat format. Use \`${owner.theme}: { ${owner.mode}: { ... } }\` instead.`
      : `\`color.themes.${themeName}\` uses the deprecated flat format (\`dark: true/false\` plus colors). Use \`${themeName}: { light: { ... }, dark: { ... } }\` instead.`)
  }

  return messages
}

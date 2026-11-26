// src/setup/register-vuetify.ts
import { addPlugin } from '@nuxt/kit'
import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import type { ThemeConfig, ColorsConfig, ContrastLevel, ThemeColors } from '../shared/types'
import { isColorTheme, getThemeHexColors } from '../shared/utils/theme-resolve'
import { generateTokens } from '../shared/css/tokens'
import { generateBoldSurface } from '../shared/css/bold'
import { onColor } from '../shared/utils/contrast'
import { TOKEN_ROLES, tokensEnabled } from '../shared/token-names'

const HEX = /^#(?:[\da-f]{3}|[\da-f]{6})$/i

interface VuetifyThemeDefinition {
  dark: boolean
  colors: Record<string, string>
}

interface VuetifyRegisterModuleConfig {
  vuetifyOptions?: {
    theme?: {
      defaultTheme?: string
      themes?: Record<string, VuetifyThemeDefinition>
    }
  }
}

type RegisterModuleFn = (config: VuetifyRegisterModuleConfig) => void

/**
 * The text color of every brand and status color the theme sets (`on-primary`,
 * `on-success`…): black or white, whichever reads better over it, the same as
 * the `on-<role>` tokens. Left to itself, Vuetify picks by its own contrast
 * model, which puts white on a bright orange (2.4:1).
 */
function onColorsForVuetify(themeColors: ThemeColors): Record<string, string> {
  return Object.fromEntries(TOKEN_ROLES.flatMap((role) => {
    const color = themeColors[role]
    return color && HEX.test(color) ? [[`on-${role}`, onColor(color)]] : []
  }))
}

/**
 * The surfaces of a token theme (`tokens: true`) for Vuetify: `surface` is
 * `bg-subtle` (unless the theme sets `background2`), and `on-background` /
 * `on-surface` are the main `text`.
 */
function tokenSurfacesForVuetify(themeColors: ThemeColors, level: ContrastLevel, hasBackground2: boolean): Record<string, string> {
  const tokens = Object.fromEntries(generateTokens(themeColors, level))
  const colors: Record<string, string> = {}

  if (tokens['bg-subtle'] && !hasBackground2) colors.surface = tokens['bg-subtle']
  if (tokens.text) {
    colors['on-background'] = tokens.text
    colors['on-surface'] = tokens.text
  }

  return colors
}

/** The Vuetify colors of the bold scope: the variant's own, with the panel as background and surface and the flipped fills. */
function boldVuetifyColors(base: Record<string, string>, tokens: Record<string, string>, themeColors: ThemeColors): Record<string, string> {
  const colors: Record<string, string> = { ...base }
  if (tokens.bg) colors.background = tokens.bg
  if (tokens['bg-subtle']) colors.surface = tokens['bg-subtle']
  colors['on-background'] = tokens.text ?? base['on-background'] ?? '#FFFFFF'
  colors['on-surface'] = colors['on-background']
  colors.inverse = tokens.bg ?? base.inverse ?? '#000000'

  for (const role of TOKEN_ROLES) {
    if (!themeColors[role]) continue
    const fill = tokens[`fill-${role}`]
    const on = tokens[`on-${role}`]
    if (fill) colors[role] = fill
    if (on) colors[`on-${role}`] = on
  }
  return colors
}

/**
 * Converts the module's color themes (real hex values, not CSS vars) to the
 * format Vuetify expects, since Vuetify computes contrast/on-colors in JS and
 * needs the concrete values, not `var(--jade-x)`.
 */
export function buildVuetifyThemes(colors: ColorsConfig): Record<string, VuetifyThemeDefinition> {
  const themes: Record<string, VuetifyThemeDefinition> = {}

  for (const [name, themeColors] of Object.entries(colors.themes)) {
    if (!isColorTheme(themeColors)) continue // e.g. the 'system' placeholder, no real colors

    const isDark = themeColors.dark === true
    const vuetifyColors: Record<string, string> = Object.fromEntries(getThemeHexColors(themeColors))

    // 'surface' is Vuetify's semantic slot for cards/toolbars/etc; we use
    // background2 as the closest equivalent in our color system.
    if (themeColors.background2) vuetifyColors.surface = themeColors.background2
    vuetifyColors.inverse = isDark ? '#FFFFFF' : '#000000'

    // Legible text on every colored component, on every theme
    Object.assign(vuetifyColors, onColorsForVuetify(themeColors))
    // (The surfaces not for the module's own default tokens on its built-in
    // themes: in 1.x Vuetify keeps theirs, see `defaultTokens`.)
    if (tokensEnabled(themeColors) && !colors.defaultTokens?.includes(name)) Object.assign(vuetifyColors, tokenSurfacesForVuetify(themeColors, colors.contrast || 'AA', !!themeColors.background2))

    themes[name] = { dark: isDark, colors: vuetifyColors }

    // `surfaces: 'bold'`: a second Vuetify theme for the areas in the brand
    // color (`<v-navigation-drawer theme="natal-light-bold">`). Its `primary`
    // is the flipped fill (a white button on the panel), so `color="primary"`
    // reads there.
    const bold = tokensEnabled(themeColors) ? generateBoldSurface(themeColors, colors.contrast || 'AA') : null
    if (bold) themes[`${name}-bold`] = { dark: bold.dark, colors: boldVuetifyColors(vuetifyColors, Object.fromEntries(bold.tokens), themeColors) }
  }

  return themes
}

/**
 * Registers the color themes with Vuetify (`vuetify-nuxt-module`) via the
 * `vuetify:registerModule` build hook, and adds a runtime plugin that
 * resolves the active theme (cookie) to keep Vuetify in sync with the rest
 * of the module. A safe no-op if vuetify-nuxt-module isn't installed.
 *
 * Requires `@venix-sistemas/jade` to appear BEFORE the Vuetify module
 * in `modules`, since the registration needs to happen before Vuetify
 * resolves its theme configuration.
 */
export function registerThemeVuetify(nuxt: Nuxt, resolver: Resolver, theme: ThemeConfig, defaultColor: string, enabled: boolean) {
  if (!enabled || theme.colors?.enabled === false) return

  const themes = buildVuetifyThemes(theme.colors)
  if (Object.keys(themes).length === 0) return

  const hookRegisterModule = nuxt.hook as unknown as (
    name: 'vuetify:registerModule',
    fn: (register: RegisterModuleFn) => void,
  ) => void

  hookRegisterModule('vuetify:registerModule', (register) => {
    register({
      vuetifyOptions: {
        theme: {
          defaultTheme: defaultColor,
          themes,
        },
      },
    })
  })

  addPlugin(resolver.resolve('./runtime/plugins/vuetify-theme'))
}

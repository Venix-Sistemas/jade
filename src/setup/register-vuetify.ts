// src/setup/register-vuetify.ts
import { addPlugin } from '@nuxt/kit'
import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import type { ThemeConfig, ColorsConfig, ContrastLevel, ThemeColors } from '../shared/types'
import { isColorTheme, getThemeHexColors } from '../shared/utils/theme-resolve'
import { generateTokens } from '../shared/css/tokens'
import { TOKEN_ROLES, tokensEnabled } from '../shared/token-names'

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
 * What a token theme (`tokens: true`) gives Vuetify besides its seeds. Vuetify
 * picks the text color on `primary`/`secondary` itself (white or black by
 * its own contrast model, which can disagree with WCAG: it prefers white on
 * the Venix red, 4.0:1), and accepts an `on-<color>` entry as an override, so
 * the generated `on` tokens go in. Surfaces and their text follow the tokens
 * too: `surface` is `bg-subtle` (unless the theme sets `background2`), and
 * `on-background` / `on-surface` are the main `text`.
 */
function tokenColorsForVuetify(themeColors: ThemeColors, level: ContrastLevel, hasBackground2: boolean): Record<string, string> {
  const tokens = Object.fromEntries(generateTokens(themeColors, level))
  const colors: Record<string, string> = {}

  for (const role of TOKEN_ROLES) {
    const on = tokens[`on-${role}`]
    if (on) colors[`on-${role}`] = on
  }
  if (tokens['bg-subtle'] && !hasBackground2) colors.surface = tokens['bg-subtle']
  if (tokens.text) {
    colors['on-background'] = tokens.text
    colors['on-surface'] = tokens.text
  }

  return colors
}

/**
 * Converts the module's color themes (real hex values, not CSS vars) to the
 * format Vuetify expects, since Vuetify computes contrast/on-colors in JS and
 * needs the concrete values, not `var(--color-x)`.
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

    // (Not for the module's own default tokens on its built-in themes: in 1.x
    // Vuetify keeps picking its own text color on `primary`, see `defaultTokens`.)
    if (tokensEnabled(themeColors) && !colors.defaultTokens?.includes(name)) Object.assign(vuetifyColors, tokenColorsForVuetify(themeColors, colors.contrast || 'AA', !!themeColors.background2))

    themes[name] = { dark: isDark, colors: vuetifyColors }
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

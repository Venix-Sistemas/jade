// src/setup/register-vuetify.ts
import { addPlugin } from '@nuxt/kit'
import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import type { ThemeConfig, ColorsConfig } from '../shared/types'
import { NON_COLOR_PROPERTIES } from '../shared/constants'

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
 * Converts the module's color themes (real hex values, not CSS vars) to the
 * format Vuetify expects, since Vuetify computes contrast/on-colors in JS and
 * needs the concrete values, not `var(--color-x)`.
 */
function buildVuetifyThemes(colors: ColorsConfig): Record<string, VuetifyThemeDefinition> {
  const themes: Record<string, VuetifyThemeDefinition> = {}

  for (const [name, themeColors] of Object.entries(colors.themes)) {
    if (!themeColors.primary && !themeColors.background) continue // e.g. the 'system' placeholder, no real colors

    const isDark = themeColors.dark === true
    const vuetifyColors: Record<string, string> = {}

    for (const [key, value] of Object.entries(themeColors)) {
      if (NON_COLOR_PROPERTIES.includes(key as typeof NON_COLOR_PROPERTIES[number])) continue
      if (typeof value !== 'string' || !value.startsWith('#')) continue
      vuetifyColors[key] = value
    }

    // 'surface' is Vuetify's semantic slot for cards/toolbars/etc; we use
    // background2 as the closest equivalent in our color system.
    if (themeColors.background2) vuetifyColors.surface = themeColors.background2
    vuetifyColors.inverse = isDark ? '#FFFFFF' : '#000000'

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

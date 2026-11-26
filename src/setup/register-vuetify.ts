// src/setup/register-vuetify.ts
import { addPlugin } from '@nuxt/kit'
import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import type { ThemeConfig } from '../shared/types'
import { buildVuetifyThemes } from '../shared/vuetify'
import type { VuetifyThemeDefinition } from '../shared/vuetify'

export { buildVuetifyThemes }

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

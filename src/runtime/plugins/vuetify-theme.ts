// runtime/plugins/vuetify-theme.ts
import { watch } from 'vue'
import { defineNuxtPlugin, useRuntimeConfig, useCookie, useState } from '#app'
import { THEME_PREFERENCE_COOKIE, THEME_RESOLVED_COOKIE, DEFAULT_THEME } from '../../shared/constants'
import { buildResolvedTheme } from '../../shared/utils/theme-config'
import { resolveThemePreference } from '../../shared/utils/theme-resolve'

interface VuetifyBeforeCreateContext {
  vuetifyOptions?: {
    theme?: {
      defaultTheme?: string
      themes?: Record<string, unknown>
    }
  }
}

interface VuetifyInstance {
  theme: {
    // `change()` é a API atual (versões recentes do Vuetify deprecaram a
    // atribuição direta a `global.name.value`); mantido opcional porque
    // versões mais antigas do Vuetify não têm esse método — ver `applyVuetifyTheme`.
    change?: (name: string) => void
    global: {
      name: { value: string }
    }
  }
}

/**
 * Aplica o tema na instância do Vuetify preferindo `theme.change()` (API
 * atual, evita o aviso de depreciação "use theme.change() instead") e caindo
 * para a atribuição direta em `global.name.value` só em versões do Vuetify
 * antigas o suficiente para não ter `change()`.
 */
function applyVuetifyTheme(vuetify: VuetifyInstance, name: string): void {
  if (typeof vuetify.theme.change === 'function') {
    vuetify.theme.change(name)
  }
  else {
    vuetify.theme.global.name.value = name
  }
}

export default defineNuxtPlugin({
  name: 'venix-theme-vuetify-sync',
  enforce: 'pre',
  setup(nuxtApp) {
    const config = useRuntimeConfig()
    const themeConfig = config.public.venixTheme

    const resolvedCookie = useCookie<string>(THEME_RESOLVED_COOKIE)
    const preferenceCookie = useCookie<string>(THEME_PREFERENCE_COOKIE)

    const theme = buildResolvedTheme(themeConfig)
    const defaultTheme = theme.colors.defaultColor || DEFAULT_THEME

    // 'vuetify:before-create' só existe quando vuetify-nuxt-module está instalado
    // (peer opcional); o cast é seguro porque o hook nunca dispara sem o módulo presente.
    const hookBeforeCreate = nuxtApp.hook as unknown as (
      name: 'vuetify:before-create',
      fn: (ctx: VuetifyBeforeCreateContext) => void,
    ) => void

    hookBeforeCreate('vuetify:before-create', ({ vuetifyOptions }) => {
      const themes = vuetifyOptions?.theme?.themes
      if (!vuetifyOptions?.theme || !themes) return

      let resolved = defaultTheme
      if (resolvedCookie.value && themes[resolvedCookie.value]) {
        resolved = resolvedCookie.value
      }
      else if (preferenceCookie.value && themes[preferenceCookie.value]) {
        resolved = preferenceCookie.value
      }

      vuetifyOptions.theme.defaultTheme = resolved
    })

    // 'vuetify:before-create' só decide o tema da primeira renderização — sem
    // isso, trocar de tema via `useVenixTheme().theme.preference` depois não
    // refletia nos componentes do Vuetify (`color="primary"` etc.) até um
    // reload completo. 'vuetify:ready' dá acesso à instância viva do Vuetify
    // (`theme.global.name` é reativo — ver docs do vuetify-nuxt-module), então
    // observamos o mesmo estado compartilhado que `useVenixTheme()` usa para
    // `theme.preference` (`useState('venix-theme-preference')`) para manter
    // os dois em sincronia em tempo real.
    if (import.meta.client) {
      const hookReady = nuxtApp.hook as unknown as (
        name: 'vuetify:ready',
        fn: (vuetify: VuetifyInstance) => void,
      ) => void

      hookReady('vuetify:ready', (vuetify) => {
        const preference = useState<string | undefined>('venix-theme-preference')

        watch(preference, (pref) => {
          if (!pref) return
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          const resolved = resolveThemePreference(pref, theme.colors.themes, defaultTheme, prefersDark)
          applyVuetifyTheme(vuetify, resolved)
        }, { immediate: true })
      })
    }
  },
})

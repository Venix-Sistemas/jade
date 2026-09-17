// runtime/plugins/vuetify-theme.ts
import { defineNuxtPlugin, useRuntimeConfig, useCookie } from '#app'
import { THEME_PREFERENCE_COOKIE, THEME_RESOLVED_COOKIE, THEME_APPLIED_EVENT, DEFAULT_THEME } from '../../shared/constants'
import { buildResolvedTheme } from '../../shared/utils/theme-config'

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
    // `change()` is the current API (recent Vuetify versions deprecated
    // directly assigning to `global.name.value`); kept optional because
    // older Vuetify versions don't have this method — see `applyVuetifyTheme`.
    change?: (name: string) => void
    global: {
      name: { value: string }
    }
  }
}

/**
 * Applies the theme on the Vuetify instance, preferring `theme.change()`
 * (the current API, avoids the "use theme.change() instead" deprecation
 * warning) and falling back to directly assigning `global.name.value` only
 * on Vuetify versions old enough not to have `change()`.
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

    // 'vuetify:before-create' only exists when vuetify-nuxt-module is
    // installed (optional peer); the cast is safe because the hook never
    // fires without the module present.
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

    // 'vuetify:before-create' only decides the theme for the first render —
    // without this, switching themes later via
    // `useVenixTheme().theme.preference` wouldn't reflect on Vuetify
    // components (`color="primary"` etc.) until a full reload. 'vuetify:ready'
    // gives access to the live Vuetify instance (`theme.global.name` is
    // reactive — see the vuetify-nuxt-module docs).
    //
    // We listen for THEME_APPLIED_EVENT instead of watching `theme.preference`
    // with our own `watch()`: a separate `watch()` runs asynchronously,
    // decoupled from the View Transition that `useVenixTheme.ts` uses to
    // animate the switch, so the Vuetify update (which recomputes CSS vars
    // for the whole component tree) ended up competing with the
    // transition's snapshot capture for the same frame — causing a real,
    // noticeable freeze. Reacting to the event (dispatched synchronously
    // inside the transition's own callback) guarantees both mutations are
    // part of the same transition instead of two competing updates. No
    // initial sync needed here: the theme already arrives correct on the
    // first render via 'vuetify:before-create'.
    if (import.meta.client) {
      const hookReady = nuxtApp.hook as unknown as (
        name: 'vuetify:ready',
        fn: (vuetify: VuetifyInstance) => void,
      ) => void

      hookReady('vuetify:ready', (vuetify) => {
        window.addEventListener(THEME_APPLIED_EVENT, ((event: CustomEvent<string>) => {
          applyVuetifyTheme(vuetify, event.detail)
        }) as EventListener)
      })
    }
  },
})

// runtime/plugins/vuetify-theme.ts
import { defineNuxtPlugin, useRuntimeConfig, useCookie } from '#app'
import type { NuxtApp } from '#app'
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
    /** The theme stylesheet (`--v-theme-*` variables + utility classes) Vuetify hands to unhead. */
    styles: { value: string }
  }
}

/**
 * Runtime hooks fired by `vuetify-nuxt-module`. Typed locally rather than by
 * augmenting `RuntimeNuxtHooks` in `#app`: the Vuetify module augments that
 * same interface with its own signatures when installed, and two declarations
 * of the same hook with different types would break type-checking in the
 * consumer app.
 */
interface VuetifyRuntimeHooks {
  'vuetify:before-create': (ctx: VuetifyBeforeCreateContext) => void
  'vuetify:ready': (vuetify: VuetifyInstance) => void
}

type VuetifyHook = <K extends keyof VuetifyRuntimeHooks>(name: K, fn: VuetifyRuntimeHooks[K]) => void

interface HeadHooks {
  hook: (name: 'dom:rendered', fn: () => void) => () => void
}

/** Id of the `<style>` Vuetify's theme pushes through unhead (`lib/composables/theme.js`). */
const VUETIFY_THEME_STYLESHEET_ID = 'vuetify-theme-stylesheet'
const EARLY_THEME_STYLESHEET_ID = 'venix-vuetify-theme-early'

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

/**
 * SPA mode (`ssr: false`) only. With unhead present, Vuetify hands its theme
 * stylesheet to `head.push()`, and unhead only writes it to the DOM after the
 * first render — so the page showed for a moment without any `--v-theme-*`
 * color. With SSR the stylesheet already comes in the HTML, so this never
 * happens there.
 *
 * Writes the same stylesheet into `<head>` right away (before mount), and
 * removes it as soon as unhead's own copy reaches the DOM.
 */
function writeEarlyThemeStylesheet(nuxtApp: NuxtApp, vuetify: VuetifyInstance): void {
  const css = vuetify.theme.styles.value
  // Nothing to bridge: Vuetify's theme is disabled, or Vuetify already wrote
  // its own `<style>` directly (no unhead in the app).
  if (!css || document.getElementById(VUETIFY_THEME_STYLESHEET_ID)) return

  // Without unhead's hooks there'd be no signal to remove the early copy.
  const headHooks = (nuxtApp.vueApp._context.provides.usehead as { hooks?: HeadHooks } | undefined)?.hooks
  if (!headHooks) return

  const style = document.createElement('style')
  style.id = EARLY_THEME_STYLESHEET_ID
  style.textContent = css
  document.head.appendChild(style)

  const unhook = headHooks.hook('dom:rendered', () => {
    if (!document.getElementById(VUETIFY_THEME_STYLESHEET_ID)) return
    style.remove()
    unhook()
  })
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

    // The 'vuetify:*' hooks only exist when vuetify-nuxt-module is installed
    // (optional peer); the cast is safe because they never fire without the
    // module present.
    const hookVuetify = nuxtApp.hook as unknown as VuetifyHook

    hookVuetify('vuetify:before-create', ({ vuetifyOptions }) => {
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
      hookVuetify('vuetify:ready', (vuetify) => {
        if (!nuxtApp.payload.serverRendered) writeEarlyThemeStylesheet(nuxtApp, vuetify)

        window.addEventListener(THEME_APPLIED_EVENT, ((event: CustomEvent<string>) => {
          applyVuetifyTheme(vuetify, event.detail)
        }) as EventListener)
      })
    }
  },
})

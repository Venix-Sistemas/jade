// runtime/plugins/vuetify0.ts
//
// `vuetify0: true`: registers the module's color themes in Vuetify0 and keeps
// both on the same one, so its `useTheme()` works. The colors themselves are
// the module's CSS (`--v0-*` pointing at `--jade-*`, see shared/css/vuetify0.ts),
// which wins over the stylesheet Vuetify0 writes: no flash before hydration.
import { watch } from 'vue'
import { defineNuxtPlugin, useCookie, useRuntimeConfig } from '#app'
import { createThemePlugin, useTheme } from '@vuetify/v0'
import { V0UnheadThemeAdapter } from '@vuetify/v0/theme/adapters/unhead'
import { useJade } from '../composables/useVenixTheme'
import { THEME_APPLIED_EVENT, THEME_COOKIE_OPTIONS, THEME_MODE_COOKIE, THEME_PREFERENCE_COOKIE, THEME_RESOLVED_COOKIE } from '../../shared/constants'
import { vuetify0Colors } from '../../shared/css/vuetify0'
import { buildResolvedTheme } from '../../shared/utils/theme-config'
import { findVariantOwner, isColorTheme, resolveServerTheme } from '../../shared/utils/theme-resolve'

export default defineNuxtPlugin({
  name: 'jade-vuetify0',
  setup(nuxtApp) {
    const theme = buildResolvedTheme(useRuntimeConfig().public.venixTheme)

    const themes = Object.fromEntries(
      Object.entries(theme.colors.themes)
        .filter(([id, colors]) => id !== 'system' && isColorTheme(colors))
        .map(([id, colors]) => [id, { dark: colors.dark === true, colors: vuetify0Colors(colors) }]),
    )

    // The theme the page shows: the pre-hydration script's on the client, the
    // same guess as the SSR plugin on the server
    const initial = (import.meta.client && window.__VENIX_INITIAL_THEME__)
      || resolveServerTheme(
        useCookie<string>(THEME_PREFERENCE_COOKIE, THEME_COOKIE_OPTIONS).value,
        useCookie<string>(THEME_MODE_COOKIE, THEME_COOKIE_OPTIONS).value,
        useCookie<string>(THEME_RESOLVED_COOKIE, THEME_COOKIE_OPTIONS).value,
        theme.colors,
      )

    nuxtApp.vueApp.use(createThemePlugin({
      adapter: new V0UnheadThemeAdapter(),
      default: themes[initial] ? initial : Object.keys(themes)[0],
      // Vuetify0 only writes to `<html>`: the module's own attribute is what the CSS reads
      target: null,
      themes,
    }))

    if (!import.meta.client) return

    nuxtApp.hook('app:mounted', () => {
      const v0 = nuxtApp.vueApp.runWithContext(() => useTheme())
      const jade = nuxtApp.runWithContext(() => useJade()) as ReturnType<typeof useJade>
      let applied = String(v0.selectedId.value)

      // Jade -> Vuetify0
      const follow = (id: string) => {
        if (!themes[id] || id === applied) return
        applied = id
        v0.select(id)
      }
      window.addEventListener(THEME_APPLIED_EVENT, ((event: CustomEvent<string>) => follow(event.detail)) as EventListener)
      follow(jade.theme.value.value)

      // Vuetify0 -> Jade: a variant picked there picks its theme and mode here
      watch(() => v0.selectedId.value, (id) => {
        if (id === undefined || String(id) === applied) return
        applied = String(id)
        // Theme and mode apart: a variant id such as `natal` is also a theme's name
        const owner = findVariantOwner(theme.colors, applied)
        if (!owner) return
        jade.theme.set(owner.theme as Parameters<typeof jade.theme.set>[0])
        jade.mode.set(owner.mode)
      })
    })
  },
})

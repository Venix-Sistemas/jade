// runtime/nitro/theme-init.ts
import { defineNitroPlugin, useRuntimeConfig } from 'nitropack/runtime'
import initTheme from '../scripts/theme-init'
import { buildResolvedTheme } from '../../shared/utils/theme-config'

interface RenderHtmlContext {
  head: string[]
}

export default defineNitroPlugin((nitroApp) => {
  // Same merge `theme-init.server.ts`/`useVenixTheme.ts` use — the static
  // theme.json overridden by any `color.themes` customizations from
  // `nuxt.config.ts` (resolved into runtimeConfig at build time). Using the
  // static theme.json alone here (as before) meant a consumer's own custom
  // themes (e.g. a project-only seasonal one) weren't recognized by this
  // script: their `venix-theme-resolved`/`venix-theme-preference` cookies
  // would fail the `isColorTheme` check against the *static* theme set and
  // silently fall back to the default theme on every full reload, undoing
  // the selection right before hydration.
  //
  // Computed once when the plugin registers (Nitro startup, after
  // runtimeConfig is ready) and reused for every request — public
  // runtimeConfig doesn't vary per request, so there's no need to redo this
  // per response.
  const theme = buildResolvedTheme(useRuntimeConfig().public.venixTheme)

  // Serializes `initTheme` (has to be 100% self-contained — see the comment
  // in that file) into an IIFE and injects it into the HTML response's
  // `<head>`, before the Vue bundle — that's what avoids the
  // wrong-theme/locale flash before hydration (the previous project did
  // this manually via `app.head.script` pointing at a static public file).
  const inlineScript = `<script>(${initTheme.toString()})(${JSON.stringify(theme)})</script>`

  // `render:html` is added by Nuxt's own Nitro integration, it isn't part of
  // "plain" nitropack's `NitroRuntimeHooks` — cast needed for the same
  // reason as Vuetify's optional hooks in `runtime/plugins/vuetify-theme.ts`.
  const hookRenderHtml = nitroApp.hooks.hook as unknown as (
    name: 'render:html',
    fn: (html: RenderHtmlContext) => void,
  ) => void

  hookRenderHtml('render:html', (html) => {
    html.head.unshift(inlineScript)
  })
})

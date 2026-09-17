// runtime/nitro/theme-init.ts
import { defineNitroPlugin } from 'nitropack/runtime'
import initTheme from '../scripts/theme-init'
import themeData from '../../shared/theme.json' with { type: 'json' }
import type { ThemeConfig } from '../../shared/types'

interface RenderHtmlContext {
  head: string[]
}

// Serializes `initTheme` (has to be 100% self-contained — see the comment in
// that file) into an IIFE and injects it into the HTML response's `<head>`,
// before the Vue bundle — that's what avoids the wrong-theme/locale flash
// before hydration (the previous project did this manually via
// `app.head.script` pointing at a static public file). Computed once at
// server boot, not per request: `themeData` is static.
const inlineScript = `<script>(${initTheme.toString()})(${JSON.stringify(themeData as ThemeConfig)})</script>`

export default defineNitroPlugin((nitroApp) => {
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

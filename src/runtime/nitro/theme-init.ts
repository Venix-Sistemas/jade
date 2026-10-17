// runtime/nitro/theme-init.ts
import { defineNitroPlugin, useRuntimeConfig } from 'nitropack/runtime'
import { createInitThemeOptions, renderInitThemeScript } from '../scripts/theme-init'
import { buildResolvedTheme } from '../../shared/utils/theme-config'

interface RenderHtmlContext {
  head: string[]
}

interface RenderHtmlMeta {
  event?: { context?: { security?: { nonce?: string } } }
}

export default defineNitroPlugin((nitroApp) => {
  // The same resolved theme the rest of the module uses (theme.json plus the
  // `color.themes` customizations from `nuxt.config.ts`), so the script
  // recognizes a project's own themes too. Built once at Nitro startup:
  // public runtimeConfig doesn't vary per request.
  const themeConfig = useRuntimeConfig().public.venixTheme
  const theme = buildResolvedTheme(themeConfig)

  // The pre-hydration script (see `runtime/scripts/theme-init.ts`), injected
  // inline at the top of `<head>`, before the Vue bundle — that's what avoids
  // the wrong-theme flash before hydration.
  const scriptBody = renderInitThemeScript(theme, createInitThemeOptions(themeConfig?.requireConsent !== false))

  // `render:html` is added by Nuxt's own Nitro integration, it isn't part of
  // "plain" nitropack's `NitroRuntimeHooks` — cast needed for the same
  // reason as Vuetify's optional hooks in `runtime/plugins/vuetify-theme.ts`.
  const hookRenderHtml = nitroApp.hooks.hook as unknown as (
    name: 'render:html',
    fn: (html: RenderHtmlContext, meta: RenderHtmlMeta) => void,
  ) => void

  hookRenderHtml('render:html', (html, { event }) => {
    // A strict Content-Security-Policy blocks inline scripts without the
    // request's nonce; `nuxt-security` exposes it here when nonces are on.
    const nonce = event?.context?.security?.nonce
    const nonceAttr = nonce ? ` nonce="${nonce.replace(/"/g, '&quot;')}"` : ''
    html.head.unshift(`<script${nonceAttr}>${scriptBody}</script>`)
  })
})

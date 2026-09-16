// src/setup/register-plugins.ts
import { addPlugin, addServerPlugin } from '@nuxt/kit'
import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

export function registerThemePlugins(_nuxt: Nuxt, resolver: Resolver, shouldApplyColors: boolean) {
  if (shouldApplyColors) {
    addPlugin({
      src: resolver.resolve('./runtime/plugins/theme-init.server'),
      mode: 'server',
    })

    // Injeta o script anti-FOUC (`runtime/scripts/theme-init.ts`) inline no
    // `<head>` via o hook `render:html` do Nitro — ver `runtime/nitro/theme-init.ts`.
    addServerPlugin(resolver.resolve('./runtime/nitro/theme-init'))
  }

  addPlugin(resolver.resolve('./runtime/plugin'))
}

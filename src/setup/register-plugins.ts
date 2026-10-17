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

    // Injects the anti-FOUC script (`runtime/scripts/theme-init.ts`) inline into
    // `<head>` through Nitro's `render:html` hook — see `runtime/nitro/theme-init.ts`.
    addServerPlugin(resolver.resolve('./runtime/nitro/theme-init'))
  }
}

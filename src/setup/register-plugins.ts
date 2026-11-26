// src/setup/register-plugins.ts
import { addPlugin, addNitroPlugin } from '@nuxt/kit'
import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

export function registerThemePlugins(nuxt: Nuxt, resolver: Resolver, shouldApplyColors: boolean) {
  if (shouldApplyColors) {
    // For `venix-jade audit`, run against the development server
    if (nuxt.options.dev) {
      addPlugin({ src: resolver.resolve('./runtime/plugins/audit.client'), mode: 'client' })
    }

    addPlugin({
      src: resolver.resolve('./runtime/plugins/theme-init.server'),
      mode: 'server',
    })

    // Injects the anti-FOUC script (`runtime/scripts/theme-init.ts`) inline into
    // `<head>` through Nitro's `render:html` hook — see `runtime/nitro/theme-init.ts`.
    addNitroPlugin(resolver.resolve('./runtime/nitro/theme-init'))
  }
}

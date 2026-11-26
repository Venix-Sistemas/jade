// src/setup/register-vuetify0.ts
import { addPlugin, tryResolveModule, useLogger } from '@nuxt/kit'
import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

/**
 * `vuetify0: true`: the plugin that registers the themes in Vuetify0 and keeps
 * both in sync. Skipped, with a warning, when `@vuetify/v0` isn't installed.
 */
export async function registerThemeVuetify0(nuxt: Nuxt, resolver: Resolver, legacyNames: boolean) {
  if (!await tryResolveModule('@vuetify/v0', nuxt.options.modulesDir)) {
    useLogger('jade').warn('`vuetify0` is on but `@vuetify/v0` isn\'t installed. Install it, or turn the option off.')
    return
  }
  if (legacyNames) {
    useLogger('jade').warn('`vuetify0` uses `data-theme` for itself, which the module also writes while `legacyNames` is on. Set `legacyNames: false`.')
  }

  nuxt.options.build.transpile.push('@vuetify/v0')
  addPlugin(resolver.resolve('./runtime/plugins/vuetify0'))
}

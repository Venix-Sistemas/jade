// src/setup/register-assets.ts
import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import { ASSETS_BASE } from '../shared/constants'

/**
 * The module's files, under `/_jade/` so they never collide with the project's
 * own. With `legacyNames`, also at the site root, where they were up to 1.5.
 */
export function registerPublicAssets(nuxt: Nuxt, resolver: Resolver, legacyNames = true) {
  nuxt.options.nitro = nuxt.options.nitro || {}
  nuxt.options.nitro.publicAssets = nuxt.options.nitro.publicAssets || []

  for (const baseURL of legacyNames ? [ASSETS_BASE, '/'] : [ASSETS_BASE]) {
    nuxt.options.nitro.publicAssets.push({
      dir: resolver.resolve('./runtime/public'),
      // A week, not a year: these files (cursor images, fonts) keep the same
      // URL across releases (no content hash), so a long cache would keep
      // serving the old file for months after an update.
      maxAge: 60 * 60 * 24 * 7,
      baseURL,
    })
  }
}

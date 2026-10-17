// src/setup/register-assets.ts
import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'

export function registerPublicAssets(nuxt: Nuxt, resolver: Resolver) {
  nuxt.options.nitro = nuxt.options.nitro || {}
  nuxt.options.nitro.publicAssets = nuxt.options.nitro.publicAssets || []

  nuxt.options.nitro.publicAssets.push({
    dir: resolver.resolve('./runtime/public'),
    // A week, not a year: these files (cursor images, fonts) keep the same
    // URL across releases (no content hash), so a long cache would keep
    // serving the old file for months after an update.
    maxAge: 60 * 60 * 24 * 7,
    baseURL: '/',
  })
}

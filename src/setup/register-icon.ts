// src/setup/register-icon.ts
import { createRequire } from 'node:module'
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { installModule, addImports, addComponent } from '@nuxt/kit'
import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import type { ModuleOptions as NuxtIconOptions } from '@nuxt/icon'
import { getIcons } from '@iconify/utils'
import type { IconOptions, ColorsConfig } from '../shared/types'
import { extractIconRefs } from '../shared/utils'

// Extracted from @nuxt/icon's public type (there's no subpath exported just
// for `ServerBundleOptions`) to type the collections without depending on
// @iconify/types directly — avoids an extra dependency just for types.
type IconServerBundle = Exclude<NuxtIconOptions['serverBundle'], 'auto' | 'remote' | 'local' | false | undefined>
type IconCollectionEntry = NonNullable<IconServerBundle['collections']>[number]
type IconifyJSON = Parameters<typeof getIcons>[0]

// `realpathSync` is essential here: when this package is installed via pnpm
// (no hoisting), Node loads this file through a symlink under
// node_modules/@venix-sistemas/nuxt-theme/, and `createRequire` resolved from
// the symlinked path does NOT see this dependency's own node_modules/ (it
// ends up "outside" the package's real tree) — only works from the real
// physical path.
const nodeRequire = createRequire(realpathSync(fileURLToPath(import.meta.url)))

/**
 * Loads the raw JSON of an `@iconify-json/*` collection, trying first from
 * this package's own location (collections that are a dependency of
 * nuxt-theme, e.g. `line-md`, `mdi`) and then from the consumer project's
 * root (collections the consumer installed themselves for their custom
 * themes). See the `nodeRequire` comment for why resolution relative to this
 * package needs the real physical path.
 */
function loadCollectionJson(name: string, projectRequire: NodeRequire | null): IconifyJSON | null {
  try {
    return nodeRequire(`@iconify-json/${name}/icons.json`) as IconifyJSON
  }
  catch {
    try {
      return projectRequire?.(`@iconify-json/${name}/icons.json`) as IconifyJSON ?? null
    }
    catch {
      return null
    }
  }
}

/** Whole collection, no tree-shaking — for collections explicitly listed in `icon.collections`. */
function loadFullCollection(name: string, projectRequire: NodeRequire | null): IconCollectionEntry {
  return loadCollectionJson(name, projectRequire) ?? name // fallback: let @nuxt/icon try to resolve/fetch it remotely
}

/**
 * Collection reduced to only the referenced icons (`getIcons`) — used for
 * collections detected in themes/aliases but not explicitly listed in
 * `icon.collections`, avoiding bundling large collections (e.g. `mdi`, with
 * thousands of icons) whole in the server bundle just for a handful of icons
 * used.
 */
function loadCollectionSubset(name: string, iconNames: Set<string>, projectRequire: NodeRequire | null): IconCollectionEntry | null {
  const json = loadCollectionJson(name, projectRequire)
  if (!json) return null
  return getIcons(json, [...iconNames]) as IconCollectionEntry | null
}

export async function registerThemeIcon(nuxt: Nuxt, resolver: Resolver, options: IconOptions, colors: ColorsConfig) {
  if (!options.enabled) return

  let projectRequire: NodeRequire | null = null
  try {
    projectRequire = createRequire(join(nuxt.options.rootDir, 'package.json'))
  }
  catch {
    projectRequire = null
  }

  const explicit = new Set(options.collections)
  const collections: IconCollectionEntry[] = options.collections.map(name => loadFullCollection(name, projectRequire))

  const refs = extractIconRefs(colors.themes, options.aliases)
  for (const [name, iconNames] of refs) {
    if (explicit.has(name)) continue // already bundled whole above
    collections.push(loadCollectionSubset(name, iconNames, projectRequire) ?? name)
  }

  await installModule('@nuxt/icon', {
    aliases: options.aliases,
    serverBundle: {
      collections,
    },
  })

  addImports({
    name: 'useVenixIcon',
    from: resolver.resolve('./runtime/composables/useVenixIcon'),
  })

  addComponent({
    name: 'VenixIcon',
    filePath: resolver.resolve('./runtime/components/VenixIcon'),
  })
}

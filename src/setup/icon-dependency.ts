// src/setup/icon-dependency.ts
// `@nuxt/icon` is installed as a module dependency, which Nuxt reads before
// any module runs its setup. So what it needs from Jade's options is worked
// out here, from `nuxt.config` alone.
import { realpathSync } from 'node:fs'
import { dirname, sep } from 'node:path'
import { resolveModuleWithOptions } from '@nuxt/kit'
import type { ModuleDependencies, Nuxt } from '@nuxt/schema'
import { defu } from 'defu'
import type { ModuleOptions } from '../module'
import type { IconOptions } from '../shared/types'
import { loadTheme } from '../shared/utils/load'
import { resolveFeatureOption } from '../shared/utils/options'
import { customizeTheme } from './customize-theme'
import { withLegacyConfigKey } from './legacy-config'
import type { ConfigKeys } from './legacy-config'
import { iconModuleOptions } from './register-icon'

const PACKAGE_NAME = '@venix-sistemas/jade'

export function resolveIconOptions(option: ModuleOptions['icon']): IconOptions {
  return resolveFeatureOption<IconOptions>(option, {
    enabled: true,
    collections: ['line-md'],
    aliases: {},
  })
}

/** This module as an entry of `modules`: itself, its package name or a path to it. */
function isJadeEntry(entry: unknown, self: unknown, entryFile: string, nuxt: Nuxt): boolean {
  if (entry === self) return true
  if (typeof entry !== 'string') return false
  if (entry === PACKAGE_NAME || entry === `${PACKAGE_NAME}/nuxt`) return true
  try {
    const path = resolveModuleWithOptions(entry, nuxt)?.resolvedPath
    return !!path && realpathSync(path).startsWith(realpathSync(dirname(entryFile)) + sep)
  }
  catch {
    return false
  }
}

/**
 * The options written next to the module in `modules`, e.g.
 * `['@venix-sistemas/jade', { icon: false }]`, which Nuxt doesn't pass to
 * `moduleDependencies`. Searched in the order Nuxt registers modules, where
 * the first entry of a module is the one that counts.
 */
export function inlineModuleOptions(nuxt: Nuxt, self: unknown, entryFile: string): ModuleOptions | undefined {
  const entries: unknown[] = [
    ...[...nuxt.options._layers].reverse().flatMap(layer => layer.config.modules ?? []),
    ...nuxt.options.modules,
    ...nuxt.options._modules,
  ]
  for (const entry of entries) {
    const [module, options] = Array.isArray(entry) ? entry : [entry]
    if (isJadeEntry(module, self, entryFile, nuxt)) return options as ModuleOptions | undefined
  }
}

/**
 * Jade's `moduleDependencies`. Synchronous on purpose: Nuxt 4.1 doesn't await it.
 * `overrides` keeps Jade's aliases and collections over a top-level `icon` key,
 * with the collections of both bundled.
 */
export function iconDependencies(nuxt: Nuxt, inline: ModuleOptions | undefined, defaults: ModuleOptions): ModuleDependencies {
  const config = nuxt.options as unknown as ConfigKeys
  if ((config.venixJade as unknown) === false) return {}

  const { options } = withLegacyConfigKey(defu(inline ?? {}, config.venixJade ?? {}, defaults) as ModuleOptions, config)
  const iconOptions = resolveIconOptions(options.icon)
  if (!iconOptions.enabled) return {}

  const { colors } = customizeTheme(loadTheme(), options)
  return {
    '@nuxt/icon': { overrides: iconModuleOptions(nuxt, iconOptions, colors) },
  }
}

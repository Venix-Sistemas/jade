// src/setup/legacy-config.ts
import type { ModuleOptions } from '../module'

/** The two config keys of `nuxt.config`: `venixJade` and, up to 1.5, `venixTheme`. */
export interface ConfigKeys {
  venixJade?: ModuleOptions
  venixTheme?: ModuleOptions
}

/**
 * The module options with `venixTheme` honored when it is the only key set.
 * `options` already holds `venixJade` over the defaults (Nuxt merges it), so
 * the old key is laid over them key by key, as Nuxt would have. With both
 * set, only `venixJade` counts. Removed in 2.0.
 */
export function withLegacyConfigKey(options: ModuleOptions, config: ConfigKeys): { options: ModuleOptions, warning?: string } {
  const legacy = config.venixTheme
  if (!legacy) return { options }

  if (config.venixJade && Object.keys(config.venixJade).length) {
    return { options, warning: '`venixTheme` is ignored: `venixJade` is set too. Move everything to `venixJade`.' }
  }
  return {
    options: { ...options, ...legacy },
    warning: '`venixTheme` is deprecated and stops working in 2.0. Rename it to `venixJade` in `nuxt.config`.',
  }
}

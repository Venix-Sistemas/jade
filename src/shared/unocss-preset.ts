// src/shared/unocss-preset.ts
import { COLOR_PROPERTIES } from './constants'

// Minimal structural type for UnoCSS's `Preset` — we don't import from
// `unocss`/`@unocss/core` because they're optional peers (the package isn't
// always installed in the consumer, and isn't a dependency of this module);
// TS's structural typing is already compatible with their real `Preset<Theme>`.
export interface VenixUnoPreset {
  name: string
  enforce: 'post'
  theme: {
    colors: Record<string, string>
  }
  rules: Array<[string, Record<string, string>]>
}

const CURSOR_TYPES = ['default', 'pointer', 'text'] as const

/**
 * UnoCSS preset that exposes the theme's colors as `theme.colors` (`primary`,
 * `secondary`, `background2`, ...), all pointing at the CSS vars this module
 * generates (`--color-primary`, ...) — enables utilities like `text-primary`,
 * `bg-background2/80` or `border-accent`.
 *
 * Also points `cursor-default`, `cursor-pointer` and `cursor-text` at the
 * module's cursor variables (`--cursor-pointer`, ...), falling back to the
 * system cursor when the module's cursor is off. `enforce: 'post'` puts these
 * after `presetWind`/`presetUno`, whose own `cursor-pointer` they replace,
 * wherever the preset sits in `presets`.
 *
 * Must be added manually to your `uno.config.ts`:
 *
 * ```ts
 * import { defineConfig } from 'unocss'
 * import { venixUnoPreset } from '@venix-sistemas/jade/unocss'
 *
 * export default defineConfig({
 *   presets: [venixUnoPreset()],
 * })
 * ```
 *
 * Not injected automatically: `@unocss/nuxt` reloads `uno.config.ts` from
 * disk on its own (to support HMR) and shallow-merges that file against any
 * config injected via hook — that silently discards a hook-injected `theme`
 * whenever the consumer's `uno.config.ts` already declares its own `theme`
 * key (even one without any colors). As a preset inside the `presets` array
 * itself, these colors become part of what's actually read from the file and
 * survive that merge.
 */
export function venixUnoPreset(): VenixUnoPreset {
  const colors: Record<string, string> = {
    inverse: 'var(--color-inverse)',
  }

  for (const property of COLOR_PROPERTIES) {
    colors[property] = `var(--color-${property})`
  }

  return {
    name: 'venix-theme',
    enforce: 'post',
    theme: { colors },
    rules: CURSOR_TYPES.map(type => [`cursor-${type}`, { cursor: `var(--cursor-${type}, ${type})` }]),
  }
}

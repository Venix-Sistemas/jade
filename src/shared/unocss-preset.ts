// src/shared/unocss-preset.ts
import { COLOR_PROPERTIES } from './constants'
import { TOKEN_NAMES } from './token-names'

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

export interface VenixUnoPresetOptions {
  /**
   * Also exposes the semantic color tokens (experimental, v1.4.0) as classes
   * named after the CSS variable, with the `color-` prefix: `--color-bg-subtle`
   * → `color-bg-subtle`, `color-text-muted`, `color-border-strong`,
   * `color-fill-primary`, `color-on-primary`… The prefix keeps them from
   * clashing with the classes of other color systems (Vuetify's `text-primary`,
   * Bootstrap's or shadcn's `text-muted`/`bg-muted`). They only have a value on
   * themes with `tokens: true`. Default: `true`.
   */
  tokens?: boolean
}

const CURSOR_TYPES = ['default', 'pointer', 'text'] as const

/**
 * What a token's first word says it is for, and the CSS property that sets:
 * `bg` and `fill` paint a background, `text` and `on` are text colors,
 * `border` is an outline.
 */
const TOKEN_PROPERTY: Record<string, string> = {
  bg: 'background-color',
  fill: 'background-color',
  text: 'color',
  on: 'color',
  border: 'border-color',
}

/**
 * UnoCSS preset that exposes the theme's colors as `theme.colors` (`primary`,
 * `secondary`, `background2`, ...), all pointing at the CSS vars this module
 * generates (`--color-primary`, ...) — enables utilities like `text-primary`,
 * `bg-background2/80` or `border-accent`.
 *
 * With `tokens` (the default), the semantic tokens too, one class per token
 * named after its CSS variable: `--color-text-muted` → `color-text-muted`. They
 * are rules and not theme colors: the class says `color-`, not the utility, and
 * sets the property the token is for (`bg-*`/`fill-*` the background, `text-*`/`on-*`
 * the text color, `border-*` the border color). See `VenixUnoPresetOptions`.
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
export function venixUnoPreset(options: VenixUnoPresetOptions = {}): VenixUnoPreset {
  const colors: Record<string, string> = {
    inverse: 'var(--color-inverse)',
  }

  for (const property of COLOR_PROPERTIES) {
    colors[property] = `var(--color-${property})`
  }

  const rules: VenixUnoPreset['rules'] = CURSOR_TYPES.map(type => [`cursor-${type}`, { cursor: `var(--cursor-${type}, ${type})` }])

  if (options.tokens !== false) {
    for (const name of TOKEN_NAMES) {
      const property = TOKEN_PROPERTY[name.split('-')[0]!]!
      rules.push([`color-${name}`, { [property]: `var(--color-${name})` }])
    }
  }

  return {
    name: 'venix-theme',
    enforce: 'post',
    theme: { colors },
    rules,
  }
}

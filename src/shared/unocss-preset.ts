// src/shared/unocss-preset.ts
import { COLOR_PROPERTIES } from './constants'

// Tipo estrutural mínimo de `Preset` do UnoCSS — não importamos de `unocss`/
// `@unocss/core` porque são peers opcionais (o pacote nem sempre está
// instalado no consumidor, e não é dependência deste módulo); a tipagem
// estrutural do TS já é compatível com o `Preset<Theme>` real deles.
export interface VenixUnoPreset {
  name: string
  theme: {
    colors: Record<string, string>
  }
}

/**
 * Preset UnoCSS que expõe as cores do tema como `theme.colors` (`primary`,
 * `secondary`, `background2`, ...), todas apontando para as CSS vars geradas
 * por este módulo (`--color-primary`, ...) — habilita utilities como
 * `text-primary`, `bg-background2/80` ou `border-accent`.
 *
 * Precisa ser adicionado manualmente ao seu `uno.config.ts`:
 *
 * ```ts
 * import { defineConfig } from 'unocss'
 * import { venixUnoPreset } from '@venix-sistemas/nuxt-theme/unocss'
 *
 * export default defineConfig({
 *   presets: [venixUnoPreset()],
 * })
 * ```
 *
 * Não é injetado automaticamente: o `@unocss/nuxt` recarrega `uno.config.ts`
 * do disco por conta própria (para suportar HMR) e faz um merge raso entre
 * esse arquivo e qualquer config injetada via hook — isso descarta
 * silenciosamente um `theme` injetado por hook sempre que o `uno.config.ts`
 * do consumidor já declara sua própria chave `theme` (mesmo sem nenhuma cor).
 * Como preset dentro do próprio array `presets`, essas cores passam a fazer
 * parte do que é lido do arquivo e sobrevivem a esse merge.
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
    theme: { colors },
  }
}

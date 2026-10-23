// src/setup/register-scrollbar.ts
import { createRequire } from 'node:module'
import { addPlugin, useLogger } from '@nuxt/kit'
import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import type { ThemeConfig } from '../shared/types'

/**
 * OverlayScrollbars' stylesheet, resolved from the module: with pnpm the app
 * can't see the module's packages, but an installed peer dependency is
 * linked where the module finds it. `null` when it isn't installed.
 */
function resolveOverlayScrollbarsCSS(): string | null {
  try {
    return createRequire(import.meta.url).resolve('overlayscrollbars/overlayscrollbars.css')
  }
  catch {
    return null
  }
}

/**
 * The overlay scrollbar (`scrollbar.overlay`, off by default): OverlayScrollbars'
 * stylesheet and the client plugin that applies it. Call before
 * `registerThemeCSS`: the module's `os-theme-jade` rules must come after the
 * library's defaults to win over them.
 *
 * OverlayScrollbars is an optional peer dependency, installed by the projects
 * that turn the option on. Without it, this warns and turns `overlay` off on
 * `theme`, so the generated CSS doesn't hide the page's native scrollbar
 * waiting for a plugin that never comes.
 */
export function registerOverlayScrollbars(nuxt: Nuxt, resolver: Resolver, theme: ThemeConfig, resolveCSS = resolveOverlayScrollbarsCSS) {
  const scrollbar = theme.customScrollbar
  if (scrollbar?.enabled === false || scrollbar?.overlay !== true) return

  const css = resolveCSS()
  if (!css) {
    useLogger('jade').warn('`scrollbar.overlay` needs the `overlayscrollbars` package, which isn\'t installed: run `pnpm add overlayscrollbars` (or npm/yarn). Using the CSS-styled native scrollbar meanwhile.')
    scrollbar.overlay = false
    return
  }

  nuxt.options.css.push(css)
  addPlugin({ src: resolver.resolve('./runtime/plugins/overlay-scrollbars.client'), mode: 'client' })
}

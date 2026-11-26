// src/setup/register-lab.ts
import { createHash } from 'node:crypto'
import { addPlugin } from '@nuxt/kit'
import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import type { ThemeConfig, VenixRuntimeConfig } from '../shared/types'
import { processTheme } from '../shared/css'
import { labRestoreScript } from '../shared/lab/restore-script'

/** `color.lab`: what restores the visitor's colors. The editor is part of the theme switcher. */
export function registerThemeLab(nuxt: Nuxt, resolver: Resolver, theme: ThemeConfig): NonNullable<VenixRuntimeConfig['lab']> {
  const version = createHash('sha256').update(processTheme(theme)).digest('hex').slice(0, 12)

  addPlugin({ src: resolver.resolve('./runtime/plugins/theme-lab.client'), mode: 'client' })

  // Before the page is painted: the CSS saved on the last visit
  nuxt.options.app.head.script ||= []
  nuxt.options.app.head.script.push({ innerHTML: labRestoreScript(version) })

  // The color engine is only imported on demand: told to Vite up front, so the
  // first use doesn't reload the page in development
  nuxt.options.vite.optimizeDeps ||= {}
  nuxt.options.vite.optimizeDeps.include ||= []
  nuxt.options.vite.optimizeDeps.include.push('@venix-sistemas/jade > @adobe/leonardo-contrast-colors')

  return {
    contrast: theme.colors.contrast || 'AA',
    highContrast: theme.colors.highContrast === true,
    vuetify0: theme.vuetify0 === true,
    version,
  }
}

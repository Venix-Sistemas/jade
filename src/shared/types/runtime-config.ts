// src/shared/types/runtime-config.ts
import type { ThemeEntry } from './colors'

/**
 * What the module puts in `runtimeConfig.public.venixTheme`. Its own
 * interface (and not only the augmentation below) so `module.ts` can check
 * what it assigns against this shape, not against the type Nuxt infers from
 * the app's config, which names every theme of that app.
 */
export interface VenixRuntimeConfig {
  defaultTheme: string
  colorThemes: Record<string, Partial<ThemeEntry>>
  applyColors: boolean
  localeCookie: string
  defaultLocale: string
  locale: string
  iconFormat: 'emote' | 'css' | 'svg'
  requireConsent: boolean
  seasonal: boolean
  /**
   * The semantic tokens of every theme variant with `tokens: true`, by
   * variant id (`{ 'light': { 'text-primary': '#CF0000', ... } }`).
   * Generated at build time; empty when no theme uses tokens (the
   * built-in themes do, so only with `color: false` is it empty).
   */
  tokens?: Record<string, Record<string, string>>
  icon: {
    aliases: Record<string, string>
  }
  enabled: {
    typography: boolean
    customFont: boolean
    scrollbar: boolean
    cursor: boolean
    color: boolean
    translation: boolean
    manageHtmlLang: boolean
    vuetify: boolean
    icon: boolean
  }
}

declare module '@nuxt/schema' {
  interface PublicRuntimeConfig {
    venixTheme?: VenixRuntimeConfig
  }
}

declare global {
  interface Window {
    __VENIX_INITIAL_THEME__?: string
  }
}

export { }

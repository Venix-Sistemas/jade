// src/shared/types/runtime-config.ts
import type { ThemeColors } from './colors'

declare module '@nuxt/schema' {
  interface PublicRuntimeConfig {
    venixTheme?: {
      defaultTheme: string
      colorThemes: Record<string, Partial<ThemeColors>>
      applyColors: boolean
      localeCookie: string
      defaultLocale: string
      locale: string
      iconFormat: 'emote' | 'css' | 'svg'
      icon: {
        aliases: Record<string, string>
      }
      enabled: {
        typography: boolean
        scrollbar: boolean
        cursor: boolean
        color: boolean
        translation: boolean
        manageHtmlLang: boolean
        vuetify: boolean
        icon: boolean
      }
    }
  }
}

declare global {
  interface Window {
    __VENIX_INITIAL_THEME__?: string
  }
}

export { }

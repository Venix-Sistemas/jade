import { defineNuxtModule, createResolver, addImports } from '@nuxt/kit'
import { loadTheme } from './shared/utils/load'
import type { TypographyConfig, ScrollbarConfig, CursorConfig, ColorOptions, TranslationConfig, VuetifyOptions, IconOptions } from './shared/types'
import { DEFAULT_LOCALE, DEFAULT_LOCALE_COOKIE_NAME } from './shared/constants'
import { resolveFeatureOption } from './shared/utils/options'
import { customizeTheme } from './setup/customize-theme'
import { registerPublicAssets } from './setup/register-assets'
import { registerThemeComponents } from './setup/register-components'
import { registerThemePlugins } from './setup/register-plugins'
import { registerThemeCSS } from './setup/register-css'
import { registerThemeVuetify } from './setup/register-vuetify'
import { registerThemeIcon } from './setup/register-icon'

export interface ModuleOptions {
  theme?: string
  translation?: boolean | Partial<TranslationConfig>
  color?: boolean | Partial<ColorOptions>
  scrollbar?: boolean | Partial<ScrollbarConfig>
  cursor?: boolean | Partial<CursorConfig>
  typography?: boolean | Partial<TypographyConfig>
  /**
   * Registra os temas de cor no Vuetify (`vuetify-nuxt-module`), se instalado.
   * Desligado por padrão — ligue explicitamente em projetos que usam Vuetify.
   * Precisa vir ANTES do módulo do Vuetify em `modules`.
   */
  vuetify?: boolean | Partial<VuetifyOptions>
  /**
   * Integra `@nuxt/icon` e registra `<VenixIcon>` / `useVenixIcon`, capazes de
   * renderizar emoji, ícones Iconify (ex.: `line-md:home`, animados) ou SVG
   * inline a partir de um único valor. Instala `@nuxt/icon` automaticamente.
   */
  icon?: boolean | Partial<IconOptions>
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@venix-sistemas/nuxt-theme',
    configKey: 'venixTheme',
  },
  defaults: {
    translation: true,
    color: true,
    scrollbar: true,
    cursor: true,
    typography: true,
    vuetify: false,
    icon: true,
  },

  async setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)

    // 1. Registra assets públicos
    registerPublicAssets(nuxt, resolver)

    // 2. Carrega e customiza o tema
    const baseTheme = loadTheme(options.theme)
    const theme = customizeTheme(baseTheme, options)

    // 3. Registra o composable e o componente pronto de seletor de tema
    addImports({
      name: 'useVenixTheme',
      from: resolver.resolve('./runtime/composables/useVenixTheme'),
    })
    registerThemeComponents(resolver)

    // 4. Resolve as opções de cor e tradução
    const colorOptions = resolveFeatureOption<ColorOptions>(options.color, {
      enabled: theme.colors?.enabled !== false,
      apply: true,
      defaultColor: theme.colors?.defaultColor || 'dark',
      themes: {},
      iconFormat: 'emote',
    })
    const shouldApplyColors = colorOptions.enabled && colorOptions.apply && theme.colors?.defaults !== false

    const translationOptions = resolveFeatureOption<TranslationConfig>(options.translation, {
      enabled: true,
      locale: '',
      defaultLocale: DEFAULT_LOCALE,
      cookieSync: DEFAULT_LOCALE_COOKIE_NAME,
      manageHtmlLang: false,
    })

    // 5. Registra CSS
    registerThemeCSS(nuxt, theme)

    // 6. Registra plugins
    registerThemePlugins(nuxt, resolver, shouldApplyColors)

    // 7. Registra os temas de cor no Vuetify, se habilitado
    const vuetifyOptions = resolveFeatureOption<VuetifyOptions>(options.vuetify, {
      enabled: true,
    })
    registerThemeVuetify(nuxt, resolver, theme, colorOptions.defaultColor, vuetifyOptions.enabled)

    // 8. Registra @nuxt/icon + <VenixIcon> / useVenixIcon
    const iconOptions = resolveFeatureOption<IconOptions>(options.icon, {
      enabled: true,
      collections: ['line-md'],
      aliases: {},
    })
    await registerThemeIcon(nuxt, resolver, iconOptions, theme.colors)

    // 9. Configura runtimeConfig
    nuxt.options.runtimeConfig.public.venixTheme = {
      defaultTheme: theme.colors?.defaultColor || 'dark',
      colorThemes: colorOptions.themes,
      applyColors: shouldApplyColors,
      localeCookie: translationOptions.cookieSync,
      defaultLocale: translationOptions.defaultLocale,
      locale: translationOptions.locale,
      iconFormat: colorOptions.iconFormat,
      icon: {
        aliases: iconOptions.aliases,
      },
      enabled: {
        typography: theme.typography?.enabled !== false,
        scrollbar: theme.customScrollbar?.enabled !== false,
        cursor: theme.customCursor?.enabled !== false,
        color: colorOptions.enabled,
        translation: translationOptions.enabled,
        manageHtmlLang: translationOptions.manageHtmlLang,
        vuetify: vuetifyOptions.enabled,
        icon: iconOptions.enabled,
      },
    }
  },
})

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
  translation?: boolean | Partial<TranslationConfig>
  color?: boolean | Partial<ColorOptions>
  scrollbar?: boolean | Partial<ScrollbarConfig>
  cursor?: boolean | Partial<CursorConfig>
  typography?: boolean | Partial<TypographyConfig>
  /**
   * Registers the color themes with Vuetify (`vuetify-nuxt-module`), if
   * installed. Off by default — enable explicitly in projects using Vuetify.
   * Must come BEFORE the Vuetify module in `modules`.
   */
  vuetify?: boolean | Partial<VuetifyOptions>
  /**
   * Integrates `@nuxt/icon` and registers `<VenixIcon>` / `useVenixIcon`,
   * able to render an emoji, an Iconify icon (e.g. `line-md:home`, animated)
   * or an inline SVG from a single value. Installs `@nuxt/icon` automatically.
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

    // 1. Register public assets
    registerPublicAssets(nuxt, resolver)

    // 2. Load and customize the theme
    const baseTheme = loadTheme()
    const theme = customizeTheme(baseTheme, options)

    // 3. Register the composable and the ready-made theme switcher component
    addImports({
      name: 'useVenixTheme',
      from: resolver.resolve('./runtime/composables/useVenixTheme'),
    })
    registerThemeComponents(resolver)

    // 4. Resolve color and translation options
    const colorOptions = resolveFeatureOption<ColorOptions>(options.color, {
      enabled: theme.colors?.enabled !== false,
      apply: true,
      defaultColor: theme.colors?.defaultColor || 'dark',
      themes: {},
      iconFormat: 'svg',
    })
    const shouldApplyColors = colorOptions.enabled && colorOptions.apply && theme.colors?.defaults !== false

    const translationOptions = resolveFeatureOption<TranslationConfig>(options.translation, {
      enabled: true,
      locale: '',
      defaultLocale: DEFAULT_LOCALE,
      cookieSync: DEFAULT_LOCALE_COOKIE_NAME,
      manageHtmlLang: false,
    })

    // 5. Register CSS
    registerThemeCSS(nuxt, theme)

    // 6. Register plugins
    registerThemePlugins(nuxt, resolver, shouldApplyColors)

    // 7. Register the color themes with Vuetify, if enabled
    const vuetifyOptions = resolveFeatureOption<VuetifyOptions>(options.vuetify, {
      enabled: true,
    })
    registerThemeVuetify(nuxt, resolver, theme, colorOptions.defaultColor, vuetifyOptions.enabled)

    // 8. Register @nuxt/icon + <VenixIcon> / useVenixIcon
    const iconOptions = resolveFeatureOption<IconOptions>(options.icon, {
      enabled: true,
      collections: ['line-md'],
      aliases: {},
    })
    await registerThemeIcon(nuxt, resolver, iconOptions, theme.colors)

    // 9. Configure runtimeConfig
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

import { defineNuxtModule, createResolver, addImports, useLogger } from '@nuxt/kit'
import { loadTheme } from './shared/utils/load'
import type { TypographyConfig, ScrollbarConfig, CursorConfig, ColorOptions, TranslationConfig, VuetifyOptions, IconOptions, ExperimentalConfig, VenixRuntimeConfig } from './shared/types'
import { DEFAULT_LOCALE, DEFAULT_LOCALE_COOKIE_NAME, DEFAULT_THEME } from './shared/constants'
import { resolveFeatureOption } from './shared/utils/options'
import { findDeprecatedThemeEntries, findThemeConfigIssues, overridesBrandColors } from './shared/utils/merge-themes'
import { buildResolvedTheme, findInvalidDefaultColor, getBaseThemeEntries } from './shared/utils/theme-config'
import { collectTokens, findTokenContrastIssues, findTokenOverrideIssues } from './shared/css/tokens'
import { customizeTheme } from './setup/customize-theme'
import { registerPublicAssets } from './setup/register-assets'
import { registerThemeComponents } from './setup/register-components'
import { registerThemePlugins } from './setup/register-plugins'
import { registerThemeCSS } from './setup/register-css'
import { registerFontPreloads } from './setup/register-fonts'
import { registerOverlayScrollbars } from './setup/register-scrollbar'
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
  /**
   * Experimental features, to try them on a project. Off by default; a
   * build-time choice, with nothing for the visitor to switch. Today: the
   * semantic color tokens for every theme, built-in ones included (see
   * `ExperimentalConfig`).
   */
  experimental?: boolean | Partial<ExperimentalConfig>
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@venix-sistemas/jade',
    configKey: 'venixTheme',
    // The module is built and tested on Nuxt 4 (`@nuxt/kit` ^4). Older
    // versions get a clear message, not the first error that comes up.
    compatibility: { nuxt: '>=4.0.0' },
  },
  defaults: {
    translation: true,
    color: true,
    scrollbar: true,
    cursor: true,
    typography: true,
    vuetify: false,
    icon: true,
    experimental: false,
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
      defaultColor: theme.colors?.defaultColor || DEFAULT_THEME,
      themes: {},
      iconFormat: 'svg',
      requireConsent: true,
      seasonal: true,
      allowVenixOverride: false,
      contrast: 'AA',
    })
    for (const message of findDeprecatedThemeEntries(getBaseThemeEntries(), colorOptions.themes)) {
      useLogger('jade').warn(message)
    }
    if (colorOptions.enabled) {
      for (const message of findThemeConfigIssues(getBaseThemeEntries(), colorOptions.themes)) {
        useLogger('jade').warn(message)
      }
    }
    if (colorOptions.enabled && !colorOptions.allowVenixOverride && overridesBrandColors(getBaseThemeEntries(), colorOptions.themes)) {
      useLogger('jade').warn('`color.themes` changes the colors of `venix`, the Venix Sistemas brand theme. For another identity, add a theme of your own (e.g. `color.themes.myBrand`) and set `color.defaultColor` to its name; Venix stays in the switcher next to it. Set `color.allowVenixOverride: true` if changing Venix is intended.')
    }
    if (colorOptions.enabled) {
      const resolvedColors = buildResolvedTheme({
        defaultTheme: colorOptions.defaultColor,
        colorThemes: colorOptions.themes,
        seasonal: colorOptions.seasonal,
      }).colors
      const defaultColorMessage = findInvalidDefaultColor(resolvedColors)
      if (defaultColorMessage) useLogger('jade').warn(defaultColorMessage)
      for (const message of findTokenOverrideIssues(theme.colors.themes)) {
        useLogger('jade').warn(message)
      }
      if (colorOptions.contrast) {
        // The module's own default tokens (built-in themes) are not the
        // project's to fix, so they stay out of this check: at `'AAA'` a
        // seed can't reach 7:1 and the warning would have no cure.
        const projectThemes = Object.fromEntries(Object.entries(theme.colors.themes).filter(([id]) => !theme.colors.defaultTokens?.includes(id)))
        for (const message of findTokenContrastIssues(projectThemes, colorOptions.contrast)) {
          useLogger('jade').warn(message)
        }
      }
    }
    if (typeof options.cursor === 'object' && options.cursor?.cursors) {
      useLogger('jade').warn('`cursor.cursors` is deprecated and stops working in 2.0. Use `cursor.defaultCursors` instead.')
    }

    const shouldApplyColors = colorOptions.enabled && colorOptions.apply && theme.colors?.defaults !== false

    const translationOptions = resolveFeatureOption<TranslationConfig>(options.translation, {
      enabled: true,
      locale: '',
      defaultLocale: DEFAULT_LOCALE,
      cookieSync: DEFAULT_LOCALE_COOKIE_NAME,
      manageHtmlLang: false,
    })

    // 5. Register CSS
    registerOverlayScrollbars(nuxt, resolver, theme)
    registerThemeCSS(nuxt, theme)
    registerFontPreloads(nuxt, theme)

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
    const tokens = colorOptions.enabled ? collectTokens(theme.colors.themes, colorOptions.contrast || 'AA') : {}
    const runtimeConfig: VenixRuntimeConfig = {
      defaultTheme: theme.colors?.defaultColor || DEFAULT_THEME,
      colorThemes: colorOptions.themes,
      applyColors: shouldApplyColors,
      localeCookie: translationOptions.cookieSync,
      defaultLocale: translationOptions.defaultLocale,
      locale: translationOptions.locale,
      // Without the icon module, @nuxt/icon isn't installed — only emoji can render
      iconFormat: iconOptions.enabled ? colorOptions.iconFormat : 'emote',
      requireConsent: colorOptions.requireConsent,
      seasonal: colorOptions.seasonal,
      tokens,
      icon: {
        aliases: iconOptions.aliases,
      },
      enabled: {
        typography: theme.typography?.enabled !== false,
        // Something for the visitor to turn off (`font.available`)
        customFont: theme.typography?.enabled !== false && !!theme.typography?.customFonts?.length,
        scrollbar: theme.customScrollbar?.enabled !== false,
        cursor: theme.customCursor?.enabled !== false,
        color: colorOptions.enabled,
        translation: translationOptions.enabled,
        manageHtmlLang: translationOptions.manageHtmlLang,
        vuetify: vuetifyOptions.enabled,
        icon: iconOptions.enabled,
      },
    }
    // Not assigned by property: Nuxt infers that property's type from the app's own config
    Object.assign(nuxt.options.runtimeConfig.public, { venixTheme: runtimeConfig })
  },
})

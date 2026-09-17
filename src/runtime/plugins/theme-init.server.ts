// runtime/plugins/theme-init.server.ts
import { defineNuxtPlugin, useRuntimeConfig, useCookie, useHead } from '#app'
import { THEME_PREFERENCE_COOKIE, THEME_RESOLVED_COOKIE, DEFAULT_LOCALE_COOKIE_NAME, DEFAULT_LOCALE, DEFAULT_THEME } from '../../shared/constants'
import { useThemeLocale } from '../composables/useThemeLocale'
import { buildResolvedTheme } from '../../shared/utils/theme-config'
import { isColorTheme, resolveThemePreference } from '../../shared/utils/theme-resolve'

export default defineNuxtPlugin({
  name: 'venix-theme-init-server',
  enforce: 'pre',
  setup() {
    const config = useRuntimeConfig()
    const themeConfig = config.public.venixTheme

    const resolvedCookie = useCookie<string>(THEME_RESOLVED_COOKIE)
    const preferenceCookie = useCookie<string>(THEME_PREFERENCE_COOKIE)

    const theme = buildResolvedTheme(themeConfig)
    const defaultTheme = theme.colors.defaultColor || DEFAULT_THEME

    // No `matchMedia` on the server: `resolveThemePreference` doesn't know
    // whether the user prefers light/dark when the preference is 'system'
    // (i.e. "Automatic"), so it assumes dark — the pre-hydration script
    // (`runtime/scripts/theme-init.ts`) corrects it on the client before the
    // first paint, if needed. Previously, a `preferenceCookie` of 'system'
    // was treated as a valid theme name (the key exists in `colors.themes`
    // as a UI placeholder — see `theme.json`) and turned into
    // `data-theme="system"`, for which no CSS is generated
    // (`generateThemeVars` skips 'system' on purpose) — resulting in a flash
    // with no color at all.
    let resolvedTheme = defaultTheme

    if (resolvedCookie.value && isColorTheme(theme.colors.themes[resolvedCookie.value])) {
      resolvedTheme = resolvedCookie.value
    }
    else if (preferenceCookie.value) {
      resolvedTheme = resolveThemePreference(preferenceCookie.value, theme.colors.themes, defaultTheme, true)
    }

    const htmlAttrs: Record<string, string> = {
      'data-theme': resolvedTheme,
      'class': resolvedTheme,
    }

    // `lang` needs to reflect the resolved locale (WCAG 3.1.1) — but only
    // when enabled explicitly (see `translation.manageHtmlLang` and the same
    // comment in useVenixTheme.ts): if the project already uses a routing
    // i18n module, that one should own this attribute.
    if (themeConfig?.enabled?.manageHtmlLang) {
      const localeCookie = useCookie<string>(themeConfig?.localeCookie || DEFAULT_LOCALE_COOKIE_NAME)
      const locale = useThemeLocale(theme, localeCookie, {
        enabled: themeConfig?.enabled?.translation !== false,
        forcedLocale: themeConfig?.locale,
        defaultLocale: themeConfig?.defaultLocale || DEFAULT_LOCALE,
      })
      htmlAttrs.lang = locale.currentLocale.value
    }

    // Applies directly during SSR
    useHead({ htmlAttrs })
  },
})

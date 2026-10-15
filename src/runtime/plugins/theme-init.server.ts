// runtime/plugins/theme-init.server.ts
import { defineNuxtPlugin, useRuntimeConfig, useCookie, useHead } from '#app'
import { THEME_PREFERENCE_COOKIE, THEME_RESOLVED_COOKIE, THEME_MODE_COOKIE, DEFAULT_LOCALE_COOKIE_NAME, DEFAULT_LOCALE } from '../../shared/constants'
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
    const modeCookie = useCookie<string>(THEME_MODE_COOKIE)

    const theme = buildResolvedTheme(themeConfig)

    // No `matchMedia` on the server: `resolveThemePreference` doesn't know
    // whether the user prefers light/dark when the mode is 'system' (i.e.
    // "Automatic"), so it assumes dark — the pre-hydration script
    // (`runtime/scripts/theme-init.ts`) corrects it on the client before the
    // first paint, if needed. 'system' is never a variant id itself (no CSS is
    // generated for it), so it can't end up in `data-theme`.
    const resolvedTheme = resolvedCookie.value && isColorTheme(theme.colors.themes[resolvedCookie.value])
      ? resolvedCookie.value
      : resolveThemePreference(preferenceCookie.value, modeCookie.value, theme.colors, true)

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

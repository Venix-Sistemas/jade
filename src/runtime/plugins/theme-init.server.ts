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

    // Sem `matchMedia` no servidor: `resolveThemePreference` não sabe se o
    // usuário prefere claro/escuro quando a preferência é 'system' (ex.:
    // "Automático"), então assume escuro — o script pré-hidratação
    // (`runtime/scripts/theme-init.ts`) corrige no cliente antes do primeiro
    // paint, se necessário. Antes, um preferenceCookie 'system' era tratado
    // como um nome de tema válido (a chave existe em `colors.themes` como
    // placeholder de UI — ver `theme.json`) e virava `data-theme="system"`,
    // para o qual não existe CSS gerado (`generateThemeVars` pula 'system'
    // de propósito) — resultando em flash sem cor nenhuma.
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

    // `lang` precisa refletir o locale resolvido (WCAG 3.1.1) — mas só quando
    // habilitado explicitamente (ver `translation.manageHtmlLang` e o mesmo
    // comentário em useVenixTheme.ts): se o projeto já usa um módulo de i18n
    // de rotas, é ele quem deve ser o dono desse atributo.
    if (themeConfig?.enabled?.manageHtmlLang) {
      const localeCookie = useCookie<string>(themeConfig?.localeCookie || DEFAULT_LOCALE_COOKIE_NAME)
      const locale = useThemeLocale(theme, localeCookie, {
        enabled: themeConfig?.enabled?.translation !== false,
        forcedLocale: themeConfig?.locale,
        defaultLocale: themeConfig?.defaultLocale || DEFAULT_LOCALE,
      })
      htmlAttrs.lang = locale.currentLocale.value
    }

    // Aplica no SSR diretamente
    useHead({ htmlAttrs })
  },
})

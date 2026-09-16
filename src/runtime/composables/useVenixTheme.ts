// runtime/composables/useVenixTheme.ts
import { computed, watch, onMounted, onUnmounted, getCurrentInstance } from 'vue'
import { useRuntimeConfig, useState } from '#app'
import { DEFAULT_THEME, DEFAULT_LOCALE, COOKIE_PREFERENCES_UPDATED_EVENT, COOKIE_CONSENT_STORAGE_KEY } from '../../shared/constants'
import { useThemeCookies } from './useThemeCookies'
import { useThemeLocale } from './useThemeLocale'
import { useThemeSeasonal } from './useThemeSeasonal'
import { useThemeColors } from './useThemeColors'
import { hasCookieConsent } from '../../shared/utils/consent'
import { buildResolvedTheme } from '../../shared/utils/theme-config'
import { resolveThemePreference } from '../../shared/utils/theme-resolve'
import type { ThemeIconFormat } from '../../shared/utils/icon'

export const useVenixTheme = () => {
  const config = useRuntimeConfig()
  const themeConfig = config.public.venixTheme

  const theme = buildResolvedTheme(themeConfig)

  const defaultTheme = theme.colors.defaultColor || DEFAULT_THEME
  const shouldApplyColors = themeConfig?.applyColors !== false && theme.colors.defaults !== false

  // Cookies — o cookie de locale é o mesmo usado por soluções de i18n de rotas
  // (ex.: @nuxtjs/i18n usa 'i18n_redirected' por padrão, igual ao nosso), para
  // que as traduções de nome de tema sigam automaticamente o idioma do app.
  const cookies = useThemeCookies(themeConfig?.localeCookie)

  // Consentimento de cookies — compartilhado via useState pelo mesmo motivo
  // que `preference` (múltiplas chamadas de useVenixTheme() devem concordar
  // sobre o estado atual). `venix-theme-preference`/`venix-theme-resolved` só
  // são gravados quando isto for `true` (ver useThemeCookies.ts).
  const hasConsent = useState<boolean>('venix-cookie-consent', () =>
    typeof window !== 'undefined' && hasCookieConsent(),
  )

  // Locale
  const locale = useThemeLocale(theme, cookies.localeCookie, {
    enabled: themeConfig?.enabled?.translation !== false,
    forcedLocale: themeConfig?.locale,
    defaultLocale: themeConfig?.defaultLocale || DEFAULT_LOCALE,
  })

  // `lang` precisa refletir o locale resolvido (WCAG 3.1.1) — mas só quando
  // NADA MAIS já for dono desse atributo. Desligado por padrão porque, se o
  // projeto usa um módulo de i18n de rotas (ex.: @nuxtjs/i18n), é ele quem
  // deve controlar `lang`: o locale dele reflete a URL atual, enquanto o
  // nosso só reflete cookie/idioma do navegador — os dois podem divergir
  // (ex.: usuário navega para `/es`, mas nosso cookie ainda diz `pt`), e essa
  // sincronização ficaria "brigando" com a do i18n. Ver `translation.manageHtmlLang`.
  if (themeConfig?.enabled?.manageHtmlLang) {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale.currentLocale.value
    }
    watch(locale.currentLocale, (newLocale) => {
      if (typeof document !== 'undefined') document.documentElement.lang = newLocale
    })
  }

  // Temas sazonais
  const seasonal = useThemeSeasonal(theme)

  // Cores e temas
  const colors = useThemeColors(theme, locale.translate, (themeConfig?.iconFormat as ThemeIconFormat) || 'emote')

  // Estado de preferência — compartilhado via useState para que múltiplas
  // chamadas de useVenixTheme() (ex.: a página e o <VenixThemeSwitcher>) fiquem
  // sincronizadas em vez de terem cada uma sua própria cópia desconectada.
  const initialPreference = cookies.preferenceCookie.value || defaultTheme
  const preference = useState<string>('venix-theme-preference', () => initialPreference || 'system')

  const getResolvedTheme = (pref: string): string => {
    const prefersDark = typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true

    return resolveThemePreference(pref, theme.colors.themes, defaultTheme, prefersDark)
  }

  const apply = (pref: string) => {
    if (!shouldApplyColors) return

    const resolved = getResolvedTheme(pref)

    if (typeof document !== 'undefined') {
      const html = document.documentElement
      html.classList.remove(...colors.themeValues.value)
      html.classList.add(resolved)
      html.setAttribute('data-theme', resolved)
      window.__VENIX_INITIAL_THEME__ = resolved
    }
  }

  // Anima a troca de tema com a View Transitions API (cross-fade nativo do
  // navegador) quando disponível; sem isso a troca continua instantânea.
  const applyWithTransition = (pref: string) => {
    const canAnimate = typeof document !== 'undefined'
      && typeof document.startViewTransition === 'function'
      && !window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!canAnimate) {
      apply(pref)
      return
    }

    // Durante a transição, navegadores baseados em Chromium voltam a exibir o
    // cursor padrão do SO em vez do customizado. O cursor customizado é
    // definido em `body` (ver shared/css/cursor.ts) — fixar o mesmo valor
    // via inline style *no próprio `body`* (não em `<html>`: `body` tem sua
    // própria regra direta, que sempre vence a herança do elemento pai,
    // então fixar em `<html>` não tem efeito nenhum sobre o que é exibido
    // dentro do body) garante, com a maior especificidade possível, que o
    // cursor certo continue aparecendo mesmo se o navegador ignorar isso
    // durante a animação. Elementos com sua própria regra de cursor (botões,
    // links, campos de texto) não são afetados — uma regra que casa
    // diretamente com o elemento sempre vence a herança, com ou sem
    // `!important` de qualquer um dos lados.
    const body = document.body
    const currentCursor = getComputedStyle(body).cursor
    if (currentCursor && currentCursor !== 'auto') {
      body.style.setProperty('cursor', currentCursor, 'important')
    }

    const restoreCursor = () => body.style.removeProperty('cursor')

    // `.ready`/`.finished` rejeitam quando o navegador pula ou aborta a
    // transição (ex.: uma troca nova chega antes da anterior terminar, ou a
    // aba está oculta) — um resultado esperado, não um erro real; sem os
    // `.catch()`, isso vira "Uncaught (in promise)" no console.
    const transition = document.startViewTransition(() => apply(pref))
    transition.ready.catch(() => {})
    transition.finished.then(restoreCursor).catch(restoreCursor)
  }

  if (typeof document !== 'undefined' && shouldApplyColors) {
    const currentTheme = document.documentElement.getAttribute('data-theme')
    if (currentTheme) {
      if (!cookies.preferenceCookie.value) {
        preference.value = currentTheme
      }
    }
    else {
      apply(preference.value)
    }
  }

  // Re-lê o consentimento e sincroniza os cookies de tema de acordo — chamado
  // sempre que COOKIE_PREFERENCES_UPDATED_EVENT dispara (de qualquer origem:
  // grant()/revoke() abaixo, ou a UI de consentimento do app consumidor) e
  // também diretamente por grant()/revoke() para refletir na hora, sem
  // depender do round-trip do evento.
  const syncPersistence = () => {
    hasConsent.value = hasCookieConsent()

    if (hasConsent.value) {
      cookies.persistIfConsented(preference.value, getResolvedTheme(preference.value))
    }
    else {
      cookies.disablePersistence()
    }
  }

  // Grava o consentimento no formato que este módulo lê (ver hasCookieConsent
  // em shared/utils/consent.ts) e dispara o evento — conveniência para quem
  // não tem um CMP próprio. Um CMP existente pode gravar em COOKIE_CONSENT
  // _STORAGE_KEY e disparar COOKIE_PREFERENCES_UPDATED_EVENT diretamente, sem
  // precisar chamar isto.
  const grantPersistence = () => {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify({ functionality: true }))
    syncPersistence()
    window.dispatchEvent(new Event(COOKIE_PREFERENCES_UPDATED_EVENT))
  }

  const revokePersistence = () => {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify({ functionality: false }))
    syncPersistence()
    window.dispatchEvent(new Event(COOKIE_PREFERENCES_UPDATED_EVENT))
  }

  // `onMounted` exige uma instância de componente ativa — se `useVenixTheme()`
  // for chamado fora de um `setup()` síncrono normal (ex.: contexto perdido
  // sob Suspense/async setup em alguns fluxos de SSR+i18n), ela avisa
  // "onMounted is called when there is no active component instance" e a
  // callback nunca roda. Com instância, comportamento igual a antes; sem
  // instância, roda a mesma lógica assim que possível no cliente em vez de
  // simplesmente falhar — o preço é não conseguir registrar `onUnmounted`
  // para limpeza automática nesse caso específico (ver abaixo).
  const instance = getCurrentInstance()
  const runOnClientMount = (fn: () => void) => {
    if (instance) {
      onMounted(fn)
    }
    else if (typeof window !== 'undefined') {
      queueMicrotask(fn)
    }
  }

  runOnClientMount(() => {
    // `localStorage` só existe no cliente — o SSR sempre inicializa `hasConsent`
    // como `false` (ver useState acima); aqui corrigimos para o valor real
    // assim que hidrata, caso o consentimento já tenha sido concedido antes.
    hasConsent.value = hasCookieConsent()

    if (!shouldApplyColors) return

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handleSystemThemeChange = () => {
      if (preference.value === 'system') applyWithTransition('system')
    }
    mq.addEventListener('change', handleSystemThemeChange)

    const checkSeasonalChange = () => {
      const now = new Date()
      const msToMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime()

      return setTimeout(() => {
        if (preference.value === 'system') applyWithTransition('system')
        checkSeasonalChange()
      }, msToMidnight + 1000)
    }

    const midnightTimeout = checkSeasonalChange()

    window.addEventListener(COOKIE_PREFERENCES_UPDATED_EVENT, syncPersistence)

    if (instance) {
      onUnmounted(() => {
        mq.removeEventListener('change', handleSystemThemeChange)
        clearTimeout(midnightTimeout)
        window.removeEventListener(COOKIE_PREFERENCES_UPDATED_EVENT, syncPersistence)
      })
    }
  })

  watch(preference, (newPref) => {
    if (!shouldApplyColors) return

    applyWithTransition(newPref)
    cookies.persistIfConsented(newPref, getResolvedTheme(newPref))
  })

  const toggle = (forceTheme?: string) => {
    const newTheme = forceTheme ?? (preference.value === 'light' ? 'dark' : 'light')
    preference.value = newTheme
    cookies.persistIfConsented(newTheme, getResolvedTheme(newTheme))
  }

  const data = computed(() =>
    colors.themes.value.find(t => t.value === preference.value) ?? colors.themes.value[0],
  )

  const isSeasonalActive = computed(() => {
    if (preference.value !== 'system') return false
    return seasonal.getActiveSeasonalTheme() !== null
  })

  const activeSeasonalTheme = computed(() => {
    if (preference.value !== 'system') return null
    return seasonal.getActiveSeasonalTheme()
  })

  return {
    theme: {
      value: computed(() => getResolvedTheme(preference.value)),
      preference,
      data,
      toggle,
      isSeasonalActive,
      activeSeasonalTheme,
      shouldApplyColors,
      colors: theme.colors,
    },
    themes: colors.themes,
    locale: {
      current: locale.currentLocale,
      set: locale.setLocale,
      translate: locale.translate,
    },
    persistence: {
      hasConsent,
      grant: grantPersistence,
      revoke: revokePersistence,
      enable: () => cookies.persistIfConsented(preference.value, getResolvedTheme(preference.value)),
      disable: cookies.disablePersistence,
    },
  }
}

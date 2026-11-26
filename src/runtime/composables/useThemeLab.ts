// runtime/composables/useThemeLab.ts
// The visitor's own colors (`color.lab`): state, CSS and saving. Not
// auto-imported: only the editor and its plugin use it.
import { computed } from 'vue'
import { useCookie, useRuntimeConfig, useState } from '#app'
import { useJade } from './useVenixTheme'
import { applyChoice, choiceOf, decodeChoices, encodeChoices } from '../../shared/lab/choice'
import type { LabChoice, LabChoices, LabColor } from '../../shared/lab/choice'
import { LAB_ATTRIBUTE, LAB_COOKIE, LAB_STYLE_ID, THEME_COOKIE_OPTIONS } from '../../shared/constants'
import { hasCookieConsent } from '../../shared/utils/consent'

export const useThemeLab = () => {
  const config = useRuntimeConfig().public.venixTheme
  const { theme } = useJade()
  const cookie = useCookie<string | null>(LAB_COOKIE, THEME_COOKIE_OPTIONS)
  const choices = useState<LabChoices>('jade-theme-lab', () => ({}))

  const canPersist = (): boolean => config?.requireConsent === false || hasCookieConsent()

  const forget = () => {
    cookie.value = null
    document.cookie = `${LAB_COOKIE}=; path=/; max-age=0; SameSite=Lax`
    try {
      localStorage.removeItem(LAB_COOKIE)
    }
    catch { /* storage can be blocked */ }
  }

  /** Saves the choices, when allowed; without consent they last for this visit only. */
  const persist = () => {
    const key = encodeChoices(choices.value)
    if (!key || !canPersist()) {
      forget()
      return
    }
    cookie.value = key
    const css = document.getElementById(LAB_STYLE_ID)?.textContent
    try {
      localStorage.setItem(LAB_COOKIE, JSON.stringify({ v: config?.lab?.version, key, css, ids: Object.keys(choices.value).join(' ') }))
    }
    catch { /* storage can be blocked: the plugin builds the CSS again next time */ }
  }

  const loadEngine = () => import('../../shared/lab/preview')

  const buildOptions = () => ({
    contrast: config?.lab?.contrast ?? 'AA' as const,
    highContrast: config?.lab?.highContrast === true,
    vuetify0: config?.lab?.vuetify0 === true,
    vuetify: config?.enabled?.vuetify === true,
    legacyNames: config?.legacyNames !== false,
  })

  const render = async () => {
    const ids = Object.keys(choices.value)
    let style = document.getElementById(LAB_STYLE_ID)
    if (!ids.length) {
      style?.remove()
      document.documentElement.removeAttribute(LAB_ATTRIBUTE)
      return
    }
    const { choicesCss } = await loadEngine()
    const css = choicesCss(theme.colors.themes, choices.value, buildOptions())
    if (!style) {
      style = document.createElement('style')
      style.id = LAB_STYLE_ID
      document.head.append(style)
    }
    style.textContent = css
    document.documentElement.setAttribute(LAB_ATTRIBUTE, ids.join(' '))
  }

  /**
   * Applies a choice to a variant, unless it would make some text or outline
   * lose the contrast level: then nothing changes, and those pairs are returned.
   */
  const set = async (id: string, choice: LabChoice): Promise<string[]> => {
    const base = theme.colors.themes[id]
    if (!base) return []
    const { lostContrast } = await loadEngine()
    const lost = lostContrast(base, applyChoice(base, choice), buildOptions().contrast)
    if (lost.length) return lost

    choices.value = { ...choices.value, [id]: choice }
    await render()
    persist()
    return []
  }

  /**
   * Changes one color of a variant, or the closest tone to it that stays
   * legible. Returns the color in effect, or `null` when none was found and
   * nothing changed.
   */
  const setColor = async (id: string, name: LabColor, color: string): Promise<string | null> => {
    const base = theme.colors.themes[id]
    if (!base) return null
    const { nearestColor } = await loadEngine()
    const current = choices.value[id] ?? choiceOf(base)
    const tone = nearestColor(base, current, name, color, buildOptions().contrast)
    if (!tone) return null

    const choice = { ...current, colors: { ...current.colors, [name]: tone } }
    if ((await set(id, choice)).length) return null
    return applyChoice(base, choice)[name] ?? null
  }

  /** Back to the theme as the project set it: one variant, or all of them. */
  const reset = async (id?: string) => {
    choices.value = id ? Object.fromEntries(Object.entries(choices.value).filter(([key]) => key !== id)) : {}
    await render()
    persist()
  }

  /** Brings back what was saved; builds the CSS only if the inline script couldn't. */
  const restore = async () => {
    const saved = decodeChoices(cookie.value, Object.keys(theme.colors.themes))
    if (!Object.keys(saved).length || !canPersist()) return
    choices.value = saved
    if (!document.getElementById(LAB_STYLE_ID)) {
      await render()
      persist()
    }
  }

  return {
    choices,
    customized: computed(() => Object.keys(choices.value).length > 0),
    set,
    setColor,
    reset,
    restore,
    persist,
  }
}

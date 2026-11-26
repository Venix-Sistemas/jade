// runtime/plugins/theme-lab.client.ts
import { defineNuxtPlugin, onNuxtReady } from '#app'
import { useThemeLab } from '../composables/useThemeLab'
import { COOKIE_PREFERENCES_UPDATED_EVENT } from '../../shared/constants'

// `color.lab`: the visitor's saved colors, on every page, with or without
// the theme switcher on it.
export default defineNuxtPlugin((nuxtApp) => {
  onNuxtReady(() => nuxtApp.runWithContext(() => {
    const lab = useThemeLab()
    // Consent granted saves what is on screen; revoked, it is deleted
    window.addEventListener(COOKIE_PREFERENCES_UPDATED_EVENT, () => nuxtApp.runWithContext(lab.persist))
    return lab.restore()
  }))
})

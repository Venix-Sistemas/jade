// runtime/plugins/audit.client.ts
import { defineNuxtPlugin } from '#app'
import { useJade } from '../composables/useVenixTheme'
import { AUDIT_SELECT_EVENT } from '../../shared/constants'

// Development only: lets `venix-jade audit` switch themes the way the app does,
// so what follows the theme in JavaScript (Vuetify, a chart) follows it too.
export default defineNuxtPlugin((nuxtApp) => {
  window.addEventListener(AUDIT_SELECT_EVENT, (event) => {
    nuxtApp.runWithContext(() => useJade().theme.toggle((event as CustomEvent<string>).detail))
  })
})

import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin((_nuxtApp) => {
  if (import.meta.dev) {
    console.log('[@venix-sistemas/nuxt-theme] plugin injected')
  }
})

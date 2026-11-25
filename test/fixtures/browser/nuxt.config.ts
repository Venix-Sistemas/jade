import MyModule from '../../../src/module'

// The module with its defaults (Venix, the seasonal themes, `requireConsent`)
// and a page that mounts the switcher: the browser tests in
// `test/browser/theme.test.ts` drive that page.
export default defineNuxtConfig({
  modules: [
    MyModule,
  ],
})

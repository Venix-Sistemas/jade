import MyModule from '../../../src/module'

// The module with its defaults (Venix, the seasonal themes, `requireConsent`)
// and a page that mounts the switcher: the browser tests in
// `test/browser/theme.test.ts` drive that page. `themeColorMeta` is on to
// cover the `theme-color` tag, and `highContrast` the AAA tokens of `prefers-contrast: more`.
export default defineNuxtConfig({
  modules: [
    MyModule,
  ],
  venixTheme: {
    color: { themeColorMeta: true, highContrast: true },
  },
})

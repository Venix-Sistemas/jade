import MyModule from '../../../src/module'

export default defineNuxtConfig({
  modules: [
    MyModule,
  ],
  venixJade: {
    // A theme name that doesn't exist in the bundled theme.json at all —
    // regression coverage for the anti-FOUC script only knowing about the
    // static theme.json and not this runtime customization (see
    // runtime/nitro/theme-init.ts).
    color: {
      themes: {
        customFixtureTheme: {
          dark: true,
          // The semantic tokens too, so the build exercises the color engine
          // (and the seeds derived from `primary`): it has to stay at build
          // time, see the bundle test in `test/basic.test.ts`.
          tokens: true,
          primary: '#123456',
          background: '#000001',
        },
      },
    },
  },
})

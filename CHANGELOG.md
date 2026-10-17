# Changelog


## v1.2.0

[compare changes](https://github.com/Venix-Sistemas/jade/compare/v1.1.0...v1.2.0)

### 🚀 Enhancements

- **color:** RequireConsent option and dev warning for unsaved themes ([99d206d](https://github.com/Venix-Sistemas/jade/commit/99d206d))
- **theme:** Softer dark palettes for the seasonal themes ([650a3ff](https://github.com/Venix-Sistemas/jade/commit/650a3ff))
- **color:** Choose theme and light/dark mode separately ([1bed1be](https://github.com/Venix-Sistemas/jade/commit/1bed1be))
- **color:** Built-in Easter theme and color.seasonal option ([34d6e13](https://github.com/Venix-Sistemas/jade/commit/34d6e13))
- **switcher:** Menu follows the light/dark mode ([b0d9111](https://github.com/Venix-Sistemas/jade/commit/b0d9111))
- **switcher:** "Website color" label and a visible custom themes heading ([396522e](https://github.com/Venix-Sistemas/jade/commit/396522e))
- **playground:** List custom themes apart from the built-in ones ([bb3be6d](https://github.com/Venix-Sistemas/jade/commit/bb3be6d))

### 🔥 Performance

- **theme:** Memoize buildResolvedTheme per config object ([069b29a](https://github.com/Venix-Sistemas/jade/commit/069b29a))

### 🩹 Fixes

- **icon:** Keep VenixThemeSwitcher working with icon: false, smarter theme icon fallback ([f5778df](https://github.com/Venix-Sistemas/jade/commit/f5778df))
- **switcher:** Center the Mode and Theme headings wherever it's placed ([937b1d9](https://github.com/Venix-Sistemas/jade/commit/937b1d9))
- **cursor:** Correct default hotspots and cover browser-default elements ([ae4878e](https://github.com/Venix-Sistemas/jade/commit/ae4878e))
- **theme:** Persist cookies, recompute stale themes, run effects once ([43203b7](https://github.com/Venix-Sistemas/jade/commit/43203b7))
- **security:** Escape the inline theme script and support CSP nonces ([168f923](https://github.com/Venix-Sistemas/jade/commit/168f923))
- **playground:** Pass <VenixIcon> as a message parameter ([724da96](https://github.com/Venix-Sistemas/jade/commit/724da96))

### 💅 Refactors

- Remove dead code ([9fa37ae](https://github.com/Venix-Sistemas/jade/commit/9fa37ae))
- **theme:** Single source for the theme-resolution rule ([186906e](https://github.com/Venix-Sistemas/jade/commit/186906e))

### 📖 Documentation

- Present Jade as a UI foundation organized by module ([2dbe9f5](https://github.com/Venix-Sistemas/jade/commit/2dbe9f5))
- Update stale comments and README ([96d57e1](https://github.com/Venix-Sistemas/jade/commit/96d57e1))
- Add screenshots and a theme-switching animation to the README ([c05404b](https://github.com/Venix-Sistemas/jade/commit/c05404b))
- Center the README description within the image width ([eda38a0](https://github.com/Venix-Sistemas/jade/commit/eda38a0))

### 🏡 Chore

- Check npm login before starting a release ([b692a87](https://github.com/Venix-Sistemas/jade/commit/b692a87))
- Run CI on master and drop module-starter leftovers ([f4fb549](https://github.com/Venix-Sistemas/jade/commit/f4fb549))

### ❤️ Contributors

- Vinicius ([@VBviniciusVB](https://github.com/VBviniciusVB))

## v1.1.0

[compare changes](https://github.com/Venix-Sistemas/jade/compare/v1.0.1...v1.1.0)

### 🚀 Enhancements

- **theme:** Start the Halloween seasonal theme on October 1st ([13cbb57](https://github.com/Venix-Sistemas/jade/commit/13cbb57))
- **theme:** Easter-relative seasonal date ranges, movable Carnival ([06b3473](https://github.com/Venix-Sistemas/jade/commit/06b3473))
- **theme:** Widen the Carnival seasonal window to 20 days ([2bd5be4](https://github.com/Venix-Sistemas/jade/commit/2bd5be4))

### 🩹 Fixes

- **theme:** Keep theme.value and activeSeasonalTheme in sync with OS scheme and date ([e41a1ec](https://github.com/Venix-Sistemas/jade/commit/e41a1ec))
- **theme:** Merge color.themes overrides theme by theme at runtime ([8090948](https://github.com/Venix-Sistemas/jade/commit/8090948))

### 💅 Refactors

- Fix midnight timer cleanup, dedupe consent and locale lookups ([ac64d00](https://github.com/Venix-Sistemas/jade/commit/ac64d00))
- Reuse extractLocales, simplify theme customization ([c18614d](https://github.com/Venix-Sistemas/jade/commit/c18614d))
- Share color-theme detection and hex color extraction ([03b2815](https://github.com/Venix-Sistemas/jade/commit/03b2815))
- Single Iconify name regex, English-only comments ([c2ede95](https://github.com/Venix-Sistemas/jade/commit/c2ede95))

### 📖 Documentation

- Rewrite README from Installation down for clarity and length ([c40eec8](https://github.com/Venix-Sistemas/jade/commit/c40eec8))

### ❤️ Contributors

- Vinicius ([@VBviniciusVB](https://github.com/VBviniciusVB))

## v1.0.1

[compare changes](https://github.com/Venix-Sistemas/jade/compare/v1.0.0...v1.0.1)

### 🩹 Fixes

- **vuetify:** Write the theme stylesheet before mount in SPA mode ([5a923e3](https://github.com/Venix-Sistemas/jade/commit/5a923e3))

### 📖 Documentation

- Update CHANGELOG commit hashes after history rewrite ([3b910d2](https://github.com/Venix-Sistemas/jade/commit/3b910d2))

### 🏡 Chore

- Use pnpm instead of npm in package scripts ([b7b08ec](https://github.com/Venix-Sistemas/jade/commit/b7b08ec))
- Ignore .claude directory ([2f0dfed](https://github.com/Venix-Sistemas/jade/commit/2f0dfed))

### ❤️ Contributors

- Vinicius ([@VBviniciusVB](https://github.com/VBviniciusVB))

## v1.0.0

[compare changes](https://github.com/Venix-Sistemas/jade/compare/v1.0.0-alpha.5...v1.0.0)

### 💅 Refactors

- Project renamed to Jade ([203d542](https://github.com/Venix-Sistemas/jade/commit/203d542))

### 🏡 Chore

- Update npm publish metadata and alpha tag ([7a1585e](https://github.com/Venix-Sistemas/jade/commit/7a1585e))

### ❤️ Contributors

- Vinicius ([@VBviniciusVB](https://github.com/VBviniciusVB))

## v1.0.0-alpha.5

[compare changes](https://github.com/Venix-Sistemas/nuxt-theme/compare/v1.0.0-alpha.4...v1.0.0-alpha.5)

### 💅 Refactors

- Dark and natal background adjust ([423afe5](https://github.com/Venix-Sistemas/nuxt-theme/commit/423afe5))

### 📦 Build

- **deps:** Updated dependencies ([aa83e63](https://github.com/Venix-Sistemas/nuxt-theme/commit/aa83e63))

### 🏡 Chore

- **release:** V1.0.0-alpha.4 ([846798e](https://github.com/Venix-Sistemas/nuxt-theme/commit/846798e))

### ❤️ Contributors

- Vinicius ([@VBviniciusVB](https://github.com/VBviniciusVB))
- VBviniciusVB <viniciusvianalaguna@hotmail.com>

## v1.0.0-alpha.4

[compare changes](https://github.com/Venix-Sistemas/nuxt-theme/compare/v1.0.0-alpha.2...v1.0.0-alpha.4)

### 🚀 Enhancements

- **playground:** Add real i18n content translations (en/pt/es) ([87f9b07](https://github.com/Venix-Sistemas/nuxt-theme/commit/87f9b07))
- **playground:** Flesh out the Easter seasonal theme, add a dark variant ([e236a50](https://github.com/Venix-Sistemas/nuxt-theme/commit/e236a50))

### 🩹 Fixes

- Locale detection, Vuetify transition freeze, and stale locale cookie ([c0f31d8](https://github.com/Venix-Sistemas/nuxt-theme/commit/c0f31d8))
- Anti-FOUC script ignored custom themes, reverting them on reload ([9af53aa](https://github.com/Venix-Sistemas/nuxt-theme/commit/9af53aa))
- Reconcile theme preference and locale from the live cookie on hydration ([a034486](https://github.com/Venix-Sistemas/nuxt-theme/commit/a034486))
- Wire the theme's custom font into Vuetify's own CSS variables ([ece769a](https://github.com/Venix-Sistemas/nuxt-theme/commit/ece769a))

### 📖 Documentation

- Overhaul README for production, add LICENSE ([d0afd41](https://github.com/Venix-Sistemas/nuxt-theme/commit/d0afd41))
- V1.0.0-alpha.3 ([d6eff93](https://github.com/Venix-Sistemas/nuxt-theme/commit/d6eff93))
- Alpha releases ([c42d591](https://github.com/Venix-Sistemas/nuxt-theme/commit/c42d591))

### ❤️ Contributors

- VBviniciusVB ([@VBviniciusVB](https://github.com/VBviniciusVB))

## v1.0.0-alpha.2

[compare changes](https://github.com/Venix-Sistemas/nuxt-theme/compare/v1.0.0-alpha.1...v1.0.0-alpha.2)

### 🩹 Fixes

- `resolveFeatureOption(true, base)` no longer silently no-ops — `true` now forces `enabled: true`
- The anti-FOUC pre-hydration script is now actually injected into `<head>` via a Nitro `render:html` plugin (the previous `addTemplate` output was never referenced anywhere)
- SSR no longer leaks `data-theme="system"` when the theme preference is `'system'` — it's resolved to a real color theme, same as the client
- `useVenixTheme().locale` is now shared across composable instances (`useState`, like `theme.preference`), fixing call-order-dependent `locale.set()` behavior
- The locale cookie is now only persisted with cookie consent, consistent with the theme cookies
- Theme/seasonal resolution logic (`system` → concrete theme, seasonal date ranges) is now a single shared implementation instead of three independently-drifting copies
- Vuetify's active theme now stays in sync with runtime theme changes, using the current `theme.change()` API instead of the deprecated direct assignment to `theme.global.name.value`
- `onMounted`/`onUnmounted` in `useVenixTheme` no longer warn when called without an active component instance
- Removed an unguarded debug `console.log` from the runtime plugin

### 🚀 Enhancements

- UnoCSS integration is now an exported `venixUnoPreset()` you add to your own `uno.config.ts`, instead of an auto-injected hook that `@unocss/nuxt`'s own config reload silently discarded whenever your `uno.config.ts` declared any `theme` key of its own
- Icon collections (`@iconify-json/*`) are now tree-shaken down to only the icons actually referenced by theme colors/aliases, instead of bundling entire collections (e.g. `mdi`) on the server

## v0.1.5

[compare changes](https://github.com/Venix-Sistemas/nuxt-theme/compare/v0.1.3...v0.1.5)

## v0.1.3


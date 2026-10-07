# Changelog


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


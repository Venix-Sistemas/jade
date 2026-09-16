# Changelog


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


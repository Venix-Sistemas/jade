# @venix-sistemas/nuxt-theme

[![npm version](https://badge.fury.io/js/@venix-sistemas%2Fnuxt-theme.svg)](https://badge.fury.io/js/@venix-sistemas%2Fnuxt-theme)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A complete theme module for Nuxt applications, providing a centralized system for colors, typography, cursor, scrollbar, internationalization and seasonal themes.

## Features

* 🎨 **Dark and light themes**
* 🌈 **Custom color themes**
* 🌐 **Internationalization and locale detection**
* 📝 **Custom typography and font faces**
* 🖱️ **Custom cursor**
* 📜 **Custom scrollbar**
* 🎃 **Seasonal themes** — Carnival, Halloween, Christmas and more
* 💾 **Cookie-based persistence**
* 🖥️ **System theme preference detection**
* ⚡ **Nuxt-native integration**
* 🎯 **UnoCSS preset** for the theme's color variables
* 🎭 **Vuetify theme auto-configuration**
* ✨ **Unified icons** — emoji, Iconify (including animated `line-md` icons) or inline SVG through one component

## Installation

Install the package using your preferred package manager:

```bash
npm install @venix-sistemas/nuxt-theme
```

Or with pnpm:

```bash
pnpm add @venix-sistemas/nuxt-theme
```

## Quick Setup

### 1. Add the module

Add `@venix-sistemas/nuxt-theme` to the `modules` section of your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ['@venix-sistemas/nuxt-theme'],

  venixTheme: {
    translation: {
      locale: 'pt-BR',
      defaultLocale: 'en-US',
      cookieSync: 'i18n_redirected',
    },

    color: {
      themes: {
        dark: {
          primary: '#FF6B6B',
        },
      },
    },

    scrollbar: true,
    cursor: true,
    typography: true,
  },
})
```

### 2. Use the theme

You can access the theme utilities directly from your components via the auto-imported `useVenixTheme()` composable (named this way, rather than `useTheme`, to avoid colliding with the composable UI libraries like Vuetify auto-import under that same name):

```vue
<template>
  <div>
    <button @click="theme.toggle('dark')">
      Dark
    </button>

    <button @click="theme.toggle('light')">
      Light
    </button>
  </div>
</template>

<script setup lang="ts">
const { theme } = useVenixTheme()
</script>
```

`useVenixTheme()` returns four grouped values:

- `theme` — current state and controls: `value` (resolved theme), `preference` (user's raw choice, including `'system'`), `data` (the active theme's `{ value, name, icon }`), `toggle(name?)`, `isSeasonalActive`, `activeSeasonalTheme`, `shouldApplyColors`, `colors` (the raw theme config).
- `themes` — the full list of selectable themes, ready to render a picker (see [Theme icons](#theme-icons)).
- `locale` — `{ current, set }` for the module's i18n state.
- `persistence` — cookie-consent gating for the theme cookies (see [Cookie Consent](#cookie-consent)): `hasConsent`, `grant()`, `revoke()`, plus the lower-level `enable()`/`disable()`.

`useVenixTheme()`'s preference is shared app-wide (via Nuxt's `useState`) — calling it from multiple components (e.g. your own page and `<VenixThemeSwitcher>` below) always reads/writes the same active theme, they never go out of sync.

### 3. Ready-made component

`<VenixThemeSwitcher>` is an auto-imported, framework-agnostic (no Vuetify/UI-kit dependency) dropdown for picking a color theme, using `<VenixIcon>` internally for each theme's icon:

```vue
<template>
  <VenixThemeSwitcher label="Color theme" />
</template>
```

Props:

| Prop        | Type      | Default                       | Description                                                  |
| ----------- | --------- | ------------------------------ | -------------------------------------------------------------- |
| `label`     | `string`  | auto (translated, see below)  | Accessible label for the trigger button and the menu heading |
| `showLabel` | `boolean` | `false`                        | Also show the active theme's name next to the icon on the button |

Without a `label`, it picks one of its own built-in translations based on the resolved locale (same detection as theme-name translations — see [Internationalization](#internationalization)), so it isn't stuck in a single hardcoded language.

A few behaviors worth knowing about:

- The trigger's icon key changes on every theme switch, forcing it to remount — so animated icons (Iconify `line-md`, etc.) replay their animation each time instead of staying frozen mid-frame.
- The trigger fades in from `opacity: 0` on mount rather than popping in.
- The dropdown's item names and icons use fixed, hardcoded neutral colors (a dark surface with light text) instead of the active theme's `--color-*` variables — on purpose, so the list of themes stays equally legible no matter which theme is currently applied. The trigger button itself is unaffected and still uses the active theme's colors.
- Selecting a theme announces the change to screen readers via a visually-hidden live region, and keyboard users get arrow-key/Home/End navigation between items (`role="menu"` + `role="menuitemradio"`), with focus returning to the trigger on close.

It ships with minimal, self-contained CSS, so it looks reasonable out of the box in any project — style it further with `.venix-theme-switcher`, `.venix-theme-switcher__trigger`, `.venix-theme-switcher__menu` and `.venix-theme-switcher__item` (see [`VenixThemeSwitcher.vue`](./src/runtime/components/VenixThemeSwitcher.vue)).

### Theme transition

Switching themes (via `theme.toggle()`, the switcher above, or a system/seasonal auto-change) is animated with the browser's native [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API) — a soft cross-fade between the old and new appearance, no extra setup needed. It falls back to an instant swap on browsers without support, and is skipped automatically when the user has `prefers-reduced-motion: reduce` set.

## Configuration

### Module Options

Every feature (`translation`, `color`, `scrollbar`, `cursor`, `typography`) is configured through a single key that accepts either a `boolean` (quick enable/disable) or a config object (which also enables the feature):

| Option        | Type                 | Default | Description                                    |
| ------------- | -------------------- | ------- | ----------------------------------------------- |
| `theme`       | `string`             | —       | Path to a custom theme JSON file                |
| `translation` | `boolean \| object`  | `true`  | Enable or configure locale detection/i18n       |
| `color`       | `boolean \| object`  | `true`  | Enable or configure the color system            |
| `scrollbar`   | `boolean \| object`  | `true`  | Enable or configure the custom scrollbar        |
| `cursor`      | `boolean \| object`  | `true`  | Enable or configure the custom cursor           |
| `typography`  | `boolean \| object`  | `true`  | Enable or configure typography                  |
| `vuetify`     | `boolean \| object`  | `false` | Auto-configure Vuetify's theme with the theme colors |
| `icon`        | `boolean \| object`  | `true`  | Install and configure `@nuxt/icon`, register `<VenixIcon>` / `useVenixIcon` |

#### `translation` object

| Property       | Type      | Default              | Description                                       |
| -------------- | --------- | -------------------- | -------------------------------------------------- |
| `locale`       | `string`  | —                     | Force a specific locale                            |
| `defaultLocale`| `string`  | `'en-US'`             | Default fallback locale                            |
| `cookieSync`   | `string`  | `'i18n_redirected'`   | Cookie used to persist/sync the selected locale    |
| `manageHtmlLang` | `boolean` | `false`             | Keep `<html lang>` in sync with the resolved locale (see [Internationalization](#internationalization)) |

Setting `translation: false` fully disables locale auto-detection and cookie syncing — useful if another module (e.g. `@nuxtjs/i18n`) already owns that cookie.

#### `color` object

| Property      | Type      | Default  | Description                                          |
| ------------- | --------- | -------- | ----------------------------------------------------- |
| `apply`       | `boolean` | `true`   | Automatically apply the resolved theme (`data-theme`) |
| `defaultColor`| `string`  | `'dark'` | Name of the theme used when no preference is set      |
| `themes`      | `object`  | `{}`     | Override or add custom color themes                   |
| `iconFormat`  | `'emote' \| 'css' \| 'svg'` | `'emote'` | Preferred variant for themes with an `icon` object — see [Theme icons](#theme-icons) |

## UnoCSS integration

`nuxt-theme` ships a UnoCSS preset that exposes the theme's color variables under `theme.colors` — add it to your own `uno.config.ts`:

```typescript
// uno.config.ts
import { defineConfig } from 'unocss'
import { venixUnoPreset } from '@venix-sistemas/nuxt-theme/unocss'

export default defineConfig({
  presets: [
    venixUnoPreset(),
    // ...your other presets
  ],
})
```

`venixUnoPreset()` is equivalent to writing this yourself:

```typescript
theme: {
  colors: {
    primary: 'var(--color-primary)',
    secondary: 'var(--color-secondary)',
    accent: 'var(--color-accent)',
    error: 'var(--color-error)',
    info: 'var(--color-info)',
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    background: 'var(--color-background)',
    background2: 'var(--color-background2)',
    background3: 'var(--color-background3)',
    inverse: 'var(--color-inverse)',
  },
}
```

This means utilities like `text-primary`, `bg-background2` or `border-accent` work out of the box. If you already define any of these colors yourself in `uno.config.ts`, your values take precedence.

This has to be added manually rather than auto-injected: `@unocss/nuxt` reloads `uno.config.ts` from disk on its own (to support HMR) and shallow-merges that file against anything injected through the `unocss:config` hook, which silently discards a hook-injected `theme` whenever your `uno.config.ts` already declares its own `theme` key — even one without any colors in it. As a preset living inside your own `presets` array, these colors become part of what's actually read from the file, so they survive that merge.

## Vuetify integration

If [`vuetify-nuxt-module`](https://nuxt.vuetifyjs.com) is installed, enabling `vuetify: true` registers every color theme as a Vuetify `ThemeDefinition` and keeps Vuetify's active theme in sync with the cookie the rest of the module uses — no more hand-written `theme.themes` mapping in `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: [
    '@venix-sistemas/nuxt-theme', // must come before the Vuetify module
    'vuetify-nuxt-module',
  ],
  venixTheme: {
    vuetify: true,
  },
})
```

Unlike the UnoCSS integration (which points at CSS variables), Vuetify computes contrast and `on-*` colors in JavaScript, so it needs real hex values — the module passes the actual colors from each theme, not `var(...)` strings. `background2` is also mapped to Vuetify's `surface` slot (used by cards, toolbars, etc.), since that's the closest match in this module's color system, and every color is still available under its own name too (`bg-background2`, `text-inverse`, ...).

`vuetify: true` also adds a small runtime plugin that resolves the same `theme-preference`/`theme-resolved` cookies used elsewhere in the module, so Vuetify's `defaultTheme` matches what's rendered on the page from the first paint — both on the server and the client.

**This must come before the Vuetify module in your `modules` array** — the registration happens through Vuetify's own [`vuetify:registerModule`](https://nuxt.vuetifyjs.com/guide/advanced/layers-and-hooks.html) build hook, which only picks up registrations made before Vuetify resolves its configuration. If you already define `vuetify.vuetifyOptions.theme.themes` yourself, your values take precedence over the generated ones (merged per color, not replaced wholesale).

`vuetify` defaults to `false` — unlike the other integrations, it ships a runtime plugin, so it's opt-in rather than automatic. There's no hard dependency on Vuetify: if `vuetify-nuxt-module` isn't installed, enabling this option is a no-op.

## Icons

`nuxt-theme` installs and configures [`@nuxt/icon`](https://github.com/nuxt/icon) automatically and registers `<VenixIcon>` (and the equivalent `useVenixIcon()` composable), which accept **one single `icon` value** in any of three formats:

```vue
<template>
  <VenixIcon icon="🎨" />
  <VenixIcon icon="line-md:home" />
  <VenixIcon icon="<svg viewBox=\"0 0 24 24\">...</svg>" />
</template>
```

* **Emoji** — any other string, rendered as text.
* **Iconify icon name** — `collection:name` format (e.g. `line-md:home`, `mdi:home`). Includes full support for [`line-md`](https://icon-sets.iconify.design/line-md/)'s animated icons.
* **Inline SVG** — a string starting with `<svg`, rendered via `v-html`. Only pass SVGs you or your theme config author, not end-user input — like any other `v-html` usage, this is not sanitized.

### Aliases

Define short names for any of the three formats through `icon.aliases`, so consuming components don't need to remember full Iconify names:

```typescript
venixTheme: {
  icon: {
    aliases: {
      home: 'line-md:home',
      favorite: 'line-md:heart-filled',
      brand: '🎨',
    },
  },
}
```

```vue
<VenixIcon icon="home" />
```

### Offline icon collections

By default, the `line-md` collection is bundled at build time via `@iconify-json/line-md` (a direct dependency of this module) — icons resolve from the published package itself, not from the Iconify API, so they keep working the same way in the playground and once this module is installed as a dependency elsewhere, including offline. Add more collections with `icon.collections` (each one needs its matching `@iconify-json/<collection>` package installed in your project — this fully bundles the whole collection, so any icon from it can be used anywhere in your app, not just in theme icons):

```typescript
venixTheme: {
  icon: {
    collections: ['line-md', 'mdi'],
  },
}
```

Independently of `icon.collections`, any `collection:name` value used in a theme's `icon` (see [Theme icons](#theme-icons) below) or in `icon.aliases` is detected automatically and bundled offline with **only the icons actually referenced** (via [`@iconify/utils`](https://iconify.design/docs/libraries/utils/)'s tree-shaking) — so picking any Iconify collection for a theme icon (the built-in themes use `mdi` for their `css` variant, for example) never embeds the whole collection just for a handful of icons. This lookup tries this module's own dependencies first, then your project's `node_modules`, so a collection you install yourself for a custom theme icon (without adding it to `icon.collections`) is found and tree-shaken the same way. If a referenced collection isn't found in either place, `@nuxt/icon` falls back to fetching it from the Iconify API at runtime (needs internet).

Setting `icon: false` skips installing `@nuxt/icon` entirely — useful if your project already configures it directly.

### Theme icons

Each color theme's `icon` (used by `useVenixTheme().themes` for things like a theme picker) can be a plain emoji string, like the built-in themes ship by default:

```json
"dark": {
  "icon": "🌙"
}
```

...or an object offering up to three variants, letting the app pick the best one for its needs:

```json
"light": {
  "icon": {
    "emote": "☀️",
    "css": "mdi:sun-compass",
    "svg": "line-md:sunny-filled-loop"
  }
}
```

* `emote` — an emoji, always required as the fallback.
* `css` — an Iconify icon name rendered via `@nuxt/icon` in **CSS mode** (background/mask, no animation, lighter weight).
* `svg` — an Iconify icon name rendered via `@nuxt/icon` in **SVG mode** (a real `<svg>` element — required for animated icons like `line-md`'s to actually animate).

Which variant gets used is controlled globally by `color.iconFormat` (`'emote' | 'css' | 'svg'`, defaults to `'emote'`) — it falls back to `emote` automatically for any theme that doesn't define the chosen format (including themes that just use a plain string):

```typescript
venixTheme: {
  color: {
    iconFormat: 'svg',
  },
}
```

`useVenixTheme().themes` exposes the already-resolved icon as `{ format, value }`, ready to feed into `<VenixIcon>`:

```vue
<VenixIcon
  v-if="item.icon"
  :icon="item.icon.value"
  :mode="item.icon.format === 'emote' ? undefined : item.icon.format"
/>
```

## Themes

The module supports dark and light themes and can be extended with custom color configurations.

```typescript
color: {
  themes: {
    dark: {
      primary: '#FF6B6B',
    },

    light: {
      primary: '#FF6B6B',
    },
  },
}
```

Theme preferences can be persisted using cookies and can also follow the user's system preference.

## Cookie Consent

The module writes two cookies to remember the user's choice across visits:

| Cookie                    | Purpose                                          |
| -------------------------- | ------------------------------------------------- |
| `venix-theme-preference`  | The user's raw choice (`'dark'`, `'system'`, a custom theme name, …) |
| `venix-theme-resolved`    | The actually-applied theme (e.g. `'system'` resolved to `'dark'`) — lets SSR render the right theme on the next visit without a flash |

Neither is written until cookie consent is granted — **switching themes always works immediately for the current visit either way**; without consent it just isn't remembered on the next one. (The module's own locale cookie, used for `@nuxtjs/i18n` interop, is a separate concern — see [Integrating with a routing-based i18n module](#integrating-with-a-routing-based-i18n-module-eg-nuxtjsi18n).)

Consent is read from `localStorage['venix-cookie-consent']` (a JSON object with a `functionality: boolean` field) — the same format most cookie-consent banners already use for a "functional cookies" category. This module never writes that key on its own; either wire your own consent banner to it, or use the convenience methods below for a minimal one:

```vue
<script setup lang="ts">
const { persistence } = useVenixTheme()
</script>

<template>
  <p>Cookies: {{ persistence.hasConsent.value ? 'allowed' : 'not allowed' }}</p>
  <button @click="persistence.grant()">Allow cookies</button>
  <button @click="persistence.revoke()">Revoke cookies</button>
</template>
```

- `persistence.hasConsent` — reactive `Ref<boolean>`, current consent state (shared app-wide, like `theme.preference`).
- `persistence.grant()` — records consent (`{ functionality: true }`) and immediately persists the current theme preference to cookies.
- `persistence.revoke()` — records the opposite and immediately deletes both cookies.

If you already have your own consent-management setup (a full CMP, a custom banner, etc.), skip `grant()`/`revoke()` and just make sure it writes the same `localStorage` key/shape and dispatches a `window` event named `venix-cookie-preferences-updated` after any change — the module listens for that event (from any source) to re-sync immediately, rather than waiting for the next theme change:

```ts
localStorage.setItem('venix-cookie-consent', JSON.stringify({ functionality: true }))
window.dispatchEvent(new Event('venix-cookie-preferences-updated'))
```

`persistence.enable()` / `persistence.disable()` remain available as the lower-level primitives (`enable()` still checks the stored consent before writing, so it's safe to call speculatively — it's a no-op without consent).

## Internationalization

The module supports locale detection and can integrate with the application's internationalization setup — it's used to translate each color theme's name (`theme.colors.themes.<name>.translations`) and the built-in strings of `<VenixThemeSwitcher>`.

The locale resolution can use:

1. The explicitly configured locale (`translation.locale`)
2. A forced locale from config
3. The persisted locale cookie (`translation.cookieSync`, default `'i18n_redirected'`)
4. The `Accept-Language` header (SSR) / `navigator.language` (client)
5. The configured default locale (`translation.defaultLocale`)

### Using your own translations

`useVenixTheme().locale` also exposes the same resolution/fallback logic the module uses internally for theme names, in case you want to translate your own strings the same way:

```ts
const { locale } = useVenixTheme()

locale.translate({ 'en-US': 'Hello', 'pt-BR': 'Olá' }, 'Hello') // fallback if no match
```

### Integrating with a routing-based i18n module (e.g. `@nuxtjs/i18n`)

`translation.cookieSync` defaults to `'i18n_redirected'` — the same cookie `@nuxtjs/i18n` uses by default — so theme-name translations automatically follow whichever locale your app's i18n module resolves, with no extra wiring in the common case. If you've customized either side's cookie name, point `cookieSync` at the same one.

By default, this module does **not** touch `<html lang>`. If your app has no routing-based i18n module and you still want `<html lang>` to reflect the resolved locale (recommended for accessibility — WCAG 3.1.1 — so screen readers pronounce translated theme names correctly), turn it on explicitly:

```ts
venixTheme: {
  translation: {
    manageHtmlLang: true,
  },
}
```

Leave it off (the default) if you use `@nuxtjs/i18n` or a similar module: that module's locale reflects the current route and is the correct source of truth for `<html lang>`, while this module's own locale detection (cookie/header/browser) can briefly disagree with it (e.g. right after navigating to a localized route, before any cookie write happens) — having both write to `lang` would make them fight over it.

## Seasonal Themes

Seasonal themes allow the appearance of the application to change automatically based on predefined occasions.

Supported themes include:

* 🎭 Carnival
* 🎃 Halloween
* 🎄 Christmas

Additional seasonal themes can be added as the theme system evolves.

## Development

Clone the repository and install the dependencies:

```bash
pnpm install
```

Start the playground:

```bash
pnpm dev
```

Run the tests:

```bash
pnpm test
```

Build the package:

```bash
pnpm prepack
```

Run the linter:

```bash
pnpm lint
```

## Documentation

* [Online Documentation](https://github.com/seu-usuario/nuxt-theme)
* [Playground](./playground)

## License

MIT License

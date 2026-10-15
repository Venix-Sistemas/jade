<p align="center">
  <img src="./docs/images/jade-transparent.png" alt="Jade logo" width="200">
</p>

<h1 align="center">Jade</h1>

<p align="center">
  <code>@venix-sistemas/jade</code>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@venix-sistemas/jade"><img src="https://badge.fury.io/js/@venix-sistemas%2Fjade.svg" alt="npm version"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT"></a>
</p>

The UI foundation for Nuxt applications, in a single module: color themes (including seasonal ones), typography, scrollbar, cursor, icons and interface translations, with UnoCSS and Vuetify integrations.

## Features

* 📝 **Typography and font faces customization**
* 🖱️ **Cursor customization**
* 📜 **Scrollbar customization**
* 🎨 **Color customization**, with dark and light themes included
* 🖥️ **System theme preference detection**, including seasonal overrides
* 🎃 **Seasonal themes**: Carnival, Halloween, Christmas and more
* 💾 **Cookie-consent-aware persistence**: nothing is written until the user opts in
* 🌐 **i18n**: internationalization and locale detection for theme names and your own strings
* ⚡ **Nuxt-native integration**
* 🎯 **UnoCSS preset** for the theme's color variables
* 🎭 **Vuetify 4** theme auto-configuration, kept in sync with live theme changes
* ✨ **Unified icons**: emoji, Iconify (animated `line-md`, `mdi`, both bundled and tree-shaken offline) or inline SVG through one component

## Installation

```bash
pnpm add @venix-sistemas/jade
# or
npm install @venix-sistemas/jade
```

## Quick Setup

### 1. Add the module

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@venix-sistemas/jade'],

  venixTheme: {
    color: {
      themes: {
        dark: {
          primary: '#FF6B6B',
        },
      },
    },
  },
})
```

Every module except Vuetify is on by default with built-in values, so you only configure what you want to change — the example above just swaps the dark theme's primary color. See [Modules](#modules) for what each one does.

### 2. Use the theme

The auto-imported `useVenixTheme()` composable gives access to the theme. It isn't called `useTheme` to avoid colliding with UI libraries (like Vuetify) that auto-import a composable with that name.

```vue
<template>
  <button @click="theme.toggle('dark')">Dark</button>
  <button @click="theme.toggle('light')">Light</button>
</template>

<script setup lang="ts">
const { theme } = useVenixTheme()
</script>
```

It returns four groups:

- `theme` — state and controls:
  - `value`: the applied theme (e.g. `'dark'` when the preference is `'system'`)
  - `preference`: the user's raw choice, including `'system'`
  - `data`: the active theme's `{ value, name, icon }`
  - `toggle(name?)`: switches to `name`, or between `light` and `dark` when called without one
  - `isSeasonalActive`, `activeSeasonalTheme`: whether a [seasonal theme](#seasonal-themes) is currently in effect, and which one
  - `shouldApplyColors`, `colors`: whether the module applies colors, and the raw color config
- `themes` — every selectable theme, ready to render a picker (see [Theme icons](#theme-icons)).
- `locale` — `current`, `set()` and `translate()` (see [Translation](#translation)).
- `persistence` — cookie consent controls (see [Saving the theme](#saving-the-theme-cookie-consent)).

The state is shared app-wide (via Nuxt's `useState`): every component calling `useVenixTheme()` reads and writes the same theme, so they never go out of sync.

### 3. Ready-made component

`<VenixThemeSwitcher>` is an auto-imported dropdown for picking a theme, with no dependency on Vuetify or any other UI kit:

```vue
<template>
  <VenixThemeSwitcher label="Color theme" />
</template>
```

| Prop        | Type      | Default                 | Description                                         |
| ----------- | --------- | ----------------------- | --------------------------------------------------- |
| `label`     | `string`  | translated, per locale  | Accessible label for the button and the menu        |
| `showLabel` | `boolean` | `false`                 | Show the active theme's name next to the icon       |

- **Accessible:** arrow keys, Home/End and Esc navigate the menu, focus returns to the button on close, and each change is announced to screen readers.
- **Always legible:** the menu uses fixed neutral colors (dark surface, light text) instead of the active theme's, so every option stays readable whatever theme is applied. The button itself follows the active theme.
- **Lively:** animated icons (e.g. `line-md`) replay on every switch, and the button fades in on mount.

It ships with minimal CSS of its own. To restyle it, target `.venix-theme-switcher`, `.venix-theme-switcher__trigger`, `.venix-theme-switcher__menu` and `.venix-theme-switcher__item` (see [`VenixThemeSwitcher.vue`](./src/runtime/components/VenixThemeSwitcher.vue)).

## Modules

Jade is a set of independent modules, each configured under its own key in `venixTheme`. Every key accepts `false` (disable), `true` (enable with defaults) or an object (enable and customize):

| Module                      | Key           | Default | What it does                                                          |
| --------------------------- | ------------- | ------- | --------------------------------------------------------------------- |
| [Colors](#colors)           | `color`       | `true`  | Color themes (dark, light, seasonal, custom), saved per user, as CSS variables and a UnoCSS preset |
| [Translation](#translation) | `translation` | `true`  | Detects the user's locale and translates theme names and your own strings |
| [Icons](#icons)             | `icon`        | `true`  | `<VenixIcon>`: emoji, Iconify (bundled offline) or inline SVG through one component |
| [Typography](#typography)   | `typography`  | `true`  | Base font family, font size and `@font-face` rules                    |
| [Scrollbar](#scrollbar)     | `scrollbar`   | `true`  | A custom scrollbar that follows the active theme                      |
| [Cursor](#cursor)           | `cursor`      | `true`  | Custom cursor images                                                  |
| [Vuetify](#vuetify)         | `vuetify`     | `false` | Registers the color themes with Vuetify and keeps it in sync          |

## Colors

| Option           | Type                        | Default  | Description                                                   |
| ---------------- | --------------------------- | -------- | ------------------------------------------------------------- |
| `apply`          | `boolean`                   | `true`   | Apply the resolved theme to `<html>` (`data-theme` and class) |
| `defaultColor`   | `string`                    | `'dark'` | Theme used when there's no preference yet                     |
| `themes`         | `object`                    | `{}`     | Override or add themes — see [Themes](#themes)                |
| `iconFormat`     | `'emote' \| 'css' \| 'svg'` | `'svg'`  | Preferred theme icon variant — see [Theme icons](#theme-icons) |
| `requireConsent` | `boolean`                   | `true`   | Only save the chosen theme after cookie consent — see [Saving the theme](#saving-the-theme-cookie-consent) |

### Themes

The module ships with `dark`, `light` and the [seasonal themes](#seasonal-themes). `color.themes` extends that set:

- An **existing** name overrides only the properties you set; the rest of the theme (other colors, translations, icon) stays as shipped.
- A **new** name adds a theme that works like a built-in one: its own CSS variables, an entry in `useVenixTheme().themes` (so it appears in `<VenixThemeSwitcher>`), and UnoCSS/Vuetify support when enabled. New themes are dark unless you set `dark: false`.

```typescript
color: {
  themes: {
    // Overrides only `primary` of the built-in dark theme
    dark: {
      primary: '#FF6B6B',
    },

    // Adds a project-specific theme
    summerSale: {
      dark: false,
      primary: '#FF8A00',
      background: '#FFF8EE',
    },
  },
}
```

Available colors: `primary`, `secondary`, `accent`, `error`, `info`, `success`, `warning`, `background`, `background2`, `background3`. Each becomes a `--color-<name>` CSS variable, plus `--color-inverse` (white on dark themes, black on light ones).

### Seasonal themes

Built in: 🎭 Carnival, 🎃 Halloween and 🎄 Christmas. While the preference is `'system'` and today is inside a seasonal theme's `dateRange`, it replaces `dark` or `light` — whichever matches its own `dark` flag and the user's system mode.

Add your own with `seasonal: true` and a `dateRange`. Seasonal themes aren't directly selectable; they only appear through `'system'`. The range is inclusive and wraps across the new year when `end` comes before `start`. Each bound is a fixed `MM-DD` date or, for movable holidays, a number of days relative to Easter Sunday (`easter`, `easter-47`, `easter+1`):

```typescript
color: {
  themes: {
    blackFriday: {
      dark: true,
      seasonal: true,
      dateRange: { start: '11-24', end: '11-30' },
      primary: '#111111',
      background: '#000000',
    },
    pascoa: {
      dark: false,
      seasonal: true,
      dateRange: { start: 'easter-6', end: 'easter' }, // Holy Week, every year
      primary: '#F4A6C0',
      background: '#FFF8F0',
    },
  },
}
```

The built-in Carnival theme uses `easter-65` to `easter-46`: 20 days, from the pre-Carnival weeks up to Ash Wednesday.

### Theme transition

Every theme switch — manual, through the switcher, or an automatic system/seasonal change — cross-fades using the browser's native [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API), with no setup. Browsers without support switch instantly, and the animation is skipped for users with `prefers-reduced-motion: reduce`.

### Saving the theme (cookie consent)

Two cookies remember the user's choice between visits:

| Cookie                   | Stores                                                                              |
| ------------------------ | ----------------------------------------------------------------------------------- |
| `venix-theme-preference` | The user's raw choice (`'dark'`, `'system'`, a custom theme…)                       |
| `venix-theme-resolved`   | The theme actually applied (e.g. `'dark'` for `'system'`), so SSR renders it with no flash |

By default, neither is written without consent. Switching themes always works; without consent it just isn't remembered on the next visit. In development, the first unsaved theme change logs a `[jade]` warning in the console, so a missing consent setup doesn't go unnoticed.

Consent is read from `localStorage['venix-cookie-consent']`, a JSON object with a `functionality: boolean` field — the "functional cookies" category most consent banners already use. The module never writes this key by itself. For a minimal banner, use the built-in helpers:

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

- `persistence.hasConsent` — reactive `Ref<boolean>`, shared app-wide.
- `persistence.grant()` — records consent and saves the current theme to the cookies right away.
- `persistence.revoke()` — records the refusal and deletes both cookies right away.
- `persistence.enable()` / `persistence.disable()` — lower-level: write or delete the cookies directly (`enable()` still does nothing without consent).

If you already have a consent banner or CMP, have it write the same key and then dispatch `venix-cookie-preferences-updated` on `window`, so the module re-syncs immediately:

```ts
localStorage.setItem('venix-cookie-consent', JSON.stringify({ functionality: true }))
window.dispatchEvent(new Event('venix-cookie-preferences-updated'))
```

For apps without a consent banner — e.g. an internal tool — turn the requirement off, and the theme is always saved:

```typescript
venixTheme: {
  color: {
    requireConsent: false,
  },
}
```

Consent is then ignored for the theme cookies: `persistence.revoke()` no longer deletes them. Whether that's acceptable is a decision for each app; the locale cookie written by `locale.set()` still follows consent (see [Translation](#translation)).

### UnoCSS preset

Add the preset to your `uno.config.ts` to use the theme colors as utilities (`text-primary`, `bg-background2`, `border-accent`, …):

```typescript
// uno.config.ts
import { defineConfig } from 'unocss'
import { venixUnoPreset } from '@venix-sistemas/jade/unocss'

export default defineConfig({
  presets: [
    venixUnoPreset(),
    // ...your other presets
  ],
})
```

It maps every [theme color](#themes), plus `inverse`, to its CSS variable (`primary: 'var(--color-primary)'`, …), so utilities follow the active theme. Colors you define yourself in `uno.config.ts` take precedence.

The preset has to be added by hand: `@unocss/nuxt` re-reads `uno.config.ts` from disk and discards a `theme` injected by other modules whenever your file declares its own `theme` key. As a preset in your own file, the colors survive that.

## Translation

Detects the user's locale to translate the theme names (each theme's `translations`), `<VenixThemeSwitcher>`'s own strings and, optionally, your own strings.

| Option           | Type      | Default             | Description                                              |
| ---------------- | --------- | ------------------- | -------------------------------------------------------- |
| `locale`         | `string`  | —                   | Force a locale, skipping detection                       |
| `defaultLocale`  | `string`  | `'en-US'`           | Fallback when no locale can be detected                  |
| `cookieSync`     | `string`  | `'i18n_redirected'` | Cookie the locale is read from (and written by `locale.set()`) |
| `manageHtmlLang` | `boolean` | `false`             | Keep `<html lang>` in sync — see [below](#integrating-with-a-routing-based-i18n-module-eg-nuxtjsi18n) |

The locale is detected in this order:

1. `translation.locale`, if set (skips every other step)
2. The locale cookie (`translation.cookieSync`)
3. The URL's locale prefix (e.g. `/en/...`), if a theme has a translation for it
4. The `Accept-Language` header (SSR) or `navigator.language` (client)
5. `translation.defaultLocale`

With `translation: false`, detection is off: theme names and the switcher's strings always use `defaultLocale`, and `locale.set()` never writes the cookie. When it's on, `locale.set()` only writes the cookie after [cookie consent](#saving-the-theme-cookie-consent).

### Using your own translations

`locale.translate()` applies the same matching and fallbacks to your own strings:

```ts
const { locale } = useVenixTheme()

locale.translate({ 'en-US': 'Hello', 'pt-BR': 'Olá' }, 'Hello') // second argument: fallback
```

### Integrating with a routing-based i18n module (e.g. `@nuxtjs/i18n`)

`translation.cookieSync` defaults to `'i18n_redirected'`, the same cookie `@nuxtjs/i18n` uses, so theme names follow your app's locale with no extra setup. If you renamed the cookie on either side, point `cookieSync` at the same name.

`<html lang>` isn't touched by default. If your app has **no** routing i18n module, turn on `manageHtmlLang` so `lang` reflects the resolved locale (WCAG 3.1.1 — screen readers pronounce the theme names correctly):

```ts
venixTheme: {
  translation: {
    manageHtmlLang: true,
  },
}
```

Keep it off with `@nuxtjs/i18n` or similar: that module follows the current route and should own `lang`, while this module's detection can briefly disagree with it (e.g. right after navigating to a localized route) and the two would fight over the attribute.

## Icons

Installs and configures [`@nuxt/icon`](https://github.com/nuxt/icon), so every [Iconify](https://icon-sets.iconify.design/) icon is available in your app.

**For regular icons, use `@nuxt/icon`'s own `<Icon>`** — Jade doesn't replace it, and the Iconify aliases from `icon.aliases` work there too:

```vue
<template>
  <Icon name="mdi:home" />
  <Icon name="line-md:home" mode="svg" /> <!-- `mode="svg"` is needed for line-md's animations -->
</template>
```

**For special cases, use `<VenixIcon>`** (or the matching `useVenixIcon()` composable): when the same value may be an Iconify name, an emoji or an inline SVG — for example an icon that comes from configuration or data, like the [theme icons](#theme-icons):

```vue
<template>
  <VenixIcon icon="line-md:home" />
  <VenixIcon icon="<svg viewBox=&quot;0 0 24 24&quot;>...</svg>" />
  <VenixIcon icon="🎨" />
</template>
```

- **Iconify name** — `collection:name` (e.g. `line-md:home`, `mdi:home`), rendered with `<Icon>` in CSS mode by default (lighter, but never animated); pass `mode="svg"` for a real `<svg>`, needed for animations.
- **Inline SVG** — a string starting with `<svg`, rendered with `v-html`. It isn't sanitized, so only pass SVGs you control, never user input.
- **Emoji or text** — anything else.

| Option        | Type                     | Default       | Description                                        |
| ------------- | ------------------------ | ------------- | -------------------------------------------------- |
| `collections` | `string[]`               | `['line-md']` | Iconify collections bundled whole — see [below](#offline-icon-collections) |
| `aliases`     | `Record<string, string>` | `{}`          | Short names for any icon value — see [below](#aliases) |

Set `icon: false` to skip `@nuxt/icon` entirely, e.g. if your project already configures it. `<VenixIcon>` isn't registered then, and theme icons always use their emoji (`emote`), so `<VenixThemeSwitcher>` keeps working.

### Aliases

`icon.aliases` gives short names to any of the three formats:

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

Icons are bundled at build time, so they work offline instead of being fetched from the Iconify API:

- **`line-md`** is bundled whole by default.
- **Icons used in theme `icon`s or in `icon.aliases`** are detected automatically, and only those icons are bundled, not their whole collection. That's how the built-in themes' `mdi` icons are included. The collection is looked up in this module's dependencies first, then in your project's `node_modules`.
- **To use any icon of a collection anywhere in your app**, install its `@iconify-json/<collection>` package and list it in `icon.collections` to bundle it whole. The list replaces the default, so keep `line-md` in it if you still want it:

```typescript
venixTheme: {
  icon: {
    collections: ['line-md', 'tabler'],
  },
}
```

If a referenced collection can't be found, `@nuxt/icon` fetches it from the Iconify API at runtime, which needs internet.

### Theme icons

A theme's `icon` (shown by pickers such as `<VenixThemeSwitcher>`) is either a plain emoji, like `"icon": "🌙"`, or an object with up to three variants:

```json
"light": {
  "icon": {
    "emote": "☀️",
    "css": "mdi:white-balance-sunny",
    "svg": "line-md:sunny-filled-loop"
  }
}
```

- `emote` — an emoji. Required, it's the fallback.
- `css` — an Iconify name rendered in CSS mode: lighter, but never animated.
- `svg` — an Iconify name rendered as a real `<svg>`, needed for animated icons like `line-md`'s.

`color.iconFormat` picks the variant for every theme (default `'svg'`, so the built-in `line-md` icons animate). When a theme doesn't define it, the other Iconify variant is tried before the emoji: `svg` → `css` → `emote` (or `css` → `svg` → `emote`). `useVenixTheme().themes` already resolves it to `{ format, value }`, ready for `<VenixIcon>`:

```vue
<VenixIcon
  v-if="item.icon"
  :icon="item.icon.value"
  :mode="item.icon.format === 'emote' ? undefined : item.icon.format"
/>
```

## Typography

Sets the base font for the whole app: `--font-family-base` and `--font-size-base` on `:root`, plus an `@font-face` rule for each custom font.

```typescript
venixTheme: {
  typography: {
    defaultFonts: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", // default
    fontSize: '16px', // default
    customFonts: [
      { name: 'MyFont', sources: { woff2: '/fonts/MyFont.woff2' }, weight: 'normal', style: 'normal' },
    ],
  },
}
```

Custom fonts come first in `--font-family-base`, with `defaultFonts` as the fallback. The same font list also goes to Vuetify's `--v-font-body`/`--v-font-heading`, since Vuetify components don't inherit `font-family` from the page.

## Scrollbar

A custom scrollbar whose colors follow the active theme. The values below are the defaults:

```typescript
venixTheme: {
  scrollbar: {
    width: 'auto',
    borderRadius: '8px',
    borderWidth: '3px',
    // A theme color name (follows the active theme) or any CSS color
    colors: { thumb: 'primary', thumbHover: 'secondary', track: 'background2', border: 'background3' },
  },
}
```

## Cursor

Replaces the default, pointer and text cursors with images. On by default, using the module's own cursor images; point it at yours to customize, or set `cursor: false` to keep the browser's cursors:

```typescript
venixTheme: {
  cursor: {
    // Images served from `public/`; `hotspot` is the click point ("x y")
    cursors: {
      default: { path: '/cursors/default.png', hotspot: '0 0' },
      pointer: { path: '/cursors/pointer.png', hotspot: '0 0' },
      text: { path: '/cursors/text.png', hotspot: '0 0' },
    },
  },
}
```

## Vuetify

With [`vuetify-nuxt-module`](https://nuxt.vuetifyjs.com) installed, `vuetify: true` registers every color theme with Vuetify and keeps its active theme in sync — no hand-written `theme.themes` mapping:

```typescript
export default defineNuxtConfig({
  modules: [
    '@venix-sistemas/jade', // must come before the Vuetify module
    'vuetify-nuxt-module',
  ],
  venixTheme: {
    vuetify: true,
  },
})
```

- **Order matters:** the themes are registered through Vuetify's [`vuetify:registerModule`](https://nuxt.vuetifyjs.com/guide/advanced/layers-and-hooks.html) hook, which only sees modules listed before Vuetify.
- **Real colors:** Vuetify computes contrast and `on-*` colors in JavaScript, so it receives the actual hex values, not `var(...)`. `background2` also fills Vuetify's `surface` slot (cards, toolbars, …).
- **Your values win:** anything you set in `vuetify.vuetifyOptions.theme.themes` is merged per color on top of the generated themes.
- **Always in sync:** a small runtime plugin picks Vuetify's initial theme from the same cookies (so the first paint is right, with or without SSR) and applies every later switch with `theme.change()`, inside the same View Transition as the rest of the page.
- **No flash in SPA mode** (`ssr: false`): Vuetify's theme stylesheet only reaches the DOM after the first render there, so the plugin writes a temporary copy into `<head>` before mount and removes it once Vuetify's own arrives.

It's opt-in because it adds a runtime plugin, and it does nothing if `vuetify-nuxt-module` isn't installed. Tested with Vuetify `^4.2.1` and `vuetify-nuxt-module@1.0.0-rc.6`; that module is still pre-1.0, so its hooks may change.

## Development

| Command        | Description          |
| -------------- | -------------------- |
| `pnpm install` | Install dependencies |
| `pnpm dev`     | Start the [playground](./playground) |
| `pnpm test`    | Run the tests        |
| `pnpm lint`    | Run the linter       |
| `pnpm prepack` | Build the package    |

## Brand

The Jade logo, in the variants shipped with the repository (`docs/images`):

| Transparent | Dark background | Emblem (1254 px) |
| :---------: | :-------------: | :--------------: |
| <img src="./docs/images/jade-transparent.png" alt="Jade, transparent background" width="200"> | <img src="./docs/images/jade.png" alt="Jade, dark background" width="200"> | <img src="./docs/images/jade-emblem.png" alt="Jade emblem" width="200"> |

## License

[MIT](./LICENSE)

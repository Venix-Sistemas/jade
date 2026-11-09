export default defineNuxtConfig({
  modules: ['@venix-sistemas/jade', '@unocss/nuxt', '@nuxtjs/i18n', 'vuetify-nuxt-module'],
  devtools: { enabled: true },
  compatibilityDate: 'latest',

  // Installed just to test the theme module's compatibility with a real
  // i18n system running alongside it (localized routes, `$t()`,
  // `useI18n()`, language switching) — see the "Languages" section in app.vue.
  i18n: {
    locales: [
      { code: 'en', iso: 'en-US', name: 'English' },
      { code: 'pt', iso: 'pt-BR', name: 'Português' },
      { code: 'es', iso: 'es-ES', name: 'Español' },
    ],
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    // Off so the root path always renders English regardless of the
    // visitor's browser language — this is a showcase page, not a
    // multi-market app; the language buttons below still switch manually.
    detectBrowserLanguage: false,
  },

  venixTheme: {

    // Translation / locale
    translation: {
      // locale: 'pt-BR',
      // defaultLocale: 'en-US',
      // cookieSync: 'i18n_redirected',
    },

    // Custom typography
    typography: {
      // defaultFonts: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      // fontSize: "16px",

    },

    // Custom cursor
    cursor: {
      enabled: true,

      /*
      defaultCursors: {
        default: {
          path: "/images/ui/cursor/cursor.png",
          hotspot: "0 0"
        },
        pointer: {
          path: "/images/ui/cursor/cursor-hand2.png",
          hotspot: "0 0"
        },
        text: {
          path: "/images/ui/cursor/cursor-text.png",
          hotspot: "12 12"
        }
      }
      */

    },

    // Custom scrollbar
    scrollbar: {
      // OverlayScrollbars (off by default): the custom cursor also shows over the scrollbars
      overlay: false,
      // width: "10px",
      // borderRadius: "8px",
      // borderWidth: "2px",
      // colors: {
      //  thumb: "primary",
      //  thumbHover: "secondary",
      //  track: "background2",
      //  border: "background3"
      // }
    },

    // Custom colors
    color: {
      // defaultColor: 'dark',
      // seasonal: false, // removes Carnival, Easter, Halloween and Christmas
      themes: {
        // `venix` is the Venix Sistemas brand theme: overriding its colors
        // warns at build time (unless `allowVenixOverride: true`). For another
        // brand, add a theme like `oceano` below and set `defaultColor` to it.
        // A project-only theme (not in the bundled theme.json), added just by
        // naming it here: it gets its own CSS variables, shows up in
        // <VenixThemeSwitcher> and follows the light/dark mode like the
        // built-in ones. Leave out `seasonal`/`dateRange` for a theme the
        // user picks by hand; add them to make it take over by date.
        // Experimental (v1.4.0): `tokens: true` also generates the semantic
        // tokens (`--color-text-primary`, `--color-fill-primary`,
        // `--color-bg-subtle`…) from the seeds below. Playground only; it
        // isn't shipped in theme.json.
        venixTokens: {
          tokens: true,
          // The original Venix has plain gray surfaces (`background2`/`3`), so the
          // neutral tokens stay gray instead of leaning toward the primary's hue.
          neutralTint: false,
          translations: { 'pt-BR': 'Venix (tokens)', 'en-US': 'Venix (tokens)', 'es-ES': 'Venix (tokens)' },
          icon: '🧪',
          // `primary`, `secondary` and `background` are the seeds the tokens are
          // built from. The status colors below are the original model's, kept
          // so the playground's chips and Vuetify's `accent` keep working; the
          // old `background2`/`background3` are gone (`bg-subtle` and `bg-muted`
          // take their place).
          // Each mode has its own seeds. The light ones are darker than the
          // original Venix's (`#FF0000`, `#FF8800`): a seed that is bright
          // against a light background can't be text at AA (red is 3.8:1,
          // orange 2.3:1), and `fill-primary` is the seed itself. `#D10100`
          // reaches 5.4:1 on the page, so it can be text as is.
          light: { primary: '#D10100', secondary: '#CC6600', background: '#FAFAFA', accent: '#82B1FF', error: '#FF5252', info: '#2196F3', success: '#4CAF50', warning: '#FCCF3D' },
          dark: { primary: '#FF6B6B', secondary: '#FFB96A', background: '#0C0C0C', accent: '#82B1FF', error: '#FF5252', info: '#2196F3', success: '#4CAF50', warning: '#FCCF3D' },
        },
        oceano: {
          translations: { 'en-US': 'Ocean', 'pt-BR': 'Oceano', 'es-ES': 'Océano' },
          icon: {
            emote: '🌊',
            css: 'mdi:waves',
            svg: 'line-md:water-filled',
          },
          light: {
            primary: '#0B6E8A',
            secondary: '#0A6462',
            accent: '#F4A259',
            error: '#D64545',
            info: '#1E88E5',
            success: '#2E8B57',
            warning: '#E09F3E',
            background: '#F4FAFC',
            background2: '#E6F2F6',
            background3: '#D3E7EE',
          },
          dark: {
            primary: '#4FC3D9',
            secondary: '#7FD8C9',
            accent: '#FFB677',
            error: '#FF6B6B',
            info: '#64B5F6',
            success: '#5FD38D',
            warning: '#FFC857',
            background: '#08141A',
            background2: '#0E1E26',
            background3: '#152A34',
          },
        },
      },
      // Preferred icon variant for themes that define `icon` as an object
      // (`{ emote, css, svg }`) instead of a plain emoji — 'svg' uses
      // @nuxt/icon in SVG mode (needed for animated icons like line-md).
      // Falls back to 'emote' automatically for themes that only have an emoji.
      iconFormat: 'svg',
    },

    // Vuetify: enable with `vuetify: true` in projects using vuetify-nuxt-module
    // (must come before it in `modules`). See the "Vuetify integration" section in the README.
    vuetify: true,

    // Icons: <VenixIcon icon="..." /> accepts an emoji, an Iconify name (e.g.
    // 'line-md:home', animated) or inline SVG. `aliases` creates shortcuts for any of the three formats.
    icon: {
      aliases: {
        home: 'line-md:home',
        favorite: 'line-md:heart-filled',
        star: '⭐',
      },
    },
  },
})

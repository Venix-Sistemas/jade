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

  venixJade: {
    // Only the new `jade` names: nothing that could clash with another package
    // (Vuetify0 below owns `data-theme`)
    legacyNames: false,

    // Vuetify0 (`@vuetify/v0`): its `--v0-*` variables and `useTheme()` follow the theme
    vuetify0: true,

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
        // <JadeThemeSwitcher> and follows the light/dark mode like the
        // built-in ones. Leave out `seasonal`/`dateRange` for a theme the
        // user picks by hand; add them to make it take over by date.
        oceano: {
          tokens: true,
          translations: {
            'en-US': 'Ocean (default, bordered)',
            'pt-BR': 'Oceano (padrão, com borda)',
            'es-ES': 'Océano (estándar, con borde)',
          },
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
        // Variations of `oceano`: colorful surfaces without the bold panels, with
        // the standard outlines and with quiet ones (`borders: 'soft'`), and bold
        oceanoVividBorda: {
          tokens: true,
          surfaces: 'vivid',
          translations: {
            'en-US': 'Ocean Vivid (bordered)',
            'pt-BR': 'Oceano Vivid (com borda)',
            'es-ES': 'Océano Vivid (con borde)',
          },
          icon: { emote: '🐠' },
          light: { primary: '#0B6E8A', secondary: '#0A6462', background: '#F4FAFC' },
          dark: { primary: '#4FC3D9', secondary: '#7FD8C9', background: '#08141A' },
        },
        oceanoVivid: {
          tokens: true,
          surfaces: 'vivid',
          borders: 'soft',
          translations: {
            'en-US': 'Ocean Vivid (soft border)',
            'pt-BR': 'Oceano Vivid (borda suave)',
            'es-ES': 'Océano Vivid (borde suave)',
          },
          icon: { emote: '🐬' },
          light: { primary: '#0B6E8A', secondary: '#0A6462', background: '#F4FAFC' },
          dark: { primary: '#4FC3D9', secondary: '#7FD8C9', background: '#08141A' },
        },
        oceanoBold: {
          tokens: true,
          surfaces: 'bold',
          borders: 'soft',
          translations: {
            'en-US': 'Ocean Bold (soft border)',
            'pt-BR': 'Oceano Bold (borda suave)',
            'es-ES': 'Océano Bold (borde suave)',
          },
          icon: { emote: '🐋' },
          light: { primary: '#0B6E8A', secondary: '#0A6462', background: '#F4FAFC' },
          dark: { primary: '#4FC3D9', secondary: '#7FD8C9', background: '#08141A' },
        },
      },
      // Preferred icon variant for themes that define `icon` as an object
      // (`{ emote, css, svg }`) instead of a plain emoji — 'svg' uses
      // @nuxt/icon in SVG mode (needed for animated icons like line-md).
      // Falls back to 'emote' automatically for themes that only have an emoji.
      iconFormat: 'svg',
    },

    // Experimental (off by default, build time only): the semantic color
    // tokens on every theme, and on Vuetify's colors. The built-in themes and
    // the `oceano` ones above set `tokens` already.
    experimental: false,

    // Vuetify: enable with `vuetify: true` in projects using vuetify-nuxt-module
    // (must come before it in `modules`). See the "Vuetify integration" section in the README.
    vuetify: true,

    // Icons: <JadeIcon icon="..." /> accepts an emoji, an Iconify name (e.g.
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

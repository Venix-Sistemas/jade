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
      cursors: {
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
      themes: {
        // dark: {
        //  primary: '#FF0000',
        //  secondary: '#00FF00',
        // }
        // Custom, project-only seasonal theme (not in the bundled theme.json)
        // — a light/dark pair for the same occasion, same dateRange. When
        // the 'system' preference is active during that window, the dark or
        // light variant is picked automatically to match the OS's own
        // light/dark setting, same as the built-in `dark`/`light` themes do
        // outside of any season.
        pascoa: {
          dark: false,
          seasonal: true,
          dateRange: { start: '03-25', end: '04-05' },
          primary: '#E91E8C',
          secondary: '#9C6ADE',
          accent: '#26A69A',
          error: '#E53935',
          info: '#1E88E5',
          success: '#43A047',
          warning: '#FFB300',
          background: '#FFFDF5',
          background2: '#FFF3E0',
          background3: '#FDE2ED',
          translations: { 'en-US': 'Easter', 'pt-BR': 'Páscoa' },
          icon: {
            emote: '🐰',
            css: 'mdi:egg-easter',
            svg: 'line-md:heart-filled',
          },
        },
        pascoaEscura: {
          dark: true,
          seasonal: true,
          dateRange: { start: '03-25', end: '04-05' },
          primary: '#FF6FB0',
          secondary: '#B085F5',
          accent: '#4DD0C4',
          error: '#FF5252',
          info: '#42A5F5',
          success: '#66BB6A',
          warning: '#FFCA28',
          background: '#1B1225',
          background2: '#251A33',
          background3: '#301F40',
          translations: { 'en-US': 'Easter Night', 'pt-BR': 'Páscoa Escura' },
          icon: {
            emote: '🐰',
            css: 'mdi:egg-easter',
            svg: 'line-md:heart-filled',
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

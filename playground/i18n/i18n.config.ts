// Playground's own content translations — separate from `@venix-sistemas/jade`'s
// built-in theme-name translations, which follow the same locale automatically
// via `translation.cookieSync` (see the "Languages" section in app.vue).
export default defineI18nConfig(() => ({
  legacy: false,
  messages: {
    en: {
      app: {
        subtitle: 'Interactive playground for the theme module',
      },
      themeSelector: {
        heading: 'Theme Selector',
      },
      languages: {
        heading: 'Languages',
        appLocaleLabel: 'Language ({pkg}):',
        themeLocaleLabel: 'Theme locale:',
      },
      cookieConsent: {
        heading: 'Cookie Consent',
        consentLabel: 'Consent:',
        cookiesLabel: 'Cookies:',
        granted: 'Granted',
        notGranted: 'Not granted',
        written: 'Written',
        absent: 'Absent',
        grant: 'Allow cookies',
        revoke: 'Revoke cookies',
        hint: 'Without consent, switching themes still works — it just isn\'t remembered on the next visit.',
      },
      colorPalette: {
        heading: 'Color Palette - {theme}',
      },
      icons: {
        heading: 'Icons (VenixIcon)',
        iconify: 'Iconify (line-md, animated)',
        emoji: 'Emoji',
        svg: 'Inline SVG',
        aliasHome: 'Alias -> \'home\'',
        aliasStar: 'Alias -> \'star\' (emoji)',
      },
      scroll: {
        verticalHeading: 'Vertical Scroll',
        horizontalHeading: 'Horizontal Scroll',
        verticalItem: 'Vertical item {n}',
        horizontalItem: 'Item {n}',
      },
      actions: {
        heading: 'Actions',
        toggle: 'Toggle Light/Dark',
      },
    },
    pt: {
      app: {
        subtitle: 'Playground interativo do módulo de temas',
      },
      themeSelector: {
        heading: 'Seletor de Temas',
      },
      languages: {
        heading: 'Idiomas',
        appLocaleLabel: 'Idioma ({pkg}):',
        themeLocaleLabel: 'Locale do tema:',
      },
      cookieConsent: {
        heading: 'Consentimento de Cookies',
        consentLabel: 'Consentimento:',
        cookiesLabel: 'Cookies:',
        granted: 'Concedido',
        notGranted: 'Não concedido',
        written: 'Gravados',
        absent: 'Ausentes',
        grant: 'Permitir cookies',
        revoke: 'Revogar cookies',
        hint: 'Sem consentimento a troca de tema ainda funciona, só não é lembrada na próxima visita.',
      },
      colorPalette: {
        heading: 'Paleta de Cores - {theme}',
      },
      icons: {
        heading: 'Ícones (VenixIcon)',
        iconify: 'Iconify (line-md, animado)',
        emoji: 'Emoji',
        svg: 'SVG inline',
        aliasHome: 'Alias -> \'home\'',
        aliasStar: 'Alias -> \'star\' (emoji)',
      },
      scroll: {
        verticalHeading: 'Scroll Vertical',
        horizontalHeading: 'Scroll Horizontal',
        verticalItem: 'Item vertical {n}',
        horizontalItem: 'Item {n}',
      },
      actions: {
        heading: 'Ações',
        toggle: 'Alternar Light/Dark',
      },
    },
    es: {
      app: {
        subtitle: 'Playground interactivo del módulo de temas',
      },
      themeSelector: {
        heading: 'Selector de Temas',
      },
      languages: {
        heading: 'Idiomas',
        appLocaleLabel: 'Idioma ({pkg}):',
        themeLocaleLabel: 'Locale del tema:',
      },
      cookieConsent: {
        heading: 'Consentimiento de Cookies',
        consentLabel: 'Consentimiento:',
        cookiesLabel: 'Cookies:',
        granted: 'Concedido',
        notGranted: 'No concedido',
        written: 'Guardadas',
        absent: 'Ausentes',
        grant: 'Permitir cookies',
        revoke: 'Revocar cookies',
        hint: 'Sin consentimiento, el cambio de tema sigue funcionando — solo no se recuerda en la próxima visita.',
      },
      colorPalette: {
        heading: 'Paleta de Colores - {theme}',
      },
      icons: {
        heading: 'Iconos (VenixIcon)',
        iconify: 'Iconify (line-md, animado)',
        emoji: 'Emoji',
        svg: 'SVG en línea',
        aliasHome: 'Alias -> \'home\'',
        aliasStar: 'Alias -> \'star\' (emoji)',
      },
      scroll: {
        verticalHeading: 'Scroll Vertical',
        horizontalHeading: 'Scroll Horizontal',
        verticalItem: 'Elemento vertical {n}',
        horizontalItem: 'Elemento {n}',
      },
      actions: {
        heading: 'Acciones',
        toggle: 'Alternar Claro/Oscuro',
      },
    },
  },
}))

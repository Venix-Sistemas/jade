import type { CursorImage, CursorType, ThemeColors, ThemeConfig } from '../types'
import { isColorTheme } from '../utils/theme-resolve'
import { chromaOf, colorWithHue, hexToOklab, oklabToHex } from '../utils/oklab'
import { generateCursorSVG } from './cursor-svg'
import { CURSOR_ATTRIBUTE, THEME_ATTRIBUTE } from '../constants'

const CURSOR_TYPES: CursorType[] = ['default', 'pointer', 'text', 'grab', 'grabbing']

// The cursor comes from `html` by inheritance, and any element with a
// `cursor` of its own (the browser's stylesheet, a component library) shows
// the system cursor instead. So the rules below give the variables to the
// elements that declare one.
//
// None of this CSS is inside an `@layer`, and it must stay that way: unlayered
// rules win over every layered one, whatever the specificity. That is how the
// rules without `!important` beat Vuetify's (in `@layer vuetify-*`), and still
// lose to a page's own, more specific rule. `!important` reverses the layer
// order, so a layered `!important` would win over ours: we use it only where
// it must win over a page's or a descendant's own cursor.
const VUETIFY_DEFAULT = [
  '.v-text-field__prefix, .v-text-field__suffix',
  '.v-slider .v-slider__container input',
  '.v-time-picker-clock__item',
  '.v-file-upload-dropzone--has-files:not(.v-file-upload-dropzone--clickable), .v-file-upload-dropzone--readonly',
]

// Vuetify 4 (`lib/**/*.css`), with Vuetify's own selectors where specificity
// decides between two of them (e.g. `.v-select .v-field.v-field` over
// `.v-text-field .v-field`).
const VUETIFY_POINTER = [
  // Clickable components Vuetify marks with a class (a plain `.v-icon` or
  // `.v-list-item` is often just decoration or text)
  '.v-btn:not(.v-btn--disabled)',
  '.v-icon--clickable',
  '.v-icon-btn',
  '.v-list-item--link',
  '.v-chip--link',
  '.v-chip__close',
  '.v-tab',
  '.v-card--link',
  '.v-card--hover',
  '.v-breadcrumbs-item--link',
  '.v-pagination__item',
  '.v-slide-group__next, .v-slide-group__prev',
  '.v-avatar-group--hoverable .v-avatar',
  // Menu activators and the like
  '[aria-controls]',
  // Tables
  '.v-data-table__tr--clickable',
  '.v-data-table__th--sortable',
  // Form controls
  '.v-field__clearable',
  '.v-select .v-field .v-text-field__prefix, .v-select .v-field .v-text-field__suffix, .v-select .v-field .v-field__input, .v-select .v-field.v-field',
  '.v-label--clickable',
  '.v-selection-control__input input',
  '.v-switch__track',
  '.v-slider__container',
  '.v-slider-thumb__surface',
  '.v-rating__item label',
  '.v-file-upload-dropzone--clickable:not(.v-file-upload-dropzone--readonly)',
  '.v-file-upload-dropzone input[type=file]',
  // Pickers
  '.v-date-picker-header--clickable .v-date-picker-header__content',
  '.v-color-picker-swatches__color',
  // Calendar
  '.v-calendar .v-event, .v-calendar .v-event-more, .v-calendar .v-event-timed',
  '.v-calendar-weekly__day-label',
  '.v-calendar-daily_head-day-label',
  '.v-calendar-daily .v-calendar-daily__day-interval--hover',
  // Labs
  '.v-heatmap--hover .v-heatmap__cell',
  '.v-heatmap-legend > .v-heatmap-legend__cell',
  '.v-media-progress-bar--interactive',
  '.v-video:not(.v-video--error) .v-video__content',
]

const VUETIFY_TEXT = [
  '.v-text-field .v-field',
  '.v-autocomplete .v-field .v-text-field__prefix, .v-autocomplete .v-field .v-text-field__suffix, .v-autocomplete .v-field .v-field__input, .v-autocomplete .v-field.v-field',
  '.v-combobox .v-field .v-text-field__prefix, .v-combobox .v-field .v-text-field__suffix, .v-combobox .v-field .v-field__input, .v-combobox .v-field.v-field',
]

// Vuetify 4's draggable components (labs), with a fixed `cursor: grab`/`grabbing`
const VUETIFY_GRAB = [
  '.v-infinite-carousel--draggable',
  '.v-map--interactive .v-map__svg',
]

const VUETIFY_GRABBING = [
  '.v-infinite-carousel--dragging',
  '.v-map--dragging .v-map__svg, .v-map--dragging .v-map__region',
]

// Drawn even on `'base'` when `defaultCursors` has no image for them: the
// module's image cursors (Venix) have no hands, and they leave in 2.0.
const HANDS: CursorType[] = ['grab', 'grabbing']

// Vuetify0 is headless, with no cursor of its own: its slider thumbs, with `vuetify0`
const VUETIFY0_GRAB = ['[role="slider"]']
const VUETIFY0_GRABBING = ['[role="slider"]:active']

/** OKLab lightness a drawn cursor is lifted to on a light variant with no dark one to take the tone from. */
const LIGHT_CURSOR_LIGHTNESS = 0.72

/**
 * The color the cursors of a variant are drawn in: its `primary`. A light
 * variant's is usually a deep tone, made to read as text on the page, and a
 * cursor in it looks heavy: it takes the lighter of its own and its dark
 * sibling's, or, without a sibling, its hue lifted to a light tone. The black
 * outline keeps it visible on a light page.
 */
function cursorColor(primary: string, colors: ThemeColors, sibling: string | undefined): string {
  if (colors.dark !== false) return primary
  const lightness = (hex: string): number => hexToOklab(hex)[0]
  if (sibling?.startsWith('#')) return lightness(sibling) > lightness(primary) ? sibling : primary
  if (lightness(primary) >= LIGHT_CURSOR_LIGHTNESS) return primary
  // `colorWithHue` has nothing to keep on a gray primary
  return colorWithHue(LIGHT_CURSOR_LIGHTNESS, primary, chromaOf(primary)) ?? oklabToHex(LIGHT_CURSOR_LIGHTNESS, 0, 0) ?? primary
}

const rule = (selectors: string[], type: CursorType): string =>
  `${selectors.join(',\n')} {\n  cursor: var(--jade-cursor-${type});\n}\n`

const imageValue = (image: CursorImage, type: CursorType): string =>
  `url('${image.path}')${image.hotspot ? ` ${image.hotspot}` : ''}, ${type}`

export function generateCustomCursorCSS(theme: ThemeConfig): string {
  const cursor = theme.customCursor
  if (!cursor || !cursor.enabled) return ''

  const images = cursor.defaultCursors ?? {}

  // The configured image, then the browser's own cursor: the `:root` value,
  // and what shows when a drawn cursor can't be used.
  const fallback = (type: CursorType): string => images[type] ? imageValue(images[type], type) : type

  // The theme each variant belongs to, so `cursor.themeCursors.venix` reaches
  // both `light` and `dark`.
  const owners: Record<string, string> = {}
  for (const [name, group] of Object.entries(theme.colors?.groups ?? {})) {
    for (const id of Object.values(group.variants)) if (id) owners[id] = name
  }

  // The cursor values of each color variant that differ from `:root`: one
  // block per `data-jade-theme` value, like the color variables (see colors.ts).
  const variants: Array<[string, Partial<Record<CursorType, string>>]> = []
  if (theme.colors?.enabled !== false) {
    for (const [id, colors] of Object.entries(theme.colors?.themes ?? {})) {
      if (id === 'system' || !isColorTheme(colors)) continue

      const entry = cursor.themeCursors?.[id] ?? (owners[id] ? cursor.themeCursors?.[owners[id]] : undefined)
      const own = typeof entry === 'object' ? entry : {}
      const mode = typeof entry === 'string' ? entry : cursor.themed === false ? 'base' : 'themed'

      const values: Partial<Record<CursorType, string>> = {}
      for (const type of CURSOR_TYPES) {
        const image = own[type]
        if (image) {
          values[type] = imageValue(image, type)
        }
        else if (mode === 'none') {
          values[type] = type
        }
        else if ((mode === 'themed' || (mode === 'base' && cursor.themed !== false && !images[type] && HANDS.includes(type))) && colors.primary?.startsWith('#')) {
          const darkId = owners[id] ? theme.colors.groups[owners[id]]?.variants.dark : undefined
          const sibling = darkId ? theme.colors.themes[darkId]?.primary : undefined
          const { url, hotspot } = generateCursorSVG(type, cursorColor(colors.primary, colors, sibling))
          values[type] = `url("${url}") ${hotspot}, ${fallback(type)}`
        }
        // 'base', or no `primary` to draw with: the `:root` value
      }
      if (Object.keys(values).length) variants.push([id, values])
    }
  }

  const types = CURSOR_TYPES.filter(type => images[type] || variants.some(([, values]) => values[type]))
  if (!types.length) return ''

  let css = '\n/* ============================================ */\n'
  css += '/* Custom Cursor                                */\n'
  css += '/* ============================================ */\n'

  // The rules below read `--jade-cursor-<type>`, so switching `data-jade-theme` swaps
  // the cursor with no script, the same way it swaps the colors.
  css += '\n/* 0. Cursor values: the default cursors, then each theme\'s own (drawn in its color, its images or the system\'s) */\n'
  // The names up to 1.5, aliases of the new ones on the same element, so they follow every block below
  const aliases = theme.legacyNames !== false ? types.map(type => `  --cursor-${type}: var(--jade-cursor-${type});`) : []
  css += `:root {\n${[...types.map(type => `  --jade-cursor-${type}: ${fallback(type)};`), ...aliases].join('\n')}\n}\n`
  for (const [id, values] of variants) {
    const vars = types.filter(type => values[type]).map(type => `  --jade-cursor-${type}: ${values[type]};`)
    css += `:root[${THEME_ATTRIBUTE}='${id}'] {\n${vars.join('\n')}\n}\n`
  }
  // The visitor turned the custom cursor off (see `cursor.set()`): the
  // system's cursors, as with `'none'`, whatever the theme. Same specificity
  // as the theme blocks above, so it wins by coming after them.
  css += `:root[${CURSOR_ATTRIBUTE}='off'] {\n${types.map(type => `  --jade-cursor-${type}: ${type};`).join('\n')}\n}\n`

  if (types.includes('default')) {
    css += '\n/* 1. Default cursor on everything */\n'
    css += `html {
  cursor: var(--jade-cursor-default);
}\n`
    css += '\n/* 1b. Elements the browser stylesheet sets to `cursor: default`, which would show the system arrow instead of inheriting */\n'
    css += `label,
select,
input[type="checkbox"], input[type="radio"],
input[type="range"], input[type="color"], input[type="file"] {
  cursor: var(--jade-cursor-default);
}\n`
    css += '\n/* 1c. Vuetify elements with a fixed `cursor: default` */\n'
    css += rule(VUETIFY_DEFAULT, 'default')
  }

  if (types.includes('pointer')) {
    // Only what is actually clickable: a link needs an `href`. `!important`
    // so the pointer also shows over what they contain, even an element with
    // a cursor of its own. The overlay scrollbars (`scrollbar.overlay`) too:
    // drag and click-to-scroll.
    css += '\n/* 2. Pointer cursor for clickable elements */\n'
    css += `a[href], a[href] *,
button, button *,
summary,
[role="button"], [role="link"], [role="tab"],
input[type="button"], input[type="submit"], input[type="reset"],
.os-scrollbar, .os-scrollbar * {
  cursor: var(--jade-cursor-pointer) !important;
}\n`
    // No `!important`: being unlayered already beats Vuetify, and a page
    // can still change a single case, e.g. the rows of a table with
    // `@click:row` that do nothing.
    css += '\n/* 2b. Vuetify elements with a fixed `cursor: pointer` */\n'
    css += rule(VUETIFY_POINTER, 'pointer')
  }

  if (types.includes('text')) {
    css += '\n/* 3. Text cursor (i-beam) for editable fields only */\n'
    css += `input:not([type]),
input[type="text"],
input[type="email"],
input[type="password"],
input[type="number"],
input[type="search"],
input[type="tel"],
input[type="url"],
input[type="date"],
input[type="datetime-local"],
input[type="month"],
input[type="week"],
input[type="time"],
textarea,
[contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"] {
  cursor: var(--jade-cursor-text) !important;
}\n`
    css += '\n/* 3b. Vuetify elements with a fixed `cursor: text` (the field around the input) */\n'
    css += rule(VUETIFY_TEXT, 'text')
  }

  // What can be moved: an element marked `draggable="true"` (not the links and
  // images the browser drags on its own) and Vuetify's draggable components.
  // No `!important`: links and buttons inside keep the pointer, and a page can
  // change a single case.
  if (types.includes('grab')) {
    css += '\n/* 3c. Open hand over what can be dragged */\n'
    css += rule(['[draggable="true"]', ...VUETIFY_GRAB, ...(theme.vuetify0 ? VUETIFY0_GRAB : [])], 'grab')
  }

  if (types.includes('grabbing')) {
    css += '\n/* 3d. Closed hand while it is held */\n'
    css += rule(['[draggable="true"]:active', ...VUETIFY_GRABBING, ...(theme.vuetify0 ? VUETIFY0_GRABBING : [])], 'grabbing')
  }

  // The utility classes of Vuetify (`.cursor-pointer`) and UnoCSS/Tailwind:
  // `html ` puts them above the single-class component rules and an unlayered
  // UnoCSS rule of the same name, so the class wins, as a utility should.
  // No `!important` (`!cursor-default` in UnoCSS when it must be).
  css += '\n/* 4. Cursor utility classes */\n'
  css += types.map(type => `html .cursor-${type} {\n  cursor: var(--jade-cursor-${type});\n}\n`).join('')

  if (types.includes('default')) {
    // `html ` raises these to the specificity of the rules above (e.g.
    // `input[type="text"]`), so, coming later, they win over them: a disabled
    // text field or a disabled button's icon shows the arrow. `:disabled` also
    // catches the fields of a disabled `<fieldset>`, which have no attribute.
    css += '\n/* 5. Disabled elements, and what they contain */\n'
    css += `html :disabled, html :disabled *,
html [disabled], html [disabled] *,
html [aria-disabled="true"], html [aria-disabled="true"] *,
html .disabled,
html .v-btn--disabled, html .v-btn--disabled * {
  cursor: var(--jade-cursor-default) !important;
}\n`
  }

  return css
}

export interface ScrollbarConfig {
  enabled: boolean
  /**
   * Draws the scrollbars with OverlayScrollbars, as page elements: the
   * browser's own scrollbar ignores CSS `cursor`, so hovering it shows the
   * system cursor instead of the custom one. Covers the page, Vuetify's scroll
   * containers and any element with `data-venix-scroll`; other elements keep
   * the CSS-styled native scrollbar. Off, every scrollbar is the native one,
   * styled with CSS. Default: `false`.
   */
  overlay?: boolean
  width: string
  borderRadius: string
  /** Native scrollbar only: the overlay one has no border around the thumb. */
  borderWidth: string
  colors: {
    thumb: string
    thumbHover: string
    track: string
    /** Native scrollbar only, like `borderWidth`. */
    border: string
  }
}

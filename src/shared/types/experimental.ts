export interface ExperimentalConfig {
  /**
   * Turns the experimental features on. Default: `false`.
   *
   * Today that is the semantic color tokens (`color.themes.<name>.tokens`),
   * generated for every theme that doesn't set `tokens` itself, the built-in
   * ones included, so a project can try them without rewriting its themes:
   * `--jade-text-primary`, `--jade-fill-primary`, `--jade-bg-subtle`… next
   * to the usual `--color-*` variables, which stay unchanged, plus the
   * UnoCSS token classes and `useVenixTheme().tokens`. A theme with
   * `tokens: false` still opts out.
   *
   * A build-time choice: there is no switch for the visitor. It is the same
   * as writing `tokens: true` on every theme, so Vuetify gets the token
   * colors too (`on-primary`, `surface`…). Names, steps and behaviour may
   * still change before the features are declared stable.
   */
  enabled: boolean
}

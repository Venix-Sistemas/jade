// src/shared/types/theme-names.ts

/**
 * The names of the project's own themes, filled in by the module's generated
 * `types/venix-theme.d.ts` (see `setup/register-types.ts`): `themes` are the
 * theme names a visitor can pick (`'venix'`, `'natal'`…) and `variants` the
 * variant ids (`'dark'`, `'light'`, `'natal-dark'`…). Empty until that file
 * exists, which is when the names below fall back to plain strings.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface VenixThemeRegistry {}
}

type Registered<K extends string> = VenixThemeRegistry extends Record<K, infer Names extends string> ? Names : never

/**
 * A string that still offers its known values to autocomplete: a name built
 * at runtime (from a route, a setting) compiles, and a typo of a known one
 * is caught by the dev-time warning instead.
 */
type Suggest<Known extends string> = Known | (string & Record<never, never>)

/** A theme to pick: one of the project's themes or `'system'` (by date). */
export type ThemeName = Suggest<Registered<'themes'> | 'system'>

/** What `toggle()` takes: a theme, `'system'`, or a variant id (`'dark'`, `'natal-light'`). */
export type ThemeOrVariantName = Suggest<Registered<'themes'> | Registered<'variants'> | 'system'>

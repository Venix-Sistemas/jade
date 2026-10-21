import type { TypographyConfig } from './typography'
import type { ScrollbarConfig } from './scrollbar'
import type { CursorConfig } from './cursor'
import type { ColorsConfig } from './colors'

export interface ThemeConfig {
  name: string
  typography: TypographyConfig
  customScrollbar: ScrollbarConfig
  customCursor: CursorConfig
  colors: ColorsConfig
}

/**
 * The theme as rebuilt at runtime (`buildResolvedTheme`): just the colors.
 * The other parts of `ThemeConfig` are only known at build time, where the
 * module options are applied to them; at runtime they'd be `theme.json`'s
 * own values, ignoring `nuxt.config`.
 */
export type ResolvedTheme = Pick<ThemeConfig, 'colors'>

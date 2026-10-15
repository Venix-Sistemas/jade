import type { ThemeIconFormats } from '../types/colors'

/** Iconify icon name: `collection:name` (e.g. `line-md:home`). */
export const ICONIFY_NAME = /^([\w-]+):([\w-]+)$/

export type IconKind = 'emoji' | 'icon' | 'svg'

export interface ResolvedIcon {
  kind: IconKind
  value: string
}

/**
 * Resolves an icon value to the correct rendering type:
 * - inline SVG (starts with `<svg`)
 * - Iconify icon name (`collection:name` format, e.g. `line-md:home`)
 * - emoji/text (any other value)
 *
 * Aliases are resolved first, then the resulting value goes through the same
 * detection — an alias can point to any of the three formats.
 */
export function resolveIcon(input: string, aliases: Record<string, string> = {}): ResolvedIcon {
  const value = (aliases[input] ?? input).trim()

  if (/^<svg[\s>]/i.test(value)) {
    return { kind: 'svg', value }
  }

  if (ICONIFY_NAME.test(value)) {
    return { kind: 'icon', value }
  }

  return { kind: 'emoji', value }
}

export type ThemeIconFormat = 'emote' | 'css' | 'svg'

export interface ResolvedThemeIcon {
  format: ThemeIconFormat
  value: string
}

/**
 * Resolves a color theme's icon (a legacy string, always emote, or a
 * `ThemeIconFormats` with variants) to the preferred format. When the theme
 * doesn't define it, tries the other Iconify variant before `emote`
 * (`svg` → `css` → `emote`, or `css` → `svg` → `emote`), so a theme with only
 * one Iconify variant still shows an icon instead of dropping to the emoji.
 */
export function resolveThemeIcon(
  icon: string | ThemeIconFormats | undefined,
  preferred: ThemeIconFormat,
): ResolvedThemeIcon | null {
  if (!icon) return null

  if (typeof icon === 'string') {
    return { format: 'emote', value: icon }
  }

  if (preferred !== 'emote') {
    const order: Array<'css' | 'svg'> = preferred === 'svg' ? ['svg', 'css'] : ['css', 'svg']
    for (const format of order) {
      const value = icon[format]
      if (value) return { format, value }
    }
  }

  return { format: 'emote', value: icon.emote }
}

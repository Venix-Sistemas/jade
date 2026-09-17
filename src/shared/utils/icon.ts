import type { ThemeIconFormats } from '../types/colors'

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

  if (/^[\w-]+:[\w-]+$/.test(value)) {
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
 * `ThemeIconFormats` with variants) to the preferred format, falling back to
 * `emote` when the theme doesn't define the chosen format.
 */
export function resolveThemeIcon(
  icon: string | ThemeIconFormats | undefined,
  preferred: ThemeIconFormat,
): ResolvedThemeIcon | null {
  if (!icon) return null

  if (typeof icon === 'string') {
    return { format: 'emote', value: icon }
  }

  if (preferred !== 'emote' && icon[preferred]) {
    return { format: preferred, value: icon[preferred] }
  }

  return { format: 'emote', value: icon.emote }
}

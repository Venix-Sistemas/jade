import type { ThemeColors } from '../types/colors'

const ICONIFY_NAME = /^([\w-]+):([\w-]+)$/

function addRef(refs: Map<string, Set<string>>, value: string | undefined) {
  const match = value ? ICONIFY_NAME.exec(value.trim()) : null
  if (!match) return

  const collection = match[1] as string
  const icon = match[2] as string
  const set = refs.get(collection) ?? new Set<string>()
  set.add(icon)
  refs.set(collection, set)
}

/**
 * Extracts the Iconify `collection:icon` references used in color themes
 * (`icon.css` / `icon.svg`) and in the configured icon aliases, grouped by
 * collection. Lets each collection be bundled with only the icons actually
 * used (tree-shaking) instead of the whole collection — essential for large
 * collections like `mdi` (thousands of icons) used for only a handful of
 * icons in the default theme.
 */
export function extractIconRefs(
  themes: Record<string, ThemeColors>,
  aliases: Record<string, string>,
): Map<string, Set<string>> {
  const refs = new Map<string, Set<string>>()

  for (const theme of Object.values(themes)) {
    const icon = theme.icon
    if (icon && typeof icon === 'object') {
      addRef(refs, icon.css)
      addRef(refs, icon.svg)
    }
  }

  for (const value of Object.values(aliases)) {
    addRef(refs, value)
  }

  return refs
}

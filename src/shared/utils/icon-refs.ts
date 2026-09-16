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
 * Extrai as referências `coleção:ícone` (Iconify) usadas nos temas de cor
 * (`icon.css` / `icon.svg`) e nos aliases de ícone configurados, agrupadas por
 * coleção. Permite empacotar cada coleção apenas com os ícones realmente
 * usados (tree-shaking), em vez da coleção inteira — essencial para coleções
 * grandes como `mdi` (milhares de ícones) usadas só para alguns ícones do
 * tema padrão.
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

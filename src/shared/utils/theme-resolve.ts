// src/shared/utils/theme-resolve.ts
import type { ThemeColors } from '../types'

/**
 * Um tema só é "de cor" de verdade se tiver ao menos uma cor real — chaves
 * como o placeholder `'system'` (usado só para exibir "Automático" na UI, ver
 * `theme.json`) têm `translations`/`icon` mas nenhuma cor e não contam.
 */
export function isColorTheme(themeConfig: ThemeColors | undefined): boolean {
  if (!themeConfig) return false
  return !!themeConfig.primary || !!themeConfig.background
}

function parseDatePart(value: string): [number, number] | null {
  const parts = value.split('-').map(Number)
  if (parts.length !== 2) return null

  const [month, day] = parts
  if (month === undefined || day === undefined) return null

  return [month, day]
}

function isDateInSeasonalRange(themeConfig: ThemeColors, now: Date): boolean {
  if (themeConfig.seasonal !== true || !themeConfig.dateRange) return false

  const start = parseDatePart(themeConfig.dateRange.start)
  const end = parseDatePart(themeConfig.dateRange.end)
  if (!start || !end) return false

  const current = (now.getMonth() + 1) * 100 + now.getDate()
  const startNum = start[0] * 100 + start[1]
  const endNum = end[0] * 100 + end[1]

  return startNum <= endNum
    ? current >= startNum && current <= endNum
    : current >= startNum || current <= endNum
}

/**
 * Tema sazonal ativo hoje. Quando `prefersDark` é informado, só retorna temas
 * que casam com esse modo (claro/escuro); quando omitido, retorna o primeiro
 * tema sazonal ativo independente do modo.
 */
export function getActiveSeasonalTheme(
  themes: Record<string, ThemeColors>,
  prefersDark?: boolean,
  now: Date = new Date(),
): string | null {
  for (const [themeName, themeConfig] of Object.entries(themes)) {
    if (themeName === 'system') continue
    if (!isColorTheme(themeConfig)) continue
    if (!isDateInSeasonalRange(themeConfig, now)) continue
    if (prefersDark !== undefined && themeConfig.dark !== prefersDark) continue
    return themeName
  }

  return null
}

/**
 * Resolve uma preferência de tema (`'system'`, o nome de um tema, ou vazio)
 * no tema de cor concreto que deve ser aplicado. Implementação única desta
 * regra — usada por `useVenixTheme`/`useThemeSeasonal` e pelo plugin de SSR
 * (`theme-init.server.ts`). O script pré-hidratação
 * (`runtime/scripts/theme-init.ts`) é a única exceção documentada: precisa
 * rodar como IIFE autocontida (sem imports), então duplica esta lógica de
 * propósito — mantenha as duas em sincronia ao alterar uma delas.
 */
export function resolveThemePreference(
  preference: string | undefined,
  themes: Record<string, ThemeColors>,
  defaultTheme: string,
  prefersDark: boolean,
): string {
  let resolved: string

  if (preference === 'system') {
    resolved = getActiveSeasonalTheme(themes, prefersDark) || (prefersDark ? 'dark' : 'light')
  }
  else if (preference && isColorTheme(themes[preference])) {
    resolved = preference
  }
  else {
    resolved = defaultTheme
  }

  if (!isColorTheme(themes[resolved])) {
    resolved = isColorTheme(themes[defaultTheme]) ? defaultTheme : 'dark'
  }

  return resolved
}

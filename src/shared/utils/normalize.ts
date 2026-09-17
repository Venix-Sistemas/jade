// src/shared/utils/normalize.ts
import { LOCALE_MAP, DEFAULT_LOCALE } from '../constants'

/**
 * Normalizes a locale to the standard format.
 * E.g.: "pt" -> "pt-BR", "PT-br" -> "pt-BR"
 */
export function normalizeLocale(locale: string): string {
  if (!locale) return DEFAULT_LOCALE

  const lowerLocale = locale.toLowerCase()

  if (lowerLocale.includes('-')) {
    const parts = lowerLocale.split('-')
    const base = parts[0]
    const region = parts[1]

    if (base && region) {
      return `${base}-${region.toUpperCase()}`
    }

    return base || lowerLocale
  }

  return LOCALE_MAP[lowerLocale] || lowerLocale
}

/**
 * Extracts the first locale from an Accept-Language header.
 * E.g.: "pt-BR,pt;q=0.9,en;q=0.8" -> "pt-BR"
 */
export function extractFirstLocale(acceptLanguage: string): string | null {
  if (!acceptLanguage) return null

  const parts = acceptLanguage.split(',')
  if (parts.length === 0) return null

  const firstPart = parts[0]
  if (!firstPart) return null

  const localeParts = firstPart.split(';')
  if (localeParts.length === 0) return null

  const firstLocale = localeParts[0]?.trim()
  return firstLocale || null
}

/**
 * Normalizes a hex color.
 * E.g.: "fff" -> "#FFF", "ffffff" -> "#FFFFFF", "#fff" -> "#FFF"
 */
export function normalizeColor(color: string): string {
  if (!color) return color

  color = color.trim()

  if (!color.startsWith('#')) {
    color = `#${color}`
  }

  return color
}

/**
 * Normalizes a theme name.
 * E.g.: "dark" -> "Dark", "DARK" -> "Dark"
 */
export function normalizeThemeName(name: string): string {
  if (!name) return name
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
}

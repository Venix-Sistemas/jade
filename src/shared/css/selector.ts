import { LAB_ATTRIBUTE, THEME_ATTRIBUTE } from '../constants'

/**
 * `color.lab`: `'preview'` is the CSS of a visitor's choices, which has to win
 * over the built one; `'guard'` is the built CSS, whose bold scope leaves a
 * customized variant alone.
 */
export type LabSelector = 'guard' | 'preview'

/** `:root[data-jade-theme='…']` of a variant; `bold` for its bold scope's rule. */
export function themeSelector(mode: string, lab?: LabSelector, bold = false): string {
  const root = `:root[${THEME_ATTRIBUTE}='${mode}']`
  if (lab === 'preview') return `${root}[${LAB_ATTRIBUTE}~='${mode}']`
  return lab === 'guard' && bold ? `${root}:not([${LAB_ATTRIBUTE}~='${mode}'])` : root
}

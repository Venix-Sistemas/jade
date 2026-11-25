// src/setup/register-types.ts
import { addTypeTemplate } from '@nuxt/kit'
import type { ThemeConfig } from '../shared/types'
import { renderThemeTypes } from '../shared/utils/theme-types'

/** The project's theme names and variant ids as types, for `theme.set()` and friends. */
export function registerThemeTypes(theme: ThemeConfig) {
  addTypeTemplate({
    filename: 'types/venix-theme.d.ts',
    getContents: () => renderThemeTypes(theme.colors),
  })
}

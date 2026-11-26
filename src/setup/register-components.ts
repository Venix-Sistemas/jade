// src/setup/register-components.ts
import { addComponent } from '@nuxt/kit'
import type { Resolver } from '@nuxt/kit'

export function registerThemeComponents(resolver: Resolver, legacyNames = true) {
  // `VenixThemeSwitcher` is the name up to 1.5, removed in 2.0
  for (const name of legacyNames ? ['JadeThemeSwitcher', 'VenixThemeSwitcher'] : ['JadeThemeSwitcher']) {
    addComponent({
      name,
      filePath: resolver.resolve('./runtime/components/VenixThemeSwitcher'),
    })
  }
}

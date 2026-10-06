import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'
import { loadTheme } from '../src/shared/utils/load'
import { processTheme } from '../src/shared/css'

describe('jade module', () => {
  // Teste E2E
  describe('ssr', async () => {
    await setup({
      rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
    })

    it('renders the index page', async () => {
      const html = await $fetch('/')
      expect(html).toContain('<div>basic</div>')
    })

    it('aplica o data-theme no SSR', async () => {
      const html = await $fetch('/')
      expect(html).toMatch(/data-theme="[^"]*"/)
    })

    it('injeta o script anti-FOUC inline no <head>, antes do bundle do Vue', async () => {
      const html = await $fetch('/')
      const headEnd = html.indexOf('</head>')
      const scriptIndex = html.indexOf('function initTheme')

      expect(scriptIndex).toBeGreaterThan(-1)
      expect(scriptIndex).toBeLessThan(headEnd)
    })

    it('the anti-FOUC script knows about a custom theme registered via color.themes, not just the bundled theme.json', async () => {
      // Regression: the script used to be built from the static theme.json
      // alone, so a custom/project-only theme's `venix-theme-resolved`
      // cookie would fail its isColorTheme check and get silently reset to
      // the default theme on every full reload.
      const html = await $fetch('/')

      expect(html).toContain('"customFixtureTheme"')
      expect(html).toContain('#123456')
    })
  })

  // Teste de integração
  describe('theme', () => {
    it('deve carregar tema', () => {
      const theme = loadTheme()
      expect(theme).toBeDefined()
      expect(theme.colors.themes['dark']).toBeDefined()
    })

    it('deve gerar CSS', () => {
      const theme = loadTheme()
      const css = processTheme(theme)
      expect(css).toContain('--color-primary')
      expect(css).toContain(':root[data-theme=\'dark\']')
    })
  })
})

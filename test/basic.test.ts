import { readdirSync, readFileSync, statSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, $fetch, useTestContext } from '@nuxt/test-utils/e2e'
import { loadTheme } from '../src/shared/utils/load'
import { processTheme } from '../src/shared/css'

/** Every `.js` and `.css` file under `dir`, recursively: what the browser can download. */
function clientFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = resolve(dir, name)
    if (statSync(path).isDirectory()) return clientFiles(path)
    return /\.(?:js|mjs|css)$/.test(name) ? [path] : []
  })
}

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

    it('aplica o tema no SSR, com os nomes novos e os antigos', async () => {
      const html = await $fetch<string>('/')
      const tag = html.match(/<html[^>]*>/)![0]
      const id = tag.match(/data-jade-theme="([^"]+)"/)![1]!
      expect(tag).toContain(`data-theme="${id}"`)
      expect(tag).toMatch(new RegExp(`class="jade-theme-${id} ${id}"`))
    })

    it('serve as fontes sob /_jade/ e, com `legacyNames`, também na raiz', async () => {
      for (const base of ['/_jade', '']) {
        const font = await $fetch<Blob>(`${base}/fonts/Iceberg/Iceberg-Regular.woff2`, { responseType: 'blob' })
        expect(font.size).toBeGreaterThan(1000)
      }
    })

    it('injeta o script anti-FOUC inline no <head>, antes do bundle do Vue', async () => {
      const html = await $fetch('/')
      const headEnd = html.indexOf('</head>')
      const scriptIndex = html.indexOf('function initTheme')

      expect(scriptIndex).toBeGreaterThan(-1)
      expect(scriptIndex).toBeLessThan(headEnd)
    })

    it('the anti-FOUC script knows about a custom theme registered via color.themes, not just the bundled theme.json', async () => {
      // The script has to be built from the resolved theme (theme.json plus
      // `color.themes`), not theme.json alone: otherwise it wouldn't know a
      // project's own themes and would reset a saved one to the default on
      // every full reload.
      const html = await $fetch('/')

      expect(html).toContain('"customFixtureTheme"')
      expect(html).toContain('#123456')
    })

    it('manda ao cliente só os hex dos tokens, não o motor que os calcula', async () => {
      // O motor de cores (Leonardo, em `utils/scale.ts`) roda só no build do
      // módulo; o navegador recebe os hex prontos em `runtimeConfig`. Nada
      // mais garante isso: um import errado em `src/runtime/` ou em
      // `utils/index.ts` o levaria ao bundle sem nenhum aviso.
      const html = await $fetch<string>('/')
      expect(html, 'os tokens chegam ao cliente como hex').toMatch(/"fill-primary":"#123456"/i)

      const publicDir = resolve(useTestContext().nuxt!.options.nitro.output!.dir!, 'public')
      const files = clientFiles(publicDir)
      expect(files.length, 'achou os arquivos do cliente').toBeGreaterThan(0)

      // Uma frase de `scale.ts` que sobrevive à minificação, e o pacote do motor.
      const sentinel = '[jade] The color engine returned'
      expect(readFileSync(fileURLToPath(new URL('../src/shared/utils/scale.ts', import.meta.url)), 'utf8'), 'a sentinela ainda existe em scale.ts').toContain(sentinel)

      const leaked = files.filter((file) => {
        const source = readFileSync(file, 'utf8')
        return source.includes(sentinel) || /leonardo-contrast-colors|contrastColors|chroma-js/i.test(source)
      })
      expect(leaked.map(file => relative(publicDir, file))).toEqual([])
    })

    it('mantém o script inline do <head> abaixo do limite', async () => {
      // O script bloqueia a renderização e não vai para o cache: cada byte
      // custa em toda resposta. O limite pega um tamanho que volta a crescer
      // sem querer (os dados do tema inteiros em vez dos que ele lê).
      const html = await $fetch<string>('/')
      const end = html.indexOf('function initTheme')
      const start = html.lastIndexOf('<script', end)
      const script = html.slice(start, html.indexOf('</script>', end) + '</script>'.length)

      // 10,6 kB quando o limite foi posto (13,7 kB antes de o script receber só
      // os dados que lê). Suba o limite de propósito, não por acaso.
      expect(script.length).toBeLessThan(12_000)
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
      expect(css).toContain('--jade-primary')
      expect(css).toContain(':root[data-jade-theme=\'dark\']')
    })
  })
})

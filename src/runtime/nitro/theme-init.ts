// runtime/nitro/theme-init.ts
import { defineNitroPlugin } from 'nitropack/runtime'
import initTheme from '../scripts/theme-init'
import themeData from '../../shared/theme.json' with { type: 'json' }
import type { ThemeConfig } from '../../shared/types'

interface RenderHtmlContext {
  head: string[]
}

// Serializa `initTheme` (precisa ser 100% autocontida — ver comentário no
// próprio arquivo) numa IIFE e injeta no `<head>` da resposta HTML, antes do
// bundle do Vue — é isso que evita o flash de tema/locale errado antes da
// hidratação (o projeto anterior fazia isso manualmente via
// `app.head.script` apontando para um arquivo estático público). Calculado
// uma vez no boot do servidor, não a cada request: `themeData` é estático.
const inlineScript = `<script>(${initTheme.toString()})(${JSON.stringify(themeData as ThemeConfig)})</script>`

export default defineNitroPlugin((nitroApp) => {
  // `render:html` é adicionado pela integração do Nitro com o Nuxt, não faz
  // parte do `NitroRuntimeHooks` do nitropack "puro" — cast necessário pelo
  // mesmo motivo dos hooks opcionais do Vuetify em `runtime/plugins/vuetify-theme.ts`.
  const hookRenderHtml = nitroApp.hooks.hook as unknown as (
    name: 'render:html',
    fn: (html: RenderHtmlContext) => void,
  ) => void

  hookRenderHtml('render:html', (html) => {
    html.head.unshift(inlineScript)
  })
})

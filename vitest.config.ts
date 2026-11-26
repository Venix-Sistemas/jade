import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Sem isso, o glob padrão do Vitest também pega arquivos de teste dentro
    // de worktrees git (ex.: `.claude/worktrees/<nome>/test/...`, criadas por
    // sessões/agentes do Claude Code) e outras pastas de build, quebrando a
    // suíte por causa de `tsconfig.json`/config ausentes nesses diretórios.
    exclude: ['**/node_modules/**', '**/dist/**', '**/.nuxt/**', '**/.claude/**'],
    // Os testes que geram o CSS de todos os temas embutidos calculam as
    // escalas de 7 papéis por variante (~0,3 s cada, mais ~0,7 s do painel
    // bold das claras), com os arquivos em paralelo; 5 s não bastam.
    testTimeout: 60_000,
  },
})

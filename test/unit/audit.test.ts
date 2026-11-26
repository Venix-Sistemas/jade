import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { auditCode } from '../../src/shared/audit/code'
import { CLAUDE_BLOCK, withClaudeBlock } from '../../src/shared/audit/claude'
import { TOKEN_NAMES } from '../../src/shared/token-names'

const css = (content: string) => auditCode([{ path: 'a.css', content }])
const rules = (content: string) => css(content).map(finding => finding.rule)

describe('auditCode', () => {
  it.each([
    ['--jade-primary', 'text-primary'],
    ['--jade-fill-secondary', 'text-secondary'],
    ['--color-accent', 'text-accent'],
  ])('acusa %s como cor de texto, e indica %s', (name, token) => {
    const [finding] = css(`.a {\n  color: var(${name});\n}`)
    expect(finding).toMatchObject({ rule: 'brand-text', severity: 'error', line: 2 })
    expect(finding!.message).toContain(token)
  })

  it('segue as variáveis do próprio projeto', () => {
    const findings = auditCode([
      { path: 'a.css', content: ':root { --titulo: var(--meu); --meu: var(--jade-fill-primary); }' },
      { path: 'b.vue', content: '<style scoped>\n.t { color: var(--titulo) }\n</style>' },
    ])
    expect(findings).toEqual([expect.objectContaining({ file: 'b.vue', line: 2, rule: 'brand-text' })])
  })

  it('só o primeiro `var()` conta: a reserva é para temas sem tokens', () => {
    expect(rules('.a { color: var(--jade-text, var(--jade-primary)); }')).toEqual([])
  })

  it('aceita as combinações certas', () => {
    expect(rules(`
      .a { background: var(--jade-bg-subtle); color: var(--jade-text); border: 1px solid var(--jade-border); }
      .b { background: var(--jade-fill-primary); color: var(--jade-on-primary); }
      .c { background: var(--jade-bg-warning); color: var(--jade-text-warning); }
      .d { background: var(--jade-on-primary); color: var(--jade-fill-primary); }
      .e { border-color: var(--jade-fill-primary); background: transparent; color: inherit; }
      .f { color: var(--jade-bg, #333); cursor: var(--jade-cursor-pointer); }
      .g { opacity: 0; } .h:disabled { opacity: 0.5; }
      @keyframes x { from { opacity: 0.4 } }
    `)).toEqual([])
  })

  it('acusa texto sobre preenchimento sem o `on-` dele, e `on-` fora do preenchimento', () => {
    expect(rules('.a { background: var(--jade-fill-error); color: var(--jade-text); }')).toEqual(['on-mismatch'])
    expect(rules('.a { background: var(--jade-primary); color: #fff; }')).toContain('on-mismatch')
    expect(rules('.a { background: var(--jade-bg); color: var(--jade-on-primary); }')).toEqual(['on-mismatch'])
  })

  it('acusa cor fixa em texto e fundo (erro) e em borda (aviso)', () => {
    expect(css('.a { color: #fff; background: rgb(0 0 0); border: 1px solid black; }').map(f => f.severity)).toEqual(['error', 'error', 'warning'])
    expect(rules('.a { background: url("#x") no-repeat; box-shadow: 0 0 2px #000; --x: #fff; white-space: nowrap; }')).toEqual([])
  })

  it('acusa variável que não existe e sugere a certa', () => {
    const [finding] = css('.a { color: var(--jade-primary-text); }')
    expect(finding).toMatchObject({ rule: 'unknown-var' })
    expect(finding!.message).toContain('--jade-text-primary')
  })

  it('avisa sobre texto desbotado e cor misturada', () => {
    expect(rules('.a { opacity: 0.6; background: color-mix(in srgb, var(--jade-bg) 50%, transparent); }')).toEqual(['faded', 'mixed-color'])
  })

  it('lê `style="…"`, classes com valor arbitrário e SCSS aninhado, com a linha certa', () => {
    const findings = auditCode([
      { path: 'a.vue', content: '<template>\n  <p style="color: white">x</p>\n  <p class="text-[var(--jade-fill-primary)]">y</p>\n</template>' },
      { path: 'b.scss', content: '// comentário\n.a {\n  .b {\n    color: red;\n  }\n}' },
    ])
    expect(findings.map(f => [f.file, f.line, f.rule])).toEqual([['a.vue', 2, 'fixed-color'], ['a.vue', 3, 'brand-text'], ['b.scss', 4, 'fixed-color']])
  })

  it('fica quieto com `jade-audit-ignore` na linha ou na de cima', () => {
    expect(rules('.a {\n  /* jade-audit-ignore: logotipo */\n  color: #fff;\n  background: #000; /* jade-audit-ignore */\n}')).toEqual([])
  })
})

describe('guia para IA', () => {
  const guide = readFileSync(new URL('../../AI.md', import.meta.url), 'utf-8')

  it('só cita variáveis que existem', () => {
    const named = [...guide.matchAll(/--jade-([a-z]+(?:-[a-z]+)*)(?![\w<-])/g)].map(match => match[1]!)
    expect(named.length).toBeGreaterThan(20)
    expect(named.filter(name => !TOKEN_NAMES.includes(name) && !['primary', 'secondary'].includes(name))).toEqual([])
  })

  it('as receitas dele passam no próprio auditor', () => {
    const recipes = [...guide.matchAll(/```css\n([\s\S]*?)```/g)].map(match => match[1]!).join('\n')
    expect(css(recipes)).toEqual([])
  })

  it('entra no CLAUDE.md uma vez, sem mexer no resto', () => {
    const once = withClaudeBlock('# Meu projeto\n\nRegras.\n')
    expect(once).toBe(`# Meu projeto\n\nRegras.\n\n${CLAUDE_BLOCK}\n`)
    expect(withClaudeBlock(once)).toBe(once)
    expect(withClaudeBlock('')).toBe(`${CLAUDE_BLOCK}\n`)
  })
})

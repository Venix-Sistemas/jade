import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'

// A única exceção à regra do seletor neutro: `buttonColors` muda o botão que
// abre o menu, e só ele. A regra em si está em `switcher-neutral.test.ts`.

const source = readFileSync(new URL('../../src/runtime/components/VenixThemeSwitcher.vue', import.meta.url), 'utf-8')
const style = source.slice(source.indexOf('<style'), source.lastIndexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g, '')

const NAMES = ['bg', 'icon', 'border', 'hover']
const rules = [...style.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({ selector: selector!.trim(), body: body! }))

describe('VenixThemeSwitcher: cores do botão', () => {
  it.each([['bg', 'bg'], ['icon', 'text'], ['border', 'border'], ['hover', 'hover']])('sem a opção, `%s` do botão é o cinza padrão', (button, neutral) => {
    expect(style).toContain(`--venix-switcher-button-${button}: var(--venix-switcher-${neutral});`)
  })

  it('só o botão que abre o menu lê as cores escolhidas', () => {
    const readers = rules.filter(rule => rule.body.includes('var(--venix-switcher-button-'))
    expect(readers.length).toBeGreaterThan(0)
    for (const { selector } of readers) expect(selector).toMatch(/^\.venix-theme-switcher__trigger(?::hover|:focus-visible)?$/)
  })

  it('a opção é aplicada só no botão que abre o menu', () => {
    expect(source.match(/:style="buttonStyle"/g)).toHaveLength(1)
    expect(source).toMatch(/aria-haspopup="menu"\s+:style="buttonStyle"/)
    for (const name of NAMES) expect(source).toContain(`'--venix-switcher-button-${name}': colors.`)
  })
})

import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { loadNuxt } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import jade from '../../src/module'
import type { ModuleOptions } from '../../src/module'
import { iconDependencies, inlineModuleOptions } from '../../src/setup/icon-dependency'

const entryFile = fileURLToPath(new URL('../../src/module.ts', import.meta.url))
const defaults: ModuleOptions = { color: true, icon: true }

function fakeNuxt(options: Record<string, unknown> = {}, layers: unknown[][] = []) {
  return {
    options: {
      rootDir: process.cwd(),
      modulesDir: [fileURLToPath(new URL('../../node_modules', import.meta.url))],
      alias: {},
      modules: [],
      _modules: [],
      _layers: layers.map(modules => ({ config: { modules } })),
      ...options,
    },
  } as unknown as Nuxt
}

type IconOverrides = { aliases: Record<string, string>, serverBundle: { collections: (string | { prefix: string })[] } }

function overridesOf(nuxt: Nuxt, inline?: ModuleOptions) {
  const dependencies = iconDependencies(nuxt, inline, defaults) as Record<string, { overrides: IconOverrides }>
  return dependencies['@nuxt/icon']?.overrides
}

const prefixes = (overrides: IconOverrides) => overrides.serverBundle.collections.map(entry => typeof entry === 'string' ? entry : entry.prefix)

describe('iconDependencies', () => {
  it('declara o @nuxt/icon com a line-md e os ícones dos temas', () => {
    const overrides = overridesOf(fakeNuxt())!
    expect(prefixes(overrides)).toContain('line-md')
    expect(prefixes(overrides)).toContain('mdi')
  })

  it.each([
    ['ao lado do módulo', {}, { icon: false }],
    ['em venixJade', { venixJade: { icon: false } }, undefined],
    ['em venixTheme', { venixTheme: { icon: false } }, undefined],
    ['com o módulo desligado', { venixJade: false }, undefined],
  ])('não declara nada com os ícones desligados %s', (_, config, inline) => {
    expect(iconDependencies(fakeNuxt(config), inline, defaults)).toEqual({})
  })

  it('a opção ao lado do módulo vence a de venixJade', () => {
    const nuxt = fakeNuxt({ venixJade: { icon: false } })
    expect(overridesOf(nuxt, { icon: true })).toBeDefined()
  })

  it('leva os aliases e junta as coleções das duas configurações', () => {
    const nuxt = fakeNuxt({ venixJade: { icon: { aliases: { home: 'line-md:home' } } } })
    const overrides = overridesOf(nuxt, { icon: { collections: ['mdi'] } })!
    expect(overrides.aliases).toEqual({ home: 'line-md:home' })
    expect(prefixes(overrides)).toContain('mdi')
  })
})

describe('inlineModuleOptions', () => {
  const options = { icon: false }

  it.each([
    ['o próprio módulo', jade],
    ['o nome do pacote', '@venix-sistemas/jade'],
    ['um caminho até ele', fileURLToPath(new URL('../../src/module', import.meta.url))],
  ])('acha as opções escritas com %s', (_, entry) => {
    const nuxt = fakeNuxt({ modules: ['@nuxtjs/i18n', [entry, options]] })
    expect(inlineModuleOptions(nuxt, jade, entryFile)).toEqual(options)
  })

  it('ignora as opções de outros módulos', () => {
    const nuxt = fakeNuxt({ modules: [['@nuxtjs/i18n', options], '@venix-sistemas/jade'] })
    expect(inlineModuleOptions(nuxt, jade, entryFile)).toBeUndefined()
  })

  it('segue a ordem do Nuxt entre camadas: a camada base vem antes', () => {
    const project = [[jade, { icon: true }]]
    const base = [[jade, options]]
    const nuxt = fakeNuxt({ modules: [...project, ...base] }, [project, base])
    expect(inlineModuleOptions(nuxt, jade, entryFile)).toEqual(options)
  })
})

// A real Nuxt: the dependency is installed, or not, and configured
describe('@nuxt/icon como dependência do módulo', () => {
  async function load(modules: unknown[]) {
    const nuxt = await loadNuxt({
      cwd: fileURLToPath(new URL('../fixtures/dependency', import.meta.url)),
      ready: true,
      overrides: { modules: modules as never, compatibilityDate: 'latest' },
    })
    const installed = nuxt.options._installedModules.map(module => module.meta.name)
    const icon = (nuxt.options as unknown as { icon?: IconOverrides }).icon
    await nuxt.close()
    return { installed, icon }
  }

  it('é instalado e configurado por padrão', async () => {
    const { installed, icon } = await load([[jade, { icon: { aliases: { home: 'line-md:home' } } }]])
    expect(installed).toContain('@nuxt/icon')
    expect(icon?.aliases).toEqual({ home: 'line-md:home' })
    expect(prefixes(icon!)).toContain('line-md')
  }, 60_000)

  it('não é instalado com `icon: false` ao lado do módulo', async () => {
    const { installed } = await load([[jade, { icon: false }]])
    expect(installed).toContain('@venix-sistemas/jade')
    expect(installed).not.toContain('@nuxt/icon')
  }, 60_000)
})

// src/setup/register-icon.ts
import { createRequire } from 'node:module'
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { installModule, addImports, addComponent } from '@nuxt/kit'
import type { Resolver } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import type { ModuleOptions as NuxtIconOptions } from '@nuxt/icon'
import { getIcons } from '@iconify/utils'
import type { IconOptions, ColorsConfig } from '../shared/types'
import { extractIconRefs } from '../shared/utils'

// Extraído do tipo público de @nuxt/icon (não há subpath exportado só para
// `ServerBundleOptions`) para tipar as coleções sem depender de @iconify/types
// diretamente — evita uma dependência extra só para tipos.
type IconServerBundle = Exclude<NuxtIconOptions['serverBundle'], 'auto' | 'remote' | 'local' | false | undefined>
type IconCollectionEntry = NonNullable<IconServerBundle['collections']>[number]
type IconifyJSON = Parameters<typeof getIcons>[0]

// `realpathSync` é essencial aqui: quando este pacote é instalado via pnpm
// (sem hoist), o Node carrega este arquivo através de um symlink em
// node_modules/@venix-sistemas/nuxt-theme/, e `createRequire` resolvido a
// partir do caminho symlinked NÃO enxerga node_modules/ desta própria
// dependência (fica "fora" da árvore real do pacote) — só funciona a partir
// do caminho físico real.
const nodeRequire = createRequire(realpathSync(fileURLToPath(import.meta.url)))

/**
 * Carrega o JSON bruto de uma coleção `@iconify-json/*`, tentando primeiro a
 * partir da localização deste próprio pacote (coleções que são dependência
 * do nuxt-theme, ex.: `line-md`, `mdi`) e depois a partir da raiz do projeto
 * consumidor (coleções que o próprio consumidor instalou para seus temas
 * customizados). Ver comentário de `nodeRequire` sobre por que a resolução
 * relativa a este pacote precisa do caminho físico real.
 */
function loadCollectionJson(name: string, projectRequire: NodeRequire | null): IconifyJSON | null {
  try {
    return nodeRequire(`@iconify-json/${name}/icons.json`) as IconifyJSON
  }
  catch {
    try {
      return projectRequire?.(`@iconify-json/${name}/icons.json`) as IconifyJSON ?? null
    }
    catch {
      return null
    }
  }
}

/** Coleção inteira, sem tree-shaking — para coleções explicitamente listadas em `icon.collections`. */
function loadFullCollection(name: string, projectRequire: NodeRequire | null): IconCollectionEntry {
  return loadCollectionJson(name, projectRequire) ?? name // fallback: deixa o @nuxt/icon tentar resolver/buscar remoto
}

/**
 * Coleção reduzida a apenas os ícones referenciados (`getIcons`) — usada para
 * coleções detectadas nos temas/aliases mas não explicitamente listadas em
 * `icon.collections`, evitando embutir coleções grandes (ex.: `mdi`, com
 * milhares de ícones) inteiras no bundle do servidor só por causa de um
 * punhado de ícones usados.
 */
function loadCollectionSubset(name: string, iconNames: Set<string>, projectRequire: NodeRequire | null): IconCollectionEntry | null {
  const json = loadCollectionJson(name, projectRequire)
  if (!json) return null
  return getIcons(json, [...iconNames]) as IconCollectionEntry | null
}

export async function registerThemeIcon(nuxt: Nuxt, resolver: Resolver, options: IconOptions, colors: ColorsConfig) {
  if (!options.enabled) return

  let projectRequire: NodeRequire | null = null
  try {
    projectRequire = createRequire(join(nuxt.options.rootDir, 'package.json'))
  }
  catch {
    projectRequire = null
  }

  const explicit = new Set(options.collections)
  const collections: IconCollectionEntry[] = options.collections.map(name => loadFullCollection(name, projectRequire))

  const refs = extractIconRefs(colors.themes, options.aliases)
  for (const [name, iconNames] of refs) {
    if (explicit.has(name)) continue // já embutida inteira acima
    collections.push(loadCollectionSubset(name, iconNames, projectRequire) ?? name)
  }

  await installModule('@nuxt/icon', {
    aliases: options.aliases,
    serverBundle: {
      collections,
    },
  })

  addImports({
    name: 'useVenixIcon',
    from: resolver.resolve('./runtime/composables/useVenixIcon'),
  })

  addComponent({
    name: 'VenixIcon',
    filePath: resolver.resolve('./runtime/components/VenixIcon'),
  })
}

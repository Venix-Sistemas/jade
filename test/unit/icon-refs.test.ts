import { describe, it, expect } from 'vitest'
import { extractIconRefs } from '../../src/shared/utils/icon-refs'

describe('extractIconRefs', () => {
  it('extrai referências de collection:name dos campos css e svg dos temas', () => {
    const refs = extractIconRefs(
      {
        dark: { icon: { emote: '🌙', css: 'mdi:moon-and-stars', svg: 'line-md:moon-filled-loop' } },
        light: { icon: { emote: '☀️', css: 'mdi:white-balance-sunny', svg: 'line-md:sunny-filled-loop' } },
      },
      {},
    )

    expect(refs.get('mdi')).toEqual(new Set(['moon-and-stars', 'white-balance-sunny']))
    expect(refs.get('line-md')).toEqual(new Set(['moon-filled-loop', 'sunny-filled-loop']))
  })

  it('ignora temas com ícone em formato de string (emote legado)', () => {
    const refs = extractIconRefs({ dark: { icon: '🌙' } }, {})
    expect(refs.size).toBe(0)
  })

  it('ignora temas sem ícone', () => {
    const refs = extractIconRefs({ dark: {} }, {})
    expect(refs.size).toBe(0)
  })

  it('extrai referências dos aliases de ícone', () => {
    const refs = extractIconRefs({}, { home: 'line-md:home', brand: '🎨' })
    expect(refs.get('line-md')).toEqual(new Set(['home']))
    expect(refs.has('brand')).toBe(false)
  })

  it('agrupa múltiplos ícones da mesma coleção em um único Set', () => {
    const refs = extractIconRefs(
      { a: { icon: { emote: '🎭', css: 'mdi:emoticon-excited-outline' } } },
      { alt: 'mdi:halloween' },
    )

    expect(refs.get('mdi')).toEqual(new Set(['emoticon-excited-outline', 'halloween']))
  })
})

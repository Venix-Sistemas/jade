import { describe, it, expect } from 'vitest'
import { resolveIcon, resolveThemeIcon } from '../../src/shared/utils/icon'

describe('resolveIcon', () => {
  it('detecta SVG inline', () => {
    expect(resolveIcon('<svg viewBox="0 0 24 24"><circle /></svg>')).toEqual({
      kind: 'svg',
      value: '<svg viewBox="0 0 24 24"><circle /></svg>',
    })
  })

  it('detecta nome de ícone Iconify no formato coleção:nome', () => {
    expect(resolveIcon('line-md:home')).toEqual({ kind: 'icon', value: 'line-md:home' })
  })

  it('detecta nomes de ícone com hífen na coleção e no nome', () => {
    expect(resolveIcon('line-md:loading-loop')).toEqual({ kind: 'icon', value: 'line-md:loading-loop' })
  })

  it('trata qualquer outro valor como emoji/texto', () => {
    expect(resolveIcon('🎨')).toEqual({ kind: 'emoji', value: '🎨' })
  })

  it('resolve um alias para emoji', () => {
    expect(resolveIcon('star', { star: '⭐' })).toEqual({ kind: 'emoji', value: '⭐' })
  })

  it('resolve um alias para ícone Iconify', () => {
    expect(resolveIcon('home', { home: 'line-md:home' })).toEqual({ kind: 'icon', value: 'line-md:home' })
  })

  it('ignora aliases quando não há correspondência', () => {
    expect(resolveIcon('mdi:home', { star: '⭐' })).toEqual({ kind: 'icon', value: 'mdi:home' })
  })
})

describe('resolveThemeIcon', () => {
  const formats = { emote: '☀️', css: 'mdi:sun-compass', svg: 'line-md:sunny-filled-loop' }

  it('retorna null quando o tema não define ícone', () => {
    expect(resolveThemeIcon(undefined, 'emote')).toBeNull()
  })

  it('string legada sempre resolve como emote, independente da preferência', () => {
    expect(resolveThemeIcon('🌙', 'svg')).toEqual({ format: 'emote', value: '🌙' })
  })

  it('resolve o formato preferido quando definido no objeto', () => {
    expect(resolveThemeIcon(formats, 'svg')).toEqual({ format: 'svg', value: 'line-md:sunny-filled-loop' })
    expect(resolveThemeIcon(formats, 'css')).toEqual({ format: 'css', value: 'mdi:sun-compass' })
  })

  it('cai para emote quando o formato preferido não existe no tema', () => {
    expect(resolveThemeIcon({ emote: '🎨' }, 'svg')).toEqual({ format: 'emote', value: '🎨' })
  })

  it('preferência "svg" sem svg definido tenta "css" antes do emote', () => {
    expect(resolveThemeIcon({ emote: '🎨', css: 'mdi:palette' }, 'svg')).toEqual({ format: 'css', value: 'mdi:palette' })
  })

  it('preferência "css" sem css definido tenta "svg" antes do emote', () => {
    expect(resolveThemeIcon({ emote: '🎨', svg: 'line-md:light-dark' }, 'css')).toEqual({ format: 'svg', value: 'line-md:light-dark' })
  })

  it('preferência "emote" sempre usa o emote, mesmo com css/svg definidos', () => {
    expect(resolveThemeIcon(formats, 'emote')).toEqual({ format: 'emote', value: '☀️' })
  })
})

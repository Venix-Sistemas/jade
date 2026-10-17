import { describe, it, expect } from 'vitest'
import { normalizeLocale, extractFirstLocale } from '../../src/shared/utils/normalize'

describe('normalizeLocale', () => {
  it('deve normalizar "pt" para "pt-BR"', () => {
    expect(normalizeLocale('pt')).toBe('pt-BR')
  })

  it('deve normalizar "PT-br" para "pt-BR"', () => {
    expect(normalizeLocale('PT-br')).toBe('pt-BR')
  })

  it('deve manter "en-US" como está', () => {
    expect(normalizeLocale('en-US')).toBe('en-US')
  })
})

describe('extractFirstLocale', () => {
  it('deve extrair primeiro locale do header', () => {
    expect(extractFirstLocale('pt-BR,pt;q=0.9,en;q=0.8')).toBe('pt-BR')
  })

  it('deve retornar null para string vazia', () => {
    expect(extractFirstLocale('')).toBeNull()
  })
})

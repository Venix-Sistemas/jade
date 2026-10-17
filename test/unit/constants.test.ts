import { describe, it, expect } from 'vitest'
import {
  THEME_PREFERENCE_COOKIE,
  THEME_RESOLVED_COOKIE,
  DEFAULT_LOCALE,
  DEFAULT_THEME,
  THEME_COOKIE_MAX_AGE,
  THEME_COOKIE_OPTIONS,
} from '../../src/shared/constants'
import initTheme from '../../src/runtime/scripts/theme-init'

describe('constants', () => {
  it('deve gravar os cookies de tema com validade, não como cookies de sessão', () => {
    expect(THEME_COOKIE_OPTIONS.maxAge).toBe(THEME_COOKIE_MAX_AGE)
    expect(THEME_COOKIE_MAX_AGE).toBe(60 * 60 * 24 * 365)
  })

  it('o script anti-FOUC deve usar a mesma validade dos cookies (ele não pode importar a constante)', () => {
    expect(initTheme.toString()).toContain(`max-age=${THEME_COOKIE_MAX_AGE}`)
  })

  it('deve ter cookies definidos', () => {
    expect(THEME_PREFERENCE_COOKIE).toBe('venix-theme-preference')
    expect(THEME_RESOLVED_COOKIE).toBe('venix-theme-resolved')
  })

  it('deve ter valores padrão', () => {
    expect(DEFAULT_LOCALE).toBe('en-US')
    expect(DEFAULT_THEME).toBe('dark')
  })
})

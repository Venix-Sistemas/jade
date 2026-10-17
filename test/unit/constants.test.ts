import { describe, it, expect } from 'vitest'
import {
  THEME_PREFERENCE_COOKIE,
  THEME_RESOLVED_COOKIE,
  DEFAULT_LOCALE,
  DEFAULT_THEME,
  SYSTEM_THEME,
  THEME_COOKIE_MAX_AGE,
  THEME_COOKIE_OPTIONS,
} from '../../src/shared/constants'
import { createThemeResolver } from '../../src/shared/utils/theme-resolver'

describe('constants', () => {
  it('deve gravar os cookies de tema com validade, não como cookies de sessão', () => {
    expect(THEME_COOKIE_OPTIONS.maxAge).toBe(THEME_COOKIE_MAX_AGE)
    expect(THEME_COOKIE_MAX_AGE).toBe(60 * 60 * 24 * 365)
  })

  it('o resolver autocontido deve repetir os mesmos valores de SYSTEM_THEME e DEFAULT_THEME', () => {
    const resolver = createThemeResolver()
    expect(resolver.SYSTEM_THEME).toBe(SYSTEM_THEME)
    expect(resolver.DEFAULT_THEME).toBe(DEFAULT_THEME)
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

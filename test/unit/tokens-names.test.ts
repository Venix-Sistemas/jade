import { describe, it, expect } from 'vitest'
import { generateTokens } from '../../src/shared/css/tokens'
import { TOKEN_NAMES, roleTokenName } from '../../src/shared/token-names'
import type { ThemeColors } from '../../src/shared/types'

const LIGHT: ThemeColors = { dark: false, tokens: true, primary: '#FF0000', secondary: '#FF8800', background: '#FAFAFA' }

describe('nomes dos tokens', () => {
  it('deve listar exatamente os tokens que um tema completo gera, na mesma ordem', () => {
    expect(TOKEN_NAMES).toEqual(generateTokens(LIGHT).map(([name]) => name))
  })

  it('deve pôr o papel depois da propriedade', () => {
    expect(roleTokenName('fill-hover', 'primary')).toBe('fill-primary-hover')
    expect(roleTokenName('text-strong', 'secondary')).toBe('text-secondary-strong')
    expect(roleTokenName('bg', 'primary')).toBe('bg-primary')
  })
})

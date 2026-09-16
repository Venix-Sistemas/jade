import { describe, it, expect } from 'vitest'
import { resolveFeatureOption } from '../../src/shared/utils/options'

interface FeatureConfig {
  enabled: boolean
  value: string
}

const base: FeatureConfig = { enabled: false, value: 'base' }

describe('resolveFeatureOption', () => {
  it('deve desabilitar quando a opção é `false`', () => {
    expect(resolveFeatureOption(false, base)).toEqual({ enabled: false, value: 'base' })
  })

  it('deve forçar `enabled: true` quando a opção é `true`, mesmo com a base desabilitada', () => {
    expect(resolveFeatureOption(true, base)).toEqual({ enabled: true, value: 'base' })
  })

  it('deve manter a base intacta quando a opção é `undefined`', () => {
    expect(resolveFeatureOption(undefined, base)).toEqual(base)
  })

  it('deve mesclar um objeto e habilitar por padrão', () => {
    expect(resolveFeatureOption({ value: 'custom' }, base)).toEqual({ enabled: true, value: 'custom' })
  })

  it('deve respeitar `enabled: false` explícito dentro do objeto', () => {
    expect(resolveFeatureOption({ enabled: false, value: 'custom' }, base)).toEqual({ enabled: false, value: 'custom' })
  })
})

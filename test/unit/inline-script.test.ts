import { describe, it, expect } from 'vitest'
import { toInlineScriptJson } from '../../src/shared/utils/inline-script'

describe('toInlineScriptJson', () => {
  it('não deixa um </script> nos dados fechar o <script> inline', () => {
    const json = toInlineScriptJson({ name: '</script><script>alert(1)</script>' })
    expect(json).not.toContain('</script>')
    expect(json).not.toContain('<')
  })

  it('continua sendo o mesmo valor para o parser de JS', () => {
    const value = { a: '<b>', n: 1, list: ['x', '</y>'] }
    expect(JSON.parse(toInlineScriptJson(value))).toEqual(value)
  })
})

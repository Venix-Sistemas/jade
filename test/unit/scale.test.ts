import { describe, it, expect, vi } from 'vitest'
import { generateNeutralScale, generateScale, generateScales } from '../../src/shared/utils/scale'
import type { ContrastLevel } from '../../src/shared/utils/scale'
import { contrastRatio, relativeLuminance } from '../../src/shared/utils/contrast'
import { hexToOklab } from '../../src/shared/utils/oklab'

const HEX = /^#[0-9A-F]{6}$/

const VARIANTS = [
  { mode: 'light', background: '#FAFAFA', seeds: { primary: '#FF0000', secondary: '#FF8800' } },
  { mode: 'dark', background: '#0C0C0C', seeds: { primary: '#FF6B6B', secondary: '#FFB96A' } },
] as const

const LEVELS: Record<ContrastLevel, { text: number }> = {
  AA: { text: 4.5 },
  AAA: { text: 7 },
}

/** Contrast of each step against the background. */
function ratios(steps: string[], background: string): number[] {
  return steps.map(step => contrastRatio(step, background))
}

function isAscending(values: number[]): boolean {
  return values.every((value, i) => i === 0 || value > values[i - 1]!)
}

describe.each(Object.keys(LEVELS) as ContrastLevel[])('escalas no nível %s', (level) => {
  describe.each(VARIANTS)('tema $mode', ({ mode, background, seeds }) => {
    const scales = generateScales(background, seeds, mode, level)
    const target = LEVELS[level].text

    it('deve gerar 12 passos hexadecimais por escala', () => {
      expect(scales.neutral).toHaveLength(12)
      expect(scales.neutral.every(step => HEX.test(step))).toBe(true)
      for (const role of Object.values(scales.roles)) {
        expect(role.steps).toHaveLength(12)
        expect(role.steps.every(step => HEX.test(step))).toBe(true)
      }
    })

    it('deve usar exatamente o fundo do tema como passo 1 do neutro', () => {
      expect(scales.neutral[0]).toBe(background)
    })

    it('deve usar exatamente o seed como passo 9 de cada papel', () => {
      expect(scales.roles.primary!.steps[8]).toBe(seeds.primary)
      expect(scales.roles.secondary!.steps[8]).toBe(seeds.secondary)
    })

    it('deve afastar cada passo do neutro um pouco mais do fundo que o anterior', () => {
      expect(isAscending(ratios(scales.neutral, background))).toBe(true)
    })

    it('deve afastar do fundo os passos 1 a 9 de cada papel, em ordem', () => {
      for (const role of Object.values(scales.roles)) {
        expect(isAscending(ratios(role.steps.slice(0, 9), background))).toBe(true)
      }
    })

    it('deve deixar o texto colorido e o forte além do seed, nessa ordem', () => {
      for (const role of Object.values(scales.roles)) {
        const [seed, , text, strong] = ratios(role.steps, background).slice(8)
        expect(text).toBeGreaterThan(seed!)
        expect(strong).toBeGreaterThan(text!)
      }
    })

    it('deve fazer o texto neutro (passos 11 e 12) alcançar o nível sobre as superfícies', () => {
      const { neutral } = scales
      for (const surface of neutral.slice(0, 3)) {
        expect(contrastRatio(neutral[10]!, surface)).toBeGreaterThanOrEqual(target)
      }
      for (const surface of neutral.slice(0, 5)) {
        expect(contrastRatio(neutral[11]!, surface)).toBeGreaterThanOrEqual(target)
      }
    })

    it('deve fazer o texto de cada papel alcançar o nível sobre as superfícies onde fica', () => {
      const { neutral } = scales
      for (const role of Object.values(scales.roles)) {
        const surfaces = [neutral[0]!, neutral[1]!, neutral[2]!, role.steps[2]!]
        for (const surface of surfaces) {
          expect(contrastRatio(role.steps[10]!, surface)).toBeGreaterThanOrEqual(target)
        }
        for (const surface of [role.steps[3]!, role.steps[4]!]) {
          expect(contrastRatio(role.steps[11]!, surface)).toBeGreaterThanOrEqual(target)
        }
      }
    })

    it('deve escolher branco ou preto, o que contrasta mais com o seed, e manter o hover legível', () => {
      for (const [role, seed] of Object.entries(seeds)) {
        const { on, steps } = scales.roles[role]!
        const other = on === '#000000' ? '#FFFFFF' : '#000000'
        expect(contrastRatio(on, seed)).toBeGreaterThanOrEqual(contrastRatio(other, seed))
        expect(contrastRatio(on, steps[9]!)).toBeGreaterThanOrEqual(contrastRatio(on, steps[8]!))
      }
    })

    it('deve deixar os seeds do Venix com texto preto', () => {
      expect(scales.roles.primary!.on).toBe('#000000')
      expect(scales.roles.secondary!.on).toBe('#000000')
    })

    it('deve clarear o hover quando o texto sobre o seed é preto', () => {
      for (const [role, seed] of Object.entries(seeds)) {
        expect(relativeLuminance(scales.roles[role]!.steps[9]!)).toBeGreaterThan(relativeLuminance(seed))
      }
    })
  })
})

describe('generateScale', () => {
  const neutral = generateNeutralScale('#FAFAFA', '#1D4ED8', 'light')

  it('deve escurecer o hover quando o texto sobre o seed é branco', () => {
    const role = generateScale('#1D4ED8', neutral, 'light')
    expect(role.on).toBe('#FFFFFF')
    expect(relativeLuminance(role.steps[9]!)).toBeLessThan(relativeLuminance('#1D4ED8'))
    expect(contrastRatio(role.on, role.steps[9]!)).toBeGreaterThan(contrastRatio(role.on, '#1D4ED8'))
  })

  it('deve aceitar o seed em #RGB e em minúsculas', () => {
    expect(generateScale('#f00', neutral, 'light').steps[8]).toBe('#FF0000')
    expect(generateScale('#ff8800', neutral, 'light').steps[8]).toBe('#FF8800')
  })

  it('deve gerar o mesmo resultado para a mesma entrada', () => {
    expect(generateScale('#FF0000', neutral, 'light')).toEqual(generateScale('#FF0000', neutral, 'light'))
  })

  it('deve encaixar os passos 1 a 8 abaixo de um seed próximo do fundo', () => {
    const orange = generateScale('#FF8800', neutral, 'light')
    const seedRatio = contrastRatio('#FF8800', '#FAFAFA')
    const stepRatios = ratios(orange.steps, '#FAFAFA')
    expect(isAscending(stepRatios.slice(0, 9))).toBe(true)
    expect(stepRatios[7]).toBeLessThan(seedRatio)
  })
})

describe('generateNeutralScale', () => {
  it('deve puxar o neutro para o matiz do seed sem mexer no passo 1', () => {
    const neutral = generateNeutralScale('#FAFAFA', '#FF0000', 'light')
    expect(neutral[0]).toBe('#FAFAFA')
    const mid = neutral[5]!
    const red = Number.parseInt(mid.slice(1, 3), 16)
    const blue = Number.parseInt(mid.slice(5, 7), 16)
    expect(red).toBeGreaterThan(blue)
  })

  it('deve manter o fundo exato mesmo em branco e preto puros', () => {
    expect(generateNeutralScale('#FFFFFF', '#FF0000', 'light')[0]).toBe('#FFFFFF')
    expect(generateNeutralScale('#000000', '#FF0000', 'dark')[0]).toBe('#000000')
  })

  it('deve exigir 7:1 do texto suave no nível AAA', () => {
    const neutral = generateNeutralScale('#FAFAFA', '#FF0000', 'light', 'AAA')
    expect(contrastRatio(neutral[10]!, neutral[2]!)).toBeGreaterThanOrEqual(7)
  })
})

describe('contorno do neutro', () => {
  it.each(VARIANTS)('deve dar 3:1 ao passo 9 sobre o fundo e a área sutil ($mode)', ({ mode, background, seeds }) => {
    const { neutral } = generateScales(background, seeds, mode)
    expect(contrastRatio(neutral[8]!, neutral[0]!)).toBeGreaterThanOrEqual(3)
    expect(contrastRatio(neutral[8]!, neutral[1]!)).toBeGreaterThanOrEqual(3)
  })
})

describe('avisos do motor de cores', () => {
  it('não deve repassar o aviso `colorspace is deprecated` do Leonardo, que ele mesmo dispara', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      generateScales('#FAFAFA', { primary: '#FF0000', secondary: '#FF8800' }, 'light')
      expect(warn.mock.calls.filter(([message]) => String(message).includes('colorspace'))).toEqual([])
    }
    finally {
      warn.mockRestore()
    }
  })

  it('deve devolver o console.warn original depois de gerar', () => {
    const original = console.warn
    generateScales('#FAFAFA', { primary: '#FF0000' }, 'light')
    expect(console.warn).toBe(original)
  })
})

describe('neutro sem tom (tint: false)', () => {
  const isGray = (hex: string) => hex.slice(1, 3) === hex.slice(3, 5) && hex.slice(3, 5) === hex.slice(5, 7)

  it.each(VARIANTS)('deve gerar só cinzas, com o fundo exato no passo 1 ($mode)', ({ mode, background, seeds }) => {
    const { neutral } = generateScales(background, seeds, mode, 'AA', { tint: false })
    expect(neutral[0]).toBe(background)
    expect(neutral.every(isGray)).toBe(true)
  })

  it.each(VARIANTS)('deve deixar o neutro com tom por padrão ($mode)', ({ mode, background, seeds }) => {
    const { neutral } = generateScales(background, seeds, mode)
    expect(neutral.slice(1).some(step => !isGray(step))).toBe(true)
  })

  it.each(VARIANTS)('deve manter os mesmos alvos de contraste do neutro com tom ($mode)', ({ mode, background, seeds }) => {
    const { neutral } = generateScales(background, seeds, mode, 'AA', { tint: false })
    expect(isAscending(ratios(neutral, background))).toBe(true)
    for (const surface of neutral.slice(0, 3)) {
      expect(contrastRatio(neutral[10]!, surface)).toBeGreaterThanOrEqual(4.5)
    }
    for (const surface of neutral.slice(0, 2)) {
      expect(contrastRatio(neutral[8]!, surface)).toBeGreaterThanOrEqual(3)
    }
  })

  it('deve aceitar tintSeed nulo em generateNeutralScale', () => {
    expect(generateNeutralScale('#FAFAFA', null, 'light').every(isGray)).toBe(true)
  })
})

describe('fundo com cor própria (o Halloween, #FFF8F0 e #16100C)', () => {
  const THEMED = [
    { mode: 'light', background: '#FFF8F0', seeds: { primary: '#C2410C', secondary: '#6A3FB5' }, original: ['#FBEBDD', '#F3DCC8'] },
    { mode: 'dark', background: '#16100C', seeds: { primary: '#FF8A3D', secondary: '#B98AF0' }, original: ['#1F1711', '#2B1F17'] },
  ] as const

  const chroma = (hex: string) => {
    const [, a, b] = hexToOklab(hex)
    return Math.hypot(a, b)
  }
  const hue = (hex: string) => {
    const [, a, b] = hexToOklab(hex)
    return Math.atan2(b, a) * 180 / Math.PI
  }

  it.each(THEMED)('deve manter o matiz do próprio fundo, não o do primary ($mode)', ({ mode, background, seeds }) => {
    const { neutral } = generateScales(background, seeds, mode)
    for (const step of neutral.slice(1, 8)) {
      expect(Math.abs(hue(step) - hue(background))).toBeLessThan(8)
    }
  })

  it.each(THEMED)('deve dar às superfícies mais cor que o fundo, crescendo com a distância ($mode)', ({ mode, background, seeds }) => {
    const { neutral } = generateScales(background, seeds, mode)
    const surfaces = neutral.slice(1, 6).map(chroma)
    expect(surfaces[0]).toBeGreaterThanOrEqual(chroma(background))
    expect(isAscending(surfaces)).toBe(true)
    // perto das cores que o tema tinha à mão: o degrau 3 (contraste 1.12) faz par com o background2 (1.07 a 1.11)
    expect(chroma(neutral[2]!)).toBeGreaterThan(chroma(THEMED.find(t => t.mode === mode)!.original[0]) * 0.8)
  })

  it.each(THEMED)('deve manter os alvos de contraste dos degraus 2 a 8 ($mode)', ({ mode, background, seeds }) => {
    const { neutral } = generateScales(background, seeds, mode)
    const targets = [1.05, 1.12, 1.2, 1.3, 1.5, 1.8, 2.3]
    neutral.slice(1, 8).forEach((step, i) => {
      expect(Math.abs(contrastRatio(step, background) - targets[i]!)).toBeLessThan(0.03)
    })
    expect(isAscending(ratios(neutral, background))).toBe(true)
  })

  it.each(THEMED)('deve seguir cumprindo o contraste do texto e do contorno ($mode)', ({ mode, background, seeds }) => {
    const { neutral } = generateScales(background, seeds, mode)
    expect(neutral[0]).toBe(background)
    for (const surface of neutral.slice(0, 3)) {
      expect(contrastRatio(neutral[10]!, surface)).toBeGreaterThanOrEqual(4.5)
    }
    for (const surface of neutral.slice(0, 2)) {
      expect(contrastRatio(neutral[8]!, surface)).toBeGreaterThanOrEqual(3)
    }
  })

  it('deve manter o fundo cinza como estava: sem enriquecer e com o tom do primary', () => {
    const { neutral } = generateScales('#FAFAFA', { primary: '#FF0000' }, 'light')
    expect(chroma(neutral[1]!)).toBeLessThan(0.012)
    expect(hue(neutral[1]!)).toBeGreaterThan(0) // puxado para o vermelho, não para o matiz de um fundo
  })

  it.each(THEMED)('deve deixar em cinza com `tint: false`, mesmo com fundo colorido ($mode)', ({ mode, background, seeds }) => {
    const { neutral } = generateScales(background, seeds, mode, 'AA', { tint: false })
    expect(neutral[0]).toBe(background)
    expect(chroma(neutral[1]!)).toBeLessThan(0.02)
  })
})

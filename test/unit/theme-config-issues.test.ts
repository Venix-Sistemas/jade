import { describe, it, expect } from 'vitest'
import { findThemeConfigIssues } from '../../src/shared/utils/merge-themes'
import { getBaseThemeEntries } from '../../src/shared/utils/theme-config'
import type { ThemeEntry } from '../../src/shared/types'

const base = getBaseThemeEntries()
const issues = (themes?: Record<string, Partial<ThemeEntry>>) => findThemeConfigIssues(base, themes)

describe('findThemeConfigIssues', () => {
  it('has nothing to say about the built-in themes or a valid project theme', () => {
    expect(issues()).toEqual([])
    expect(issues({
      summer: {
        seasonal: true,
        dateRange: { start: '06-21', end: 'easter+10' },
        light: { primary: '#ff8800', background: '#fff' },
        dark: { primary: '#FFAA00' },
      },
    })).toEqual([])
  })

  it('warns about a color that is not a hex, which is dropped', () => {
    const messages = issues({ promo: { light: { primary: 'rgb(255 0 0)', secondary: 'red', accent: 'FF0000', error: '#ff00' } } })

    expect(messages).toHaveLength(4)
    expect(messages[0]).toContain('`color.themes.promo.light.primary`')
    expect(messages[0]).toContain('"rgb(255 0 0)"')
    expect(messages.join('\n')).toContain('`color.themes.promo.light.secondary`')
  })

  it('checks the flat format too, and an override of a built-in theme', () => {
    expect(issues({ old: { dark: true, primary: 'blue' } })[0]).toContain('`color.themes.old.primary`')
    expect(issues({ venix: { dark: { primary: 'tomato' } } })[0]).toContain('`color.themes.venix.dark.primary`')
  })

  it('warns about a seasonal theme without a dateRange', () => {
    const messages = issues({ promo: { seasonal: true, light: { primary: '#ff0000' } } })

    expect(messages).toHaveLength(1)
    expect(messages[0]).toContain('no `dateRange`')
  })

  it('warns about a dateRange without seasonal: true', () => {
    const messages = issues({ promo: { dateRange: { start: '01-01', end: '01-10' }, light: { primary: '#ff0000' } } })

    expect(messages).toHaveLength(1)
    expect(messages[0]).toContain('without `seasonal: true`')
  })

  it('warns about each bound that is not a date', () => {
    const range = (start: string, end: string) => issues({ promo: { seasonal: true, dateRange: { start, end }, light: { primary: '#ff0000' } } })

    expect(range('13-45', '01-03')).toHaveLength(1)
    expect(range('13-45', '01-03')[0]).toContain('`color.themes.promo.dateRange.start`')
    expect(range('1201', 'easter-x')).toHaveLength(2)
    expect(range('02-30', '04-31')).toHaveLength(2)
    expect(range('02-29', '12-1')).toEqual([])
    expect(range(' easter-47 ', 'easter+1')).toEqual([])
  })

  it('warns about two variants with the same id', () => {
    const messages = issues({
      one: { light: { primary: '#ff0000', id: 'shared' } },
      two: { dark: { primary: '#00ff00', id: 'shared' } },
    })

    expect(messages).toHaveLength(1)
    expect(messages[0]).toContain('`color.themes.one.light` and `color.themes.two.dark`')
    expect(messages[0]).toContain('`shared`')
  })

  it('warns when a project variant takes the id of a built-in one', () => {
    const messages = issues({ mine: { dark: { primary: '#00ff00', id: 'carnaval' } } })

    expect(messages).toHaveLength(1)
    expect(messages[0]).toContain('`color.themes.mine.dark`')
    expect(messages[0]).toContain('`color.themes.carnaval.dark`')
  })
})

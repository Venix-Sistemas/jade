import { fileURLToPath } from 'node:url'
import { describe, it, expect, afterEach } from 'vitest'
import { setup, url, getBrowser } from '@nuxt/test-utils/e2e'
import type { BrowserContext, BrowserContextOptions, Page } from 'playwright-core'
import { contrastRatio } from '../../src/shared/utils/contrast'

/**
 * What only a browser shows: the theme the visitor sees before Vue hydrates,
 * what survives a reload, the clock-driven seasonal theme, the switcher by
 * keyboard, and one tab following another. Locally it drives the Edge that is
 * already installed; CI installs Chromium.
 */
describe('theme in a browser', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('../fixtures/browser', import.meta.url)),
    browser: true,
    browserOptions: { type: 'chromium', launch: { channel: process.env.CI ? undefined : 'msedge' } },
  })

  const COOKIE = { preference: 'venix-theme-preference', mode: 'venix-theme-mode' }
  const CONSENT = JSON.stringify({ functionality: true })
  const contexts: BrowserContext[] = []

  async function newContext(options: BrowserContextOptions = {}): Promise<BrowserContext> {
    const context = await (await getBrowser()).newContext({ baseURL: url('/'), locale: 'en-US', ...options })
    contexts.push(context)
    return context
  }

  afterEach(async () => {
    await Promise.all(contexts.splice(0).map(context => context.close()))
  })

  /** A visitor who saved the automatic theme and mode earlier: the project default is `dark`, so these cookies are what make the page follow the system and the season. */
  const followSystem = (context: BrowserContext) =>
    context.addCookies([
      { name: COOKIE.preference, value: 'system', url: url('/') },
      { name: COOKIE.mode, value: 'system', url: url('/') },
    ])

  /** Gives consent before any page script runs, the way a cookie banner would have in an earlier visit. */
  const grantConsent = (context: BrowserContext) =>
    context.addInitScript((value) => { localStorage.setItem('venix-cookie-consent', value) }, CONSENT)

  const dataTheme = (page: Page) => page.evaluate(() => document.documentElement.dataset.theme)
  const state = async (page: Page) => (await page.locator('#state').textContent())?.trim() ?? ''

  async function openMenu(page: Page) {
    await page.getByRole('button', { name: 'Website color' }).click()
    await page.getByRole('menu').waitFor()
  }

  /** The mode group of the menu: `Light`, `Dark` or `Automatic`. */
  const pickMode = async (page: Page, name: string) => {
    await openMenu(page)
    await page.getByRole('menuitemradio', { name }).click()
  }

  describe('before hydration', () => {
    // Blocking the app's scripts leaves what the server rendered plus the
    // inline script: that is the theme on the first paint, before Vue exists.
    async function firstPaint(context: BrowserContext) {
      const page = await context.newPage()
      await page.route('**/_nuxt/**', route => route.abort())
      await page.goto('/')
      return dataTheme(page)
    }

    it.each(['light', 'dark'] as const)('deve seguir o %s do sistema quando o visitante escolheu o modo automático', async (scheme) => {
      const context = await newContext({ colorScheme: scheme })
      await context.addCookies([
        { name: COOKIE.preference, value: 'venix', url: url('/') },
        { name: COOKIE.mode, value: 'system', url: url('/') },
      ])
      expect(await firstPaint(context)).toBe(scheme)
    })

    it.each(['light', 'dark'] as const)('deve usar o modo %s salvo, mesmo com o sistema no oposto', async (saved) => {
      const context = await newContext({ colorScheme: saved === 'light' ? 'dark' : 'light' })
      await context.addCookies([
        { name: COOKIE.preference, value: 'venix', url: url('/') },
        { name: COOKIE.mode, value: saved, url: url('/') },
      ])
      expect(await firstPaint(context)).toBe(saved)
    })

    it('deve usar o padrão do projeto (dark) para quem não tem cookie, mesmo com o sistema claro', async () => {
      const context = await newContext({ colorScheme: 'light' })
      expect(await firstPaint(context)).toBe('dark')
    })
  })

  describe('persistência', () => {
    it('deve manter a escolha depois de recarregar quando há consentimento', async () => {
      const context = await newContext({ colorScheme: 'light' })
      await followSystem(context)
      await grantConsent(context)
      const page = await context.newPage()
      await page.goto('/')
      expect(await dataTheme(page)).toBe('light')

      await pickMode(page, 'Dark')
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')

      await page.reload()
      expect(await dataTheme(page)).toBe('dark')
      expect(await state(page)).toContain('|dark')
    })

    it('não deve guardar a escolha sem consentimento: ao recarregar volta ao sistema', async () => {
      const context = await newContext({ colorScheme: 'light' })
      await followSystem(context)
      const page = await context.newPage()
      await page.goto('/')
      expect(await dataTheme(page)).toBe('light')

      await pickMode(page, 'Dark')
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')
      expect((await context.cookies()).find(cookie => cookie.name === COOKIE.mode)?.value).toBe('system')

      await page.reload()
      expect(await dataTheme(page)).toBe('light')
    })
  })

  describe('tema sazonal', () => {
    const open = async (time: string) => {
      const context = await newContext({ colorScheme: 'light' })
      await followSystem(context)
      const page = await context.newPage()
      await page.clock.install({ time: new Date(time) })
      await page.goto('/')
      return page
    }

    it('deve ligar o tema da estação dentro do período e desligá-lo fora dele', async () => {
      expect(await dataTheme(await open('2026-12-10T12:00:00'))).toMatch(/^natal/)
      expect(await dataTheme(await open('2026-07-10T12:00:00'))).not.toMatch(/^natal/)
    })

    it('deve rever a data à meia-noite e sair do tema quando o período acaba', async () => {
      const page = await open('2026-12-26T23:59:50')
      expect(await dataTheme(page)).toMatch(/^natal/)

      await page.waitForLoadState('networkidle')
      await page.clock.runFor(20_000)
      await page.waitForFunction(() => !document.documentElement.dataset.theme?.startsWith('natal'))
    })
  })

  describe('seletor pelo teclado', () => {
    it('deve abrir, andar pelas opções com as setas e devolver o foco ao botão com Escape', async () => {
      const context = await newContext()
      const page = await context.newPage()
      await page.goto('/')
      await page.waitForLoadState('networkidle')

      const trigger = page.getByRole('button', { name: 'Website color' })
      await trigger.focus()
      await page.keyboard.press('Enter')
      await page.getByRole('menu').waitFor()
      await expect.poll(() => trigger.getAttribute('aria-expanded')).toBe('true')

      const activeLabel = () => page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent?.trim())
      await page.keyboard.press('ArrowDown')
      const first = await activeLabel()
      await page.keyboard.press('ArrowDown')
      const second = await activeLabel()
      expect(second).not.toBe(first)
      await page.keyboard.press('ArrowUp')
      expect(await activeLabel()).toBe(first)

      await page.keyboard.press('Escape')
      await expect.poll(() => trigger.getAttribute('aria-expanded')).toBe('false')
      await expect.poll(() => page.evaluate(() => document.activeElement?.classList.contains('venix-theme-switcher__trigger'))).toBe(true)
    })
  })

  describe('theme-color', () => {
    const bar = (page: Page) => page.evaluate(() => [...document.head.querySelectorAll('meta[name="theme-color"]')].map(meta => meta.getAttribute('content')))

    it.each([['light', '#FAFAFA'], ['dark', '#0C0C0C']] as const)('deve pôr a cor do fundo do tema %s antes da hidratação, em uma tag só', async (scheme, background) => {
      const context = await newContext({ colorScheme: scheme })
      await followSystem(context)
      const page = await context.newPage()
      await page.route('**/_nuxt/**', route => route.abort())
      await page.goto('/')
      expect(await bar(page)).toEqual([background])
    })

    it('deve acompanhar a troca de tema, sem criar outra tag', async () => {
      const context = await newContext({ colorScheme: 'light' })
      await followSystem(context)
      const page = await context.newPage()
      await page.goto('/')
      await page.waitForLoadState('networkidle')
      expect(await bar(page)).toEqual(['#FAFAFA'])

      await pickMode(page, 'Dark')
      await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')
      expect(await bar(page)).toEqual(['#0C0C0C'])
    })
  })

  describe('prefers-contrast', () => {
    /** The contrast of the helper text on the page, as the browser computes the variables. */
    const mutedContrast = (page: Page) => page.evaluate(() => {
      const style = getComputedStyle(document.documentElement)
      return [style.getPropertyValue('--jade-text-muted').trim(), style.getPropertyValue('--jade-bg').trim()]
    }).then(([text, background]) => contrastRatio(text!, background!))

    it.each(['light', 'dark'] as const)('deve dar texto muted de 7:1 (AAA) a quem pede mais contraste, no tema %s', async (scheme) => {
      const context = await newContext({ colorScheme: scheme })
      await followSystem(context)
      const page = await context.newPage()
      await page.goto('/')

      await page.emulateMedia({ contrast: 'no-preference' })
      const regular = await mutedContrast(page)
      expect(regular).toBeGreaterThanOrEqual(4.5)
      expect(regular).toBeLessThan(7)

      await page.emulateMedia({ contrast: 'more' })
      expect(await mutedContrast(page)).toBeGreaterThanOrEqual(7)
    })
  })

  describe('duas abas', () => {
    it('deve levar a escolha de uma aba à outra', async () => {
      const context = await newContext({ colorScheme: 'light' })
      await followSystem(context)
      await grantConsent(context)
      const first = await context.newPage()
      const second = await context.newPage()
      await first.goto('/')
      await second.goto('/')
      await second.waitForLoadState('networkidle')
      expect(await dataTheme(second)).toBe('light')

      await pickMode(first, 'Dark')
      await first.waitForFunction(() => document.documentElement.dataset.theme === 'dark')

      await second.waitForFunction(() => document.documentElement.dataset.theme === 'dark', undefined, { timeout: 5000 })
    })
  })
})

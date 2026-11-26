// src/shared/audit/page.ts
// The audit of a page on screen (`venix-jade audit --url`). Both functions are
// sent to the browser as they are: nothing from outside their own body.
/* eslint-disable @typescript-eslint/no-explicit-any */

export interface PageIssue {
  /** Where: the element and its parent, by tag and classes. */
  selector: string
  text: string
  color: string
  background: string
  ratio: number
  min: number
  /** The Jade variables with those colors, when there are. */
  colorToken?: string
  backgroundToken?: string
  fix: string
}

/** The theme variants the page's stylesheets have rules for. */
export function listThemes(): string[] {
  const doc = (globalThis as any).document
  const ids = new Set<string>()
  const walk = (rules: any) => {
    for (const rule of Array.from<any>(rules ?? [])) {
      for (const match of String(rule.selectorText ?? '').matchAll(/\[data-jade-theme=["']?([\w-]+)["']?\]/g)) ids.add(match[1]!)
      if (rule.cssRules) walk(rule.cssRules)
    }
  }
  for (const sheet of Array.from<any>(doc.styleSheets)) {
    try {
      walk(sheet.cssRules)
    }
    catch { /* a stylesheet of another origin */ }
  }
  return [...ids].sort()
}

/** Puts the page on a theme variant and returns the text that falls short of WCAG AA on it. */
export async function auditTheme(theme: string): Promise<PageIssue[]> {
  const win = globalThis as any
  const doc = win.document

  if (!doc.getElementById('jade-audit-style')) {
    const style = doc.createElement('style')
    style.id = 'jade-audit-style'
    style.textContent = '*, *::before, *::after { transition: none !important; animation: none !important; }'
    doc.head.append(style)
  }
  const root = doc.documentElement
  const pause = () => new Promise(resolve => win.setTimeout(resolve, 300))
  // The app switches itself when it can (a development server), so what follows
  // the theme in JavaScript follows it too; otherwise only the CSS is switched
  doc.startViewTransition = undefined
  win.dispatchEvent(new win.CustomEvent('jade:audit-select', { detail: theme }))
  await pause()
  if (root.getAttribute('data-jade-theme') !== theme) {
    root.setAttribute('data-jade-theme', theme)
    if (root.hasAttribute('data-theme')) root.setAttribute('data-theme', theme)
    await pause()
  }

  // Any CSS color syntax (`oklab()`, `color()`…) read back as numbers
  const canvas = doc.createElement('canvas')
  canvas.width = canvas.height = 1
  const context = canvas.getContext('2d', { willReadFrequently: true })
  const rgba = (color: string): number[] => {
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = '#000'
    context.fillStyle = color
    context.fillRect(0, 0, 1, 1)
    const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data
    return [r, g, b, a / 255]
  }
  const over = (top: number[], bottom: number[]) => [0, 1, 2].map(i => top[i]! * top[3]! + bottom[i]! * (1 - top[3]!)).concat(1)
  const hex = (color: number[]) => `#${color.slice(0, 3).map(c => Math.round(c).toString(16).padStart(2, '0')).join('').toUpperCase()}`
  const luminance = (color: number[]) => {
    const [r, g, b] = color.slice(0, 3).map((c) => {
      const v = c / 255
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
  }

  /** The color behind an element, or `null` over an image or a gradient. */
  const backgroundOf = (element: any): { color: number[], from: any } | null => {
    const layers: number[][] = []
    let from = element
    for (let node = element; node; node = node.parentElement) {
      const style = win.getComputedStyle(node)
      if (style.backgroundImage !== 'none') return null
      const color = rgba(style.backgroundColor)
      if (color[3]! > 0) {
        if (!layers.length) from = node
        layers.push(color)
        if (color[3] === 1) break
      }
    }
    // The browser's own canvas, under a page that paints none
    const canvasColor = win.getComputedStyle(root).colorScheme.includes('dark') ? [18, 18, 18, 1] : [255, 255, 255, 1]
    return { color: layers.reverse().reduce((below, layer) => over(layer, below), canvasColor), from }
  }

  const ROLES = ['primary', 'secondary', 'accent', 'error', 'info', 'success', 'warning']
  const TEXTS = ['text', 'text-muted', ...ROLES.flatMap(role => [`text-${role}`, `on-${role}`])]
  const BACKGROUNDS = ['bg', 'bg-subtle', 'bg-muted', 'bg-hover', 'bg-active', ...ROLES.flatMap(role => [`fill-${role}`, `bg-${role}`])]
  const tokenOf = (element: any, color: number[], names: string[]) => {
    const style = win.getComputedStyle(element)
    const wanted = hex(color)
    return names.find((name) => {
      const value = style.getPropertyValue(`--jade-${name}`).trim()
      return value && hex(rgba(value)) === wanted
    })
  }

  const SKIPPED = 'script, style, noscript, template, option, [aria-hidden="true"], :disabled, [aria-disabled="true"], #nuxt-devtools-container, nuxt-devtools-frame, #vue-inspector-container, [data-jade-audit-skip]'
  const issues: PageIssue[] = []

  for (const element of Array.from<any>(doc.body.querySelectorAll('*'))) {
    const text = Array.from<any>(element.childNodes).filter(node => node.nodeType === 3).map(node => node.textContent).join('').trim()
    // Only what can be read: letters or numbers, not an emoji or a symbol alone
    if (!/[\p{L}\p{N}]/u.test(text) || element.closest(SKIPPED) || !element.getClientRects().length) continue

    const style = win.getComputedStyle(element)
    if (style.visibility === 'hidden' || element.getBoundingClientRect().width < 2) continue
    let opacity = 1
    for (let node = element; node; node = node.parentElement) opacity *= Number(win.getComputedStyle(node).opacity)
    if (opacity === 0) continue

    const background = backgroundOf(element)
    if (!background) continue
    const ink = rgba(style.color)
    const seen = over([ink[0]!, ink[1]!, ink[2]!, ink[3]! * opacity], background.color)
    const [light, dark] = [luminance(seen), luminance(background.color)].sort((a, b) => b - a)
    const ratio = (light! + 0.05) / (dark! + 0.05)
    const size = Number.parseFloat(style.fontSize)
    const min = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700) ? 3 : 4.5
    if (ratio >= min) continue

    const name = (node: any) => node ? [node.tagName.toLowerCase(), ...Array.from<string>(node.classList).slice(0, 2)].join('.') : ''
    const backgroundToken = tokenOf(background.from, background.color, BACKGROUNDS)
    const fill = backgroundToken?.startsWith('fill-') ? backgroundToken.slice(5) : undefined
    const colorToken = tokenOf(element, ink, [...TEXTS, ...ROLES.flatMap(role => [`fill-${role}`, role])])
    issues.push({
      selector: [name(element.parentElement), name(element)].join(' > '),
      text: text.slice(0, 40),
      color: hex(seen),
      background: hex(background.color),
      ratio: Math.floor(ratio * 100) / 100,
      min,
      colorToken: colorToken && `--jade-${colorToken}`,
      backgroundToken: backgroundToken && `--jade-${backgroundToken}`,
      fix: opacity < 1
        ? 'Take the opacity off and use var(--jade-text-muted).'
        : fill
          ? `Over a ${fill} fill the text is var(--jade-on-${fill}).`
          : 'Use var(--jade-text), var(--jade-text-muted) or var(--jade-text-<role>); on a colored area, mark it with data-jade-surface so the tokens follow.',
    })
  }
  return issues
}

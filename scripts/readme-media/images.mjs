// Retakes the README's still images from the production build of the playground.
// usage: node images.mjs [switcher] [palettes] [icons] [sections] [scrollbar] [cursor-themes]
import fs from 'node:fs'
import path from 'node:path'
import { BASE_URL, launch, close, open, evaluate, shot, clickOn, mouse, sleep } from './rig.mjs'

const URL = BASE_URL
const OUT = path.resolve(import.meta.dirname, 'out/readme')
fs.mkdirSync(OUT, { recursive: true })
const ALL = ['switcher', 'palettes', 'icons', 'sections', 'scrollbar', 'cursor-themes']
const want = new Set(process.argv.slice(2).length ? process.argv.slice(2) : ALL)

const cdp = await launch({ width: 1383, height: 836, dpr: 2 })
const save = (name, buf) => {
  fs.writeFileSync(path.join(OUT, name), buf)
  console.log('saved', name, buf.length)
}
const wait = ms => sleep(ms)

/** Opens the playground; the stills leave out the page's own scrollbar unless `scrollbars` is set. */
async function prepare({ scrollbars = false } = {}) {
  await open(cdp, URL)
  await cdp.send('Emulation.setScrollbarsHidden', { hidden: !scrollbars })
  await evaluate(cdp, 'window.scrollTo(0, 0)')
  await mouse(cdp, 'mouseMoved', 5, 5)
}

// Clicks a chip of the Theme tab and makes sure it took (a click during a theme transition can be lost)
async function panelChip(text) {
  const pattern = '^' + text + '$'
  for (let attempt = 0; attempt < 4; attempt++) {
    await clickOn(cdp, '#color-panel-theme .chip', pattern)
    await wait(1200)
    const active = await evaluate(cdp, `[...document.querySelectorAll('#color-panel-theme .chip')].some(c => new RegExp(${JSON.stringify(pattern)}).test(c.textContent.trim()) && c.classList.contains('chip--active'))`)
    if (active) return
  }
  throw new Error('chip ' + text + ' never became active')
}

/** Page box (CSS px) of the union of the given elements (JS expression returning an array of elements). */
const boxOf = expr => evaluate(cdp, `(() => {
  const r = (${expr}).map(e => e.getBoundingClientRect())
  const x = Math.min(...r.map(b => b.left)) + scrollX, y = Math.min(...r.map(b => b.top)) + scrollY
  return { x, y, width: Math.max(...r.map(b => b.right)) + scrollX - x, height: Math.max(...r.map(b => b.bottom)) + scrollY - y }
})()`)
const clip = (rect, pad = 0) => shot(cdp, null, { x: rect.x - pad, y: rect.y - pad, width: rect.width + 2 * pad, height: rect.height + 2 * pad }, 'png')
const viewport = async () => Buffer.from((await cdp.send('Page.captureScreenshot', { format: 'png' })).data, 'base64')

/**
 * Lays cells out in a grid with rounded corners, on a transparent canvas. A cell is a PNG (base64)
 * or { b64, rect }: a crop (CSS px) of a viewport capture taken at 2x.
 */
async function composite(cells, { columns, gap, radius, scale = 2 }) {
  await open(cdp, 'about:blank', 100, false)
  const b64 = await evaluate(cdp, `(async () => {
    const load = b => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = 'data:image/png;base64,' + b })
    const imgs = await Promise.all(${JSON.stringify(cells)}.map(async (cell) => {
      if (typeof cell === 'string') return load(cell)
      const full = await load(cell.b64), r = cell.rect, k = ${scale}
      const c = document.createElement('canvas')
      c.width = Math.round(r.width * k); c.height = Math.round(r.height * k)
      c.getContext('2d').drawImage(full, r.x * k, r.y * k, c.width, c.height, 0, 0, c.width, c.height)
      return c
    }))
    const cols = ${columns}, gap = ${gap * scale}, r = ${radius * scale}
    const cw = Math.max(...imgs.map(i => i.width)), ch = Math.max(...imgs.map(i => i.height))
    const rows = Math.ceil(imgs.length / cols)
    const c = document.createElement('canvas')
    c.width = cols * cw + (cols - 1) * gap; c.height = rows * ch + (rows - 1) * gap
    const g = c.getContext('2d')
    imgs.forEach((img, n) => {
      const x = (n % cols) * (cw + gap), y = Math.floor(n / cols) * (ch + gap)
      g.save(); g.beginPath(); g.roundRect(x, y, img.width, img.height, r); g.clip(); g.drawImage(img, x, y); g.restore()
    })
    return c.toDataURL('image/png').split(',')[1]
  })()`)
  return Buffer.from(b64, 'base64')
}

// ------------------------------------------------------------ the switcher
async function switcher() {
  for (const mode of ['Dark', 'Light']) {
    await prepare()
    await panelChip(mode)
    await evaluate(cdp, 'window.scrollTo(0, 0)')
    await mouse(cdp, 'mouseMoved', 5, 5)
    await wait(300)

    await clickOn(cdp, 'button', '^Website color$')
    await wait(900)
    await mouse(cdp, 'mouseMoved', 700, 600)
    await wait(300)
    save(`switcher-${mode.toLowerCase()}.png`, await viewport())

    await clickOn(cdp, 'button', '^Settings$')
    await wait(900)
    await mouse(cdp, 'mouseMoved', 700, 600)
    await wait(300)
    save(`switcher-settings-${mode.toLowerCase()}.png`, await viewport())
  }
}

// ---------------------------------------------------------------- palettes
async function palettes() {
  await prepare()
  const cells = []
  for (const [theme, mode] of [['Venix', 'Dark'], ['Venix', 'Light'], ['Halloween', 'Dark'], ['Christmas', 'Light']]) {
    // the previous round hid the neighbours, which also hides the chips from the pointer
    await evaluate(cdp, `(() => { [...document.querySelector('#color-panel-theme').children].forEach(c => { c.style.visibility = '' }); window.scrollTo(0, 0) })()`)
    await panelChip(mode)
    await panelChip(theme)
    await evaluate(cdp, `(() => {
      const panel = document.querySelector('#color-panel-theme')
      const h = [...panel.querySelectorAll('.demo__label')].find(e => /^Palette/i.test(e.textContent))
      const grid = panel.querySelector('.color-grid')
      h.textContent = ${JSON.stringify('Palette · ' + theme + ' · ' + mode)}
      Object.assign(h.style, { textTransform: 'none', letterSpacing: 'normal', fontSize: '1.05rem', opacity: '1', margin: '0 0 0.6rem' })
      // only the palette stays visible; its neighbours keep their place
      for (const c of panel.children) if (c !== h && c !== grid) c.style.visibility = 'hidden'
      h.scrollIntoView({ block: 'center' })
    })()`)
    await wait(500)
    const rect = await evaluate(cdp, `(() => {
      const els = [[...document.querySelectorAll('#color-panel-theme .demo__label')].find(e => /^Palette/i.test(e.textContent)), ...document.querySelectorAll('#color-panel-theme .color-card')].map(e => e.getBoundingClientRect())
      const x = Math.min(...els.map(b => b.left)), y = Math.min(...els.map(b => b.top))
      return { x: x - 14, y: y - 14, width: Math.max(...els.map(b => b.right)) - x + 28, height: Math.max(...els.map(b => b.bottom)) - y + 28 }
    })()`)
    console.log('palette', theme, mode, '->', await evaluate(cdp, 'document.documentElement.dataset.theme'))
    cells.push({ b64: (await viewport()).toString('base64'), rect })
  }
  save('palettes.png', await composite(cells, { columns: 1, gap: 12, radius: 12 }))
}

// ------------------------------------------------------------------- icons
async function icons() {
  await prepare()
  await evaluate(cdp, `document.querySelectorAll('#plugins .plugin')[2].scrollIntoView({ block: 'center' })`)
  await wait(600)
  save('icons.png', await clip(await boxOf(`[document.querySelectorAll('#plugins .plugin')[2]]`)))
}

// ---------------------------------------------------------------- sections
async function sections() {
  await prepare()
  for (const [id, file] of [['typography', 'typography.png'], ['cursor', 'cursor.png']]) {
    await evaluate(cdp, `document.getElementById(${JSON.stringify(id)}).scrollIntoView({ block: 'center' })`)
    await wait(500)
    if (id === 'cursor') await drawCursors()
    const content = await boxOf(`[document.querySelector('.content')]`)
    const sec = await boxOf(`[document.getElementById(${JSON.stringify(id)})]`)
    save(file, await shot(cdp, null, { x: content.x, y: sec.y - 16, width: content.width, height: sec.height + 32 }, 'png'))
    if (id === 'cursor') await evaluate(cdp, `document.querySelectorAll('.__demo-cursor').forEach(e => e.remove())`)
  }
}

async function scrollbar() {
  // a fresh page with the scrollbars on: the demo scrollbars are the point
  await prepare({ scrollbars: true })
  await evaluate(cdp, `document.getElementById('scrollbar').scrollIntoView({ block: 'center' })`)
  await evaluate(cdp, `(() => { document.querySelector('.scroll-vertical').scrollTop = 140; document.querySelector('.scroll-horizontal').scrollLeft = 150 })()`)
  await wait(1500) // the thumbs take a moment to paint
  // The thumbs are composited layers a clipped capture leaves out: take the whole
  // viewport and crop it afterwards.
  const rect = await evaluate(cdp, `(() => {
    const c = document.querySelector('.content').getBoundingClientRect(), s = document.getElementById('scrollbar').getBoundingClientRect()
    return { x: c.left, y: s.top - 16, width: c.width, height: s.height + 32 }
  })()`)
  const full = await viewport()
  save('scrollbar.png', await composite([{ b64: full.toString('base64'), rect }], { columns: 1, gap: 0, radius: 0 }))
}

/** The module's own cursors, drawn where the old picture had them (a screenshot has no pointer). */
async function drawCursors() {
  await evaluate(cdp, `(() => {
    const cs = getComputedStyle(document.documentElement)
    const cards = document.querySelectorAll('#cursor .cursor-area')
    ;['default', 'pointer', 'text'].forEach((name, i) => {
      const value = cs.getPropertyValue('--cursor-' + name)
      const m = /url\\((["']?)(.*?)\\1\\)\\s*(-?\\d+)?\\s*(-?\\d+)?/.exec(value)
      if (!m) return
      const b = cards[i].getBoundingClientRect()
      const img = document.createElement('img')
      img.className = '__demo-cursor'
      img.src = m[2]
      const hx = Number(m[3] || 0), hy = Number(m[4] || 0)
      const x = b.left + scrollX + b.width * 0.5, y = b.top + scrollY + b.height * (i === 2 ? 0.58 : 0.62)
      img.style.cssText = 'position:absolute;pointer-events:none;z-index:99999;left:' + (x - hx) + 'px;top:' + (y - hy) + 'px'
      document.body.appendChild(img)
    })
  })()`)
  await wait(400)
}

// ----------------------------------------------------------- cursor themes
async function cursorThemes() {
  await prepare()
  const cells = []
  for (const mode of ['Dark', 'Light']) {
    for (const theme of ['Venix', 'Carnival', 'Easter', 'Christmas', 'Halloween']) {
      await panelChip(mode)
      await panelChip(theme)
      await evaluate(cdp, 'window.scrollTo(0, 0)')
      await evaluate(cdp, `(() => {
        document.querySelectorAll('.__cell').forEach(e => e.remove())
        const cs = getComputedStyle(document.documentElement)
        const cursor = name => { const m = /url\\((["']?)(.*?)\\1\\)/.exec(cs.getPropertyValue('--cursor-' + name)); return m && m[2] }
        const base = ${JSON.stringify(theme)} === 'Venix'
        const cell = document.createElement('div')
        cell.className = '__cell'
        cell.style.cssText = 'position:fixed;left:24px;top:24px;width:288px;padding:14px;border-radius:12px;background:var(--pg-surface);border:1px solid var(--pg-border);z-index:99999;box-sizing:content-box;font-family:inherit'
        const tiles = ['default', 'pointer', 'text'].map(n => '<div style="flex:1;border-radius:10px;background:var(--pg-surface-muted);padding:10px 0 8px;text-align:center"><img src="' + cursor(n) + '" style="height:44px;display:block;margin:0 auto 6px"><span style="font-size:0.85rem;color:var(--pg-label)">' + n + '</span></div>').join('')
        cell.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px"><strong style="font-size:1.1rem;color:var(--pg-label);font-weight:600">' + ${JSON.stringify(theme + ' · ' + mode)} + '</strong><span style="font-size:0.7rem;padding:0.15rem 0.5rem;border-radius:6px;background:var(--pg-surface-muted);color:var(--pg-accent)">' + (base ? 'base' : 'themed') + '</span></div><div style="display:flex;gap:10px">' + tiles + '</div>'
        document.body.appendChild(cell)
      })()`)
      await wait(500)
      const r = await boxOf(`[document.querySelector('.__cell')]`)
      cells.push((await clip(r, 0)).toString('base64'))
    }
  }
  save('cursor-themes.png', await composite(cells, { columns: 5, gap: 12, radius: 12 }))
}

try {
  if (want.has('switcher')) await switcher()
  if (want.has('palettes')) await palettes()
  if (want.has('icons')) await icons()
  if (want.has('sections')) await sections()
  if (want.has('scrollbar')) await scrollbar()
  if (want.has('cursor-themes')) await cursorThemes()
}
finally {
  close(cdp)
}

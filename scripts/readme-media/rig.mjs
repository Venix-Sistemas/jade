// Capture rig for the README images: headless Edge driven over the DevTools protocol,
// frames taken on the browser's virtual clock (24 fps however long each capture takes),
// plus a small animated-WebP muxer (no ffmpeg or WebP tools needed).
import { spawn, execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'

// Microsoft Edge (or any Chromium: set EDGE_PATH); the default is where Windows installs it
const EDGE = process.env.EDGE_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
// The production build of the playground the pictures are taken from (see README.md)
export const BASE_URL = process.env.PLAYGROUND_URL || 'http://127.0.0.1:3056/'
export const FPS = 24
export const FRAME_MS = 1000 / FPS

export const sleep = ms => new Promise(r => setTimeout(r, ms))

// ---------------------------------------------------------------- browser
export async function launch({ port = 9333, width = 1383, height = 836, dpr = 2, colorScheme = null } = {}) {
  const userDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jade-edge-'))
  const proc = spawn(EDGE, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${userDir}`,
    '--no-first-run', '--no-default-browser-check', '--lang=en-US', '--accept-lang=en-US',
    '--force-color-profile=srgb', '--disable-features=Translate', 'about:blank',
  ], { stdio: 'ignore' })

  let target
  for (let i = 0; i < 60 && !target; i++) {
    await sleep(250)
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
      target = list.find(t => t.type === 'page')
    }
    catch { /* not up yet */ }
  }
  if (!target) throw new Error('Edge did not start')

  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.onopen = resolve
    ws.onerror = reject
  })

  let id = 0
  const pending = new Map()
  const listeners = []
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error ? reject(new Error(`${msg.error.message}`)) : resolve(msg.result)
    }
    else if (msg.method) {
      for (const l of [...listeners]) {
        if (l.method !== msg.method) continue
        listeners.splice(listeners.indexOf(l), 1)
        l.resolve(msg.params)
      }
    }
  }

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const mid = ++id
    pending.set(mid, { resolve, reject })
    ws.send(JSON.stringify({ id: mid, method, params }))
  })
  const once = method => new Promise(resolve => listeners.push({ method, resolve }))

  const cdp = { send, once, port, proc, userDir, width, height, dpr }
  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: false })
  if (colorScheme) await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: colorScheme }] })
  return cdp
}

export function close(cdp) {
  try {
    execSync(`taskkill /PID ${cdp.proc.pid} /T /F`, { stdio: 'ignore' })
  }
  catch { /* already gone */ }
  try {
    fs.rmSync(cdp.userDir, { recursive: true, force: true })
  }
  catch { /* locked, temp dir */ }
}

export async function evaluate(cdp, expression) {
  const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text)
  return r.result.value
}

export async function open(cdp, url, settle = 3500, english = true) {
  const loaded = cdp.once('Page.loadEventFired')
  await cdp.send('Page.navigate', { url })
  await loaded
  await evaluate(cdp, 'document.fonts.ready.then(() => true)')
  await sleep(settle)
  // Jade takes the locale from the system (pt-BR here), the playground's pictures are in English
  if (english) {
    await evaluate(cdp, `(() => { const b = [...document.querySelectorAll('.chip')].find(c => /^English$/.test(c.textContent.trim())); b && b.click() })()`)
    await sleep(800)
  }
}

// -------------------------------------------------------------- screenshots
export async function shot(cdp, file, clip, format = 'png') {
  const params = { format, captureBeyondViewport: false }
  if (clip) params.clip = { ...clip, scale: 1 }
  const { data } = await cdp.send('Page.captureScreenshot', params)
  const buf = Buffer.from(data, 'base64')
  if (file) fs.writeFileSync(file, buf)
  return buf
}

/** Bounding box (CSS px, page coordinates) of the union of elements matching the selectors. */
export async function box(cdp, ...selectors) {
  return evaluate(cdp, `(() => {
    const els = ${JSON.stringify(selectors)}.map(s => document.querySelector(s)).filter(Boolean)
    if (!els.length) return null
    const rects = els.map(e => e.getBoundingClientRect())
    const x = Math.min(...rects.map(r => r.left)) + scrollX, y = Math.min(...rects.map(r => r.top)) + scrollY
    const x2 = Math.max(...rects.map(r => r.right)) + scrollX, y2 = Math.max(...rects.map(r => r.bottom)) + scrollY
    return { x, y, width: x2 - x, height: y2 - y }
  })()`)
}

// ------------------------------------------------------------------ input
export async function mouse(cdp, type, x, y, extra = {}) {
  await cdp.send('Input.dispatchMouseEvent', { type, x, y, button: 'none', ...extra })
}

export async function click(cdp, x, y) {
  await mouse(cdp, 'mouseMoved', x, y)
  await mouse(cdp, 'mousePressed', x, y, { button: 'left', buttons: 1, clickCount: 1 })
  await mouse(cdp, 'mouseReleased', x, y, { button: 'left', buttons: 0, clickCount: 1 })
}

/** Center of the first element (matching `selector`) whose text matches `text`. */
export async function center(cdp, selector, text) {
  const r = await evaluate(cdp, `(() => {
    const re = new RegExp(${JSON.stringify(text ?? '')}, 'i')
    const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find(e => re.test(e.textContent) || re.test(e.getAttribute('aria-label') || ''))
    if (!el) return null
    el.scrollIntoView({ block: 'nearest' })
    const b = el.getBoundingClientRect()
    return { x: b.left + b.width / 2, y: b.top + b.height / 2 }
  })()`)
  if (!r) throw new Error(`no element ${selector} with text ${text}`)
  return r
}

export async function clickOn(cdp, selector, text) {
  const { x, y } = await center(cdp, selector, text)
  await click(cdp, x, y)
  return { x, y }
}

/**
 * A cursor drawn into the page (headless screenshots have none): the page's own
 * `cursor` for whatever is under the pointer, so the custom cursors show, and
 * turn into the system arrow when the visitor switches them off.
 */
export async function installCursor(cdp) {
  await evaluate(cdp, `(() => {
    if (window.__moveCursor) return
    const img = document.createElement('img')
    img.id = '__cursor'
    img.style.cssText = 'position:fixed;left:-100px;top:-100px;z-index:2147483647;pointer-events:none;max-width:48px;max-height:48px'
    document.body.appendChild(img)
    const arrow = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="22" height="30" viewBox="0 0 22 30"><path d="M2 2l16 16h-8l5 9-4 2-5-9-5 5z" fill="#fff" stroke="#000" stroke-width="2" stroke-linejoin="round"/></svg>')
    const hand = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="26" height="30" viewBox="0 0 26 30"><path d="M9 3a2 2 0 0 1 4 0v9l1-1a2 2 0 0 1 3 1l1-1a2 2 0 0 1 3 1l1 7c0 5-3 9-8 9s-8-3-9-6l-3-6a2 2 0 0 1 3-2l3 3z" fill="#fff" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/></svg>')
    window.__moveCursor = (x, y) => {
      const target = document.elementFromPoint(x, y)
      const value = target ? getComputedStyle(target).cursor : 'default'
      const m = /url\\((["']?)(.*?)\\1\\)\\s*(-?\\d+)?\\s*(-?\\d+)?/.exec(value)
      let src, hx = 0, hy = 0
      if (m) { src = m[2]; hx = Number(m[3] || 0); hy = Number(m[4] || 0) }
      else if (/pointer/.test(value)) { src = hand; hx = 9; hy = 2 }
      else { src = arrow; hx = 2; hy = 2 }
      if (img.getAttribute('src') !== src) img.setAttribute('src', src)
      img.style.left = (x - hx) + 'px'
      img.style.top = (y - hy) + 'px'
      return value.slice(0, 40)
    }
  })()`)
}

export async function moveTo(cdp, x, y) {
  await mouse(cdp, 'mouseMoved', x, y)
  await evaluate(cdp, `window.__moveCursor && window.__moveCursor(${x}, ${y})`)
}

// ------------------------------------------------------------ virtual time
export async function pauseTime(cdp) {
  await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'pause' })
}

export async function advance(cdp, ms = FRAME_MS) {
  const expired = cdp.once('Emulation.virtualTimeBudgetExpired')
  await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'pauseIfNetworkFetchesPending', budget: ms })
  await expired
}

/**
 * One frame of recording: the virtual clock moves on by 1/fps while (optionally) a
 * mouse event is delivered. Input events wait for the page's main thread, which a
 * paused clock never runs, so they have to travel together with the advance.
 * `type` is 'mouseMoved' (default), 'mousePressed' or 'mouseReleased'.
 */
export async function tick(cdp, point = null, type = 'mouseMoved') {
  const ops = [advance(cdp)]
  if (point) {
    const extra = type === 'mousePressed' ? { button: 'left', buttons: 1, clickCount: 1 } : type === 'mouseReleased' ? { button: 'left', buttons: 0, clickCount: 1 } : {}
    ops.push(mouse(cdp, type, point.x, point.y, extra))
  }
  await Promise.all(ops)
  if (point) await evaluate(cdp, `window.__moveCursor && window.__moveCursor(${point.x}, ${point.y})`)
}

export function resumeTime(cdp) {
  return cdp.send('Emulation.setVirtualTimePolicy', { policy: 'advance' })
}

// ---------------------------------------------------------- animated WebP (the muxer is in encode.mjs)
/** Durations that average exactly 1000/fps ms (42, 42, 41 at 24 fps), as WebP stores whole milliseconds. */
export function frameDurations(count, fps = FPS) {
  const out = []
  let t = 0
  for (let i = 1; i <= count; i++) {
    const next = Math.round((i * 1000) / fps)
    out.push(next - t)
    t = next
  }
  return out
}

/** Reads a muxed file back: frame count, durations and how many frames differ from the one before. */
export function inspectAnimatedWebP(buf) {
  const out = { canvas: null, frames: [], loop: null }
  for (let o = 12; o + 8 <= buf.length;) {
    const type = buf.toString('latin1', o, o + 4)
    const size = buf.readUInt32LE(o + 4)
    if (type === 'VP8X') out.canvas = { width: 1 + buf.readUIntLE(o + 12, 3), height: 1 + buf.readUIntLE(o + 15, 3), flags: buf[o + 8] }
    if (type === 'ANIM') out.loop = buf.readUInt16LE(o + 8 + 4)
    if (type === 'ANMF') {
      const data = buf.subarray(o + 8 + 16, o + 8 + size)
      out.frames.push({ duration: buf.readUIntLE(o + 8 + 12, 3), hash: crypto.createHash('md5').update(data).digest('hex') })
    }
    o += 8 + size + (size % 2)
  }
  return out
}

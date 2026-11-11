// Records the README's theme-switcher animation at 24 fps, 1600x967, on the browser's virtual clock.
// usage: node record.mjs [--limit=<frames>]   (a limit makes a short test run)
import fs from 'node:fs'
import path from 'node:path'
import { BASE_URL, launch, close, open, evaluate, shot, center, installCursor, pauseTime, tick, resumeTime, inspectAnimatedWebP, FPS } from './rig.mjs'
import { encodeFrames, muxPartialFrames, verifyDecode } from './encode.mjs'

const URL = BASE_URL
const OUT = path.resolve(import.meta.dirname, 'out')
fs.mkdirSync(OUT, { recursive: true })
const limitArg = process.argv.find(a => a.startsWith('--limit='))
const LIMIT = limitArg ? Number(limitArg.split('=')[1]) : Infinity
const NAME = limitArg ? 'theme-switcher-test.webp' : 'theme-switcher.webp'

const W = 1600
const H = 967
// "Automatic" follows the OS: dark here, so going from Light to Automatic shows a change
const cdp = await launch({ width: W, height: H, dpr: 1, colorScheme: 'dark' })
// the browser always goes, even when something throws
process.on('uncaughtException', (e) => {
  close(cdp)
  console.error(e)
  process.exit(1)
})

class Stop extends Error {}
const pngs = []
let pos = { x: 760, y: 520 }

/** One tick of 1/24 s: the virtual clock moves on, then the frame is taken. */
async function frame(point = pos, type = 'mouseMoved') {
  if (pngs.length >= LIMIT) throw new Stop()
  await tick(cdp, point, type)
  pngs.push(await shot(cdp, null, null, 'png'))
}
const ticks = seconds => Math.max(1, Math.round(seconds * FPS))
const hold = async (seconds) => {
  for (let i = 0; i < ticks(seconds); i++) await frame()
}
const ease = t => t * t * (3 - 2 * t)

/** The pointer glides to `to`, easing in and out, one step per frame. */
async function glide(to, seconds = 0.5) {
  const from = pos
  const n = ticks(seconds)
  for (let i = 1; i <= n; i++) {
    const t = ease(i / n)
    pos = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }
    await frame(pos)
  }
}
const press = async () => {
  await frame(pos, 'mousePressed')
  await frame(pos, 'mouseReleased')
}
async function clickOn(selector, text, { glideTime = 0.5, after = 1 } = {}) {
  const c = await center(cdp, selector, text)
  await glide(c, glideTime)
  await press()
  await hold(after)
}

try {
  await open(cdp, URL)
  await installCursor(cdp)
  await evaluate(cdp, `window.scrollTo(0, 0); window.__moveCursor(${pos.x}, ${pos.y})`)
  await pauseTime(cdp)

  await hold(0.8)
  // open the switcher
  await clickOn('button', '^Website color$', { glideTime: 0.9, after: 0.9 })

  // the dark themes, one after the other
  for (const theme of ['Carnival', 'Easter', 'Christmas', 'Halloween', 'Ocean']) {
    await clickOn('button', '^' + theme, { glideTime: 0.45, after: 1.2 })
  }
  // Ocean in light mode, then on automatic
  await clickOn('button', '^Light$', { after: 1.4 })
  await clickOn('button', '^Automatic$', { after: 1.4 })

  // the settings: each custom thing off and back on
  await clickOn('button', '^Settings$', { glideTime: 0.6, after: 0.8 })
  for (const setting of ['Custom scrollbar', 'Custom cursor', 'Custom font']) {
    await clickOn('button', setting, { glideTime: 0.4, after: 1.1 })
    await clickOn('button', setting, { glideTime: 0.3, after: 0.9 })
  }
  await clickOn('button', '^Back$', { glideTime: 0.5, after: 0.7 })

  // back to where it began: Venix, dark, menu closed
  await clickOn('button', '^Dark$', { after: 1.1 })
  await clickOn('button', '^Venix', { after: 1.2 })
  await clickOn('button', '^Website color$', { glideTime: 0.6, after: 1.0 })
}
catch (e) {
  if (!(e instanceof Stop)) {
    close(cdp)
    throw e
  }
}

console.log('captured', pngs.length, 'ticks =', (pngs.length / FPS).toFixed(1), 's')
await resumeTime(cdp)

// partial frames, quality 85
await open(cdp, 'about:blank', 100, false)
const frames = await encodeFrames(cdp, pngs, { quality: 0.85, onProgress: (i, n, k) => console.log('  encoded', i, '/', n, '->', k, 'frames') })
const file = muxPartialFrames(frames, { width: W, height: H })
fs.writeFileSync(path.join(OUT, NAME), file)

// what the file says about itself
const info = inspectAnimatedWebP(file)
const totalMs = info.frames.reduce((n, f) => n + f.duration, 0)
console.log(JSON.stringify({
  file: NAME,
  bytes: file.length,
  mb: +(file.length / 1048576).toFixed(2),
  canvas: info.canvas,
  loop: info.loop,
  ticks: pngs.length,
  frames: info.frames.length,
  totalMs,
  expectedMs: Math.round(pngs.length * 1000 / FPS),
  fps: +(pngs.length / (totalMs / 1000)).toFixed(3),
}, null, 1))

// what a browser decodes from it, against the frames it was made from (ImageDecoder wants a secure origin)
await open(cdp, URL + 'favicon.png', 100, false)
const picks = [0, Math.floor(frames.length * 0.15), Math.floor(frames.length * 0.4), Math.floor(frames.length * 0.65), Math.floor(frames.length * 0.9), frames.length - 1]
const check = await verifyDecode(cdp, file, [...new Set(picks)].map(i => ({ frameIndex: i, png: pngs[frames[i].start] })))
console.log(JSON.stringify(check))
for (const i of [0, Math.floor(pngs.length / 2), pngs.length - 1]) fs.writeFileSync(path.join(OUT, `frame-${i}.png`), pngs[i])
close(cdp)

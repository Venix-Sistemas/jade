// Turns the captured frames (full PNGs) into an animated WebP made of partial frames:
// each frame is only the rectangle that changed since the one before, so a cursor gliding
// over a still page costs a few hundred bytes instead of a whole picture.
import { evaluate, frameDurations, FPS } from './rig.mjs'

const SETUP = `(() => {
  window.__prev = null
  window.__cv = null
  window.__b64 = async (blob) => {
    const buf = new Uint8Array(await blob.arrayBuffer())
    let s = ''
    for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000))
    return btoa(s)
  }
  window.__enc = async (png, quality) => {
    const bytes = Uint8Array.from(atob(png), c => c.charCodeAt(0))
    const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }))
    const w = bmp.width, h = bmp.height
    if (!window.__cv) {
      window.__cv = new OffscreenCanvas(w, h)
      window.__ctx = window.__cv.getContext('2d', { willReadFrequently: true })
    }
    const ctx = window.__ctx
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(bmp, 0, 0)
    bmp.close()
    const a = new Uint32Array(ctx.getImageData(0, 0, w, h).data.buffer)
    let x0 = 0, y0 = 0, x1 = w, y1 = h
    if (window.__prev) {
      const b = window.__prev
      x0 = w; y0 = h; x1 = -1; y1 = -1
      for (let y = 0; y < h; y++) {
        const row = y * w
        for (let x = 0; x < w; x++) {
          if (a[row + x] !== b[row + x]) {
            if (x < x0) x0 = x
            if (x > x1) x1 = x
            if (y < y0) y0 = y
            if (y > y1) y1 = y
          }
        }
      }
      if (x1 < 0) return null
      x1++; y1++
    }
    window.__prev = a.slice()
    x0 &= ~1; y0 &= ~1 // frame offsets are stored halved
    const cw = x1 - x0, ch = y1 - y0
    const out = new OffscreenCanvas(cw, ch)
    out.getContext('2d').drawImage(window.__cv, x0, y0, cw, ch, 0, 0, cw, ch)
    const blob = await out.convertToBlob({ type: 'image/webp', quality })
    return { x: x0, y: y0, w: cw, h: ch, b64: await window.__b64(blob) }
  }
})()`

/**
 * pngs: Buffer[] (one per tick of 1/24 s). Returns [{ x, y, w, h, webp, ticks, start }]:
 * identical neighbours are folded into the previous frame's duration.
 */
export async function encodeFrames(cdp, pngs, { quality = 0.85, onProgress } = {}) {
  await evaluate(cdp, SETUP)
  const frames = []
  for (let i = 0; i < pngs.length; i++) {
    const r = await evaluate(cdp, `window.__enc(${JSON.stringify(pngs[i].toString('base64'))}, ${quality})`)
    if (r === null) frames.at(-1).ticks++
    else frames.push({ x: r.x, y: r.y, w: r.w, h: r.h, webp: Buffer.from(r.b64, 'base64'), ticks: 1, start: i })
    if (onProgress && i % 50 === 0) onProgress(i, pngs.length, frames.length)
  }
  return frames
}

// ------------------------------------------------------------------- mux
const u24 = n => Buffer.from([n & 255, (n >> 8) & 255, (n >> 16) & 255])
const u32 = (n) => {
  const b = Buffer.alloc(4)
  b.writeUInt32LE(n)
  return b
}
const chunk = (type, data) => Buffer.concat([Buffer.from(type), u32(data.length), data, data.length % 2 ? Buffer.from([0]) : Buffer.alloc(0)])

/** The image chunks (ALPH + VP8/VP8L) of a still WebP. */
function imageChunks(webp) {
  const out = []
  for (let o = 12; o + 8 <= webp.length;) {
    const type = webp.toString('latin1', o, o + 4)
    const size = webp.readUInt32LE(o + 4)
    if (type === 'ALPH' || type === 'VP8 ' || type === 'VP8L') out.push(webp.subarray(o, o + 8 + size + (size % 2)))
    o += 8 + size + (size % 2)
  }
  return Buffer.concat(out)
}

export function muxPartialFrames(frames, { width, height, fps = FPS }) {
  const total = frames.reduce((n, f) => n + f.ticks, 0)
  const durations = frameDurations(total, fps)
  let cursor = 0
  const anmf = frames.map((f) => {
    const duration = durations.slice(cursor, cursor + f.ticks).reduce((a, b) => a + b, 0)
    cursor += f.ticks
    // flags: bit 1 = do not blend, bit 0 = dispose to none: the rectangle replaces what is under it
    return chunk('ANMF', Buffer.concat([u24(f.x / 2), u24(f.y / 2), u24(f.w - 1), u24(f.h - 1), u24(duration), Buffer.from([0b10]), imageChunks(f.webp)]))
  })
  const vp8x = chunk('VP8X', Buffer.concat([Buffer.from([0b10, 0, 0, 0]), u24(width - 1), u24(height - 1)]))
  const anim = chunk('ANIM', Buffer.concat([Buffer.from([0, 0, 0, 0]), Buffer.from([0, 0])]))
  const body = Buffer.concat([Buffer.from('WEBP'), vp8x, anim, ...anmf])
  return Buffer.concat([Buffer.from('RIFF'), u32(body.length), body])
}

// ---------------------------------------------------------------- verify
/**
 * Decodes the muxed file the way a browser does (WebCodecs ImageDecoder) and compares some of
 * its frames with the PNGs they came from: the mean absolute difference per channel (0-255).
 * samples: [{ frameIndex, png: Buffer }]
 */
export async function verifyDecode(cdp, file, samples) {
  const data = file.toString('base64')
  const expr = `(async () => {
    const bytes = Uint8Array.from(atob(${JSON.stringify(data)}), c => c.charCodeAt(0))
    const dec = new ImageDecoder({ data: bytes, type: 'image/webp' })
    await dec.tracks.ready
    const out = { frameCount: dec.tracks.selectedTrack.frameCount, repetition: dec.tracks.selectedTrack.repetitionCount, diffs: [] }
    const samples = ${JSON.stringify(samples.map(s => ({ i: s.frameIndex, png: s.png.toString('base64') })))}
    for (const s of samples) {
      const { image } = await dec.decode({ frameIndex: s.i })
      const w = image.displayWidth, h = image.displayHeight
      const a = new OffscreenCanvas(w, h).getContext('2d', { willReadFrequently: true })
      a.drawImage(image, 0, 0); image.close()
      const ref = await createImageBitmap(new Blob([Uint8Array.from(atob(s.png), c => c.charCodeAt(0))], { type: 'image/png' }))
      const b = new OffscreenCanvas(w, h).getContext('2d', { willReadFrequently: true })
      b.drawImage(ref, 0, 0)
      const x = a.getImageData(0, 0, w, h).data, y = b.getImageData(0, 0, w, h).data
      let sum = 0, n = 0, worst = 0
      for (let p = 0; p < x.length; p += 4) { for (let c = 0; c < 3; c++) { const d = Math.abs(x[p + c] - y[p + c]); sum += d; n++; if (d > worst) worst = d } }
      out.diffs.push({ frameIndex: s.i, size: w + 'x' + h, mean: +(sum / n).toFixed(3), worst })
    }
    return out
  })()`
  return evaluate(cdp, expr)
}

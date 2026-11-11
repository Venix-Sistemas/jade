// A contact sheet of an animated WebP, decoded the way a browser does: every Nth frame, scaled down.
// usage: node contact.mjs <file.webp> [step=64] [columns=4]
import fs from 'node:fs'
import path from 'node:path'
import { BASE_URL, launch, close, open, evaluate } from './rig.mjs'

const [file, stepArg, colsArg] = process.argv.slice(2)
const step = Number(stepArg || 64)
const cols = Number(colsArg || 4)
const data = fs.readFileSync(path.resolve(file)).toString('base64')

const cdp = await launch({ width: 800, height: 600, dpr: 1 })
process.on('uncaughtException', (e) => {
  close(cdp)
  console.error(e)
  process.exit(1)
})
try {
  await open(cdp, BASE_URL + 'favicon.png', 100, false) // a secure origin, for ImageDecoder
  const result = await evaluate(cdp, `(async () => {
    const dec = new ImageDecoder({ data: Uint8Array.from(atob(${JSON.stringify(data)}), c => c.charCodeAt(0)), type: 'image/webp' })
    await dec.tracks.ready
    const count = dec.tracks.selectedTrack.frameCount
    const idx = []
    for (let i = 0; i < count; i += ${step}) idx.push(i)
    const tw = 520, cols = ${cols}
    let th = 0
    const shots = []
    for (const i of idx) {
      const { image } = await dec.decode({ frameIndex: i })
      th = Math.round(tw * image.displayHeight / image.displayWidth)
      const c = new OffscreenCanvas(tw, th)
      c.getContext('2d').drawImage(image, 0, 0, tw, th)
      image.close()
      shots.push(c)
    }
    const rows = Math.ceil(shots.length / cols)
    const sheet = new OffscreenCanvas(cols * tw, rows * th)
    const g = sheet.getContext('2d')
    g.fillStyle = '#444'; g.fillRect(0, 0, sheet.width, sheet.height)
    shots.forEach((c, n) => g.drawImage(c, (n % cols) * tw, Math.floor(n / cols) * th))
    const blob = await sheet.convertToBlob({ type: 'image/png' })
    const buf = new Uint8Array(await blob.arrayBuffer())
    let s = ''
    for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000))
    return { count, idx, png: btoa(s) }
  })()`)
  const out = path.resolve(import.meta.dirname, 'out/contact.png')
  fs.writeFileSync(out, Buffer.from(result.png, 'base64'))
  console.log('frames', result.count, 'sampled', result.idx.join(','), '->', out)
}
finally {
  close(cdp)
}

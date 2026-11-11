# README media

The tools that make the pictures in `docs/images/readme/`: the stills (switcher, palettes, icons, scrollbar, typography, cursors) and the theme-switcher animation. Retake them when the playground or the logo changes. They are not part of the npm package (`files` only ships `dist`).

They drive a headless Chromium (Microsoft Edge by default) over the DevTools protocol, with no dependency to install. Node 22 or newer (they use the built-in `WebSocket`).

## Retaking the pictures

1. Build the playground and serve the **production** build (no DevTools button, no hot reload):

   ```bash
   pnpm dev:build
   PORT=3056 node playground/.output/server/index.mjs
   ```

2. Take the stills, all of them or some (`switcher`, `palettes`, `icons`, `sections`, `scrollbar`, `cursor-themes`):

   ```bash
   node scripts/readme-media/images.mjs
   node scripts/readme-media/images.mjs palettes scrollbar
   ```

3. Record the animation (`--limit=120` makes a 5-second test run; the real one takes a few minutes):

   ```bash
   node scripts/readme-media/record.mjs
   ```

4. Look at the result before using it. `contact.mjs` decodes an animated WebP like a browser does and writes a contact sheet of it:

   ```bash
   node scripts/readme-media/contact.mjs scripts/readme-media/out/theme-switcher.webp 64 3
   ```

5. Copy what you want from `out/` into `docs/images/readme/` (the stills are in `out/readme/`), and stop the server.

Everything lands in `out/`, which git ignores.

## Settings

| Variable | Default | What it is |
| --- | --- | --- |
| `EDGE_PATH` | Edge's Windows install path | Any Chromium-based browser |
| `PLAYGROUND_URL` | `http://127.0.0.1:3056/` | Where the production build is served |

The stills are 2766x1672 (a 1383x836 window at 2x); the animation is 1600x967 at 1x, 24 fps.

## How the animation gets 24 fps

Frames are taken on the browser's **virtual clock**: each one advances it by 1/24 s and then captures, so the motion is smooth however long a capture takes. The frames are stored as WebP **partial frames** (only the rectangle that changed since the one before), which keeps a cursor gliding over a still page almost free. The whole file averages 41.67 ms per frame (42, 42, 41 ms, as WebP stores whole milliseconds). `record.mjs` prints the frame count, the total duration and the fps it measured on the file, and decodes it back to compare some frames with the originals.

Headless screenshots have no mouse pointer, so the tools draw the page's own cursor (the module's custom ones, or the system arrow when the visitor turns them off) into the page.

## Things that bit before

- Jade takes its locale from the system. The tools click "English" after opening the page so the pictures are in English.
- A mouse event waits for the page's main thread, which a paused virtual clock never runs: it has to travel with the clock advance (`tick` in `rig.mjs`).
- The `clip` of `Page.captureScreenshot` is in page coordinates, not viewport ones.
- The demo scrollbar thumbs take a moment to paint: `images.mjs` waits before the scrollbar capture.
- Taking a theme chip's click right after a theme transition can lose it: `panelChip` in `images.mjs` checks that the chip became active and retries.
- When something throws, make sure the headless browser is gone (`record.mjs` closes it on errors; if a run is killed, look for leftover `msedge.exe` processes started with a `jade-edge-` profile).

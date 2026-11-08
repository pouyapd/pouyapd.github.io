// Renders a still of each lift (Tensile's technique module) from the same real-time shader the site runs
// (src/components/motion/lab/lifts.ts), at the top of the movement, where the live figure starts.
// Technique.tsx shows it until the live figure is drawn (the shader can take seconds to compile on a
// first visit). Transparent around the figure, so the stage's own gradient shows through, as behind the
// live canvas; wide (12:5), because the shader frames by height: shown with object-fit: cover on any
// narrower stage it lines up with the live picture.
// Usage: npm run render:lifts   → public/media/lifts/<lift>-<width>.webp (uses your installed Chrome with its GPU)
import path from 'node:path'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { chromium } from 'playwright-core'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'public/media/lifts')
const LIFTS = ['squat', 'bench', 'deadlift']
const WIDTHS = [960, 1680]

await mkdir(out, { recursive: true })
const tmp = path.join(root, 'node_modules/.render-lifts')
await mkdir(tmp, { recursive: true })
await writeFile(
  path.join(tmp, 'index.html'),
  `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}canvas{display:block;width:1200px;height:500px}</style>
  <canvas id="c"></canvas>
  <script type="module">
  import { createLifts } from '/src/components/motion/lab/lifts.ts'
  const c = document.getElementById('c')
  // the same context the module asks for, but keeping its pixels so they can be read back
  c.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true })
  const lift = new URLSearchParams(location.search).get('lift')
  const api = await createLifts(c, { lift })
  if (api) {
    api.hold(0)
    api.play(false)
  }
  window.__ok = !!api
  </script>`,
)
const server = await createServer({ root, configFile: false, logLevel: 'error', server: { port: 5192, strictPort: false } })
await server.listen()
const url = server.resolvedUrls?.local[0] ?? 'http://localhost:5192/'
const browser = await chromium.launch({ channel: process.env.OG_BROWSER_CHANNEL ?? 'chrome' })
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 500 }, deviceScaleFactor: 2 })
  for (const lift of LIFTS) {
    await page.goto(new URL(`node_modules/.render-lifts/index.html?lift=${lift}`, url).href, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => globalThis.__ok !== undefined, undefined, { timeout: 60000 }) // runs in the page
    if (!(await page.evaluate(() => globalThis.__ok))) throw new Error('WebGL did not start')
    await page.waitForTimeout(600)
    const png = Buffer.from((await page.evaluate(() => globalThis.document.getElementById('c').toDataURL('image/png'))).split(',')[1], 'base64')
    for (const w of WIDTHS) {
      await sharp(png).resize({ width: w }).webp({ quality: 82, alphaQuality: 90, effort: 6 }).toFile(path.join(out, `${lift}-${w}.webp`))
      console.log(`public/media/lifts/${lift}-${w}.webp written`)
    }
  }
} finally {
  await browser.close()
  await server.close()
  await rm(tmp, { recursive: true, force: true })
}

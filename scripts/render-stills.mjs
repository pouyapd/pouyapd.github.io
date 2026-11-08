// Renders the product stills of the Stella solitaire (Maison Aurel) from the same real-time shader the
// website runs (src/components/motion/lab/solitaire.ts): still frames on a dark studio ground, 1600 × 2000.
// Usage: npm run render:stella   (then `npm run assets`)  → tools/photos/aurel/out/stella-*.jpg
// They are renders, not photographs: they have no row in sources.tsv, and prepare.py (which grades src/) leaves them alone.
import path from 'node:path'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { chromium } from 'playwright-core'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'tools/photos/aurel/out')
const STILLS = [
  { name: 'stella-render', yaw: 0.62 },
  { name: 'stella-render-front', yaw: 0.02 },
]
const tmp = path.join(root, 'node_modules/.render-stills')
await mkdir(tmp, { recursive: true })
await writeFile(
  path.join(tmp, 'index.html'),
  `<!doctype html><meta charset="utf-8"><style>html,body{margin:0}
  .s{width:800px;height:1000px;position:relative;background:radial-gradient(70% 55% at 50% 42%,#2b2620,#14120f 62%,#0c0b09)}
  canvas{position:absolute;inset:0;width:100%;height:100%}</style>
  <div class="s"><canvas id="c"></canvas></div>
  <script type="module">
  import { createSolitaire } from '/src/components/motion/lab/solitaire.ts'
  const q = new URLSearchParams(location.search)
  window.__ok = !!(await createSolitaire(document.getElementById('c'), { metal: 'rose', still: true, yaw: Number(q.get('yaw')) }))
  </script>`,
)
const server = await createServer({ root, configFile: false, logLevel: 'error', server: { port: 5191, strictPort: false } })
await server.listen()
const url = server.resolvedUrls?.local[0] ?? 'http://localhost:5191/'
const browser = await chromium.launch({ channel: process.env.OG_BROWSER_CHANNEL ?? 'chrome', headless: false, args: ['--ignore-gpu-blocklist', '--window-position=-2400,0'] })
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 1000 }, deviceScaleFactor: 2 })
  for (const s of STILLS) {
    await page.goto(new URL(`node_modules/.render-stills/index.html?yaw=${s.yaw}`, url).href, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => globalThis.__ok !== undefined) // runs in the page
    if (!(await page.evaluate(() => globalThis.__ok))) throw new Error('WebGL did not start')
    await page.waitForTimeout(800)
    await page.locator('.s').screenshot({ path: path.join(out, `${s.name}.jpg`), type: 'jpeg', quality: 92 })
    console.log(`tools/photos/aurel/out/${s.name}.jpg written`)
  }
} finally {
  await browser.close()
  await server.close()
  await rm(tmp, { recursive: true, force: true })
}

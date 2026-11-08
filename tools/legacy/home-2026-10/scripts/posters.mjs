// Captures still frames of the real-time scenes, rendered by the site itself
// in its `?stage=poster` mode (a fixed, deterministic frame):
//   tools/posters/out/hero-desktop.png     the hero scene, 1440 x 900 @2x (landscape composition)
//   tools/posters/out/hero-mobile.png      the hero scene at 390 x 844 @3x (portrait composition)
//   tools/posters/out/screens-desktop.png  the three concept screens opening Selected Work, @2x
//   tools/posters/out/screens-mobile.png   the same band on a phone, @3x
//   tools/posters/out/drum.png             the kinetic type drum in the Motion & 3D service
//   tools/posters/out/site-<name>.png      the top of each live concept website (1440 px wide),
//                                          the textures of those screens (`npm run assets` crops them)
// They are the first paint and the fallbacks without motion, WebGL or JavaScript.
// Order after changing a concept website: posters → assets → posters (the screens still uses the new textures) → assets.
// Then `npm run assets` converts them. Uses your installed Chrome (with its GPU).
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { chromium } from 'playwright-core'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'tools/posters/out')
await mkdir(out, { recursive: true })
const server = await createServer({ root, server: { port: 5192, strictPort: false }, logLevel: 'error' })
await server.listen()
const base = server.resolvedUrls?.local[0] ?? 'http://localhost:5192/'
const browser = await chromium.launch({ channel: process.env.OG_BROWSER_CHANNEL ?? 'chrome', args: ['--ignore-gpu-blocklist'] })
// everything but the canvases is hidden for the capture
const HIDE = '.site-header, .hero__shade, .hero__inner, .hero__footer, .hero__poster, .work__stage-poster, .work__stage-cap, .drum__poster, .drum__label { visibility: hidden !important } .hero__canvas, .stage-canvas, .drum__canvas { opacity: 1 !important; transition: none !important } [data-reveal] { opacity: 1 !important; transform: none !important; clip-path: none !important }'

async function shoot(viewport, scale, selector, file, ready, scrollTo) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: scale })
  await page.goto(new URL('?stage=poster', base).href, { waitUntil: 'networkidle' })
  await page.addStyleTag({ content: HIDE })
  if (scrollTo) await page.evaluate((s) => globalThis.document.querySelector(s).scrollIntoView({ block: 'center' }), scrollTo) // runs in the page
  await page.waitForFunction((r) => globalThis.document.documentElement.dataset[r] === 'true', ready, { timeout: 30000 }) // runs in the page
  await page.waitForTimeout(600)
  await (await page.$(selector)).screenshot({ path: path.join(out, file) })
  await page.close()
  console.log(file)
}

/** the first screens of a live concept website, with its photographs loaded */
async function site(slug, name) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 })
  await page.goto(new URL(`work/${slug}/`, base).href, { waitUntil: 'networkidle' })
  await page.addStyleTag({ content: '.cx-bar { display: none !important } *, *::before, *::after { animation-play-state: paused !important; transition: none !important }' })
  await page.evaluate(async () => {
    for (let y = 0; y < 4800; y += 400) {
      globalThis.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 120))
    }
    globalThis.scrollTo(0, 0)
  })
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(out, `site-${name}.png`), clip: { x: 0, y: 0, width: 1440, height: 4760 }, fullPage: true })
  await page.close()
  console.log(`site-${name}.png`)
}

try {
  for (const [slug, name] of [['lune', 'lune'], ['maison-aurel', 'maison-aurel'], ['anar', 'anar']]) await site(slug, name)
  await shoot({ width: 1440, height: 900 }, 2, '.hero__canvas', 'hero-desktop.png', 'heroReady')
  await shoot({ width: 390, height: 844 }, 3, '.hero__canvas', 'hero-mobile.png', 'heroReady')
  await shoot({ width: 1440, height: 900 }, 2, '.work__stage .stage-canvas', 'screens-desktop.png', 'screensReady', '.work__stage')
  await shoot({ width: 390, height: 844 }, 3, '.work__stage .stage-canvas', 'screens-mobile.png', 'screensReady', '.work__stage')
  await shoot({ width: 1440, height: 900 }, 2, '.drum__canvas', 'drum.png', 'drumReady', '.drum')
} finally {
  await browser.close()
  await server.close()
}

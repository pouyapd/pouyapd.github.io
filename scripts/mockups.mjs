// Captures the concept-site mockups in tools/mockups/*.html as full-page images:
//   tools/mockups/out/<name>-desktop.png  (1440 px wide)
//   tools/mockups/out/<name>-mobile.png   (390 px wide @2x)
//   tools/mockups/out/<name>-desktop.json nav anchors: every nav item with a
//        data-target (its box and its section's top, as fractions of the page)
//   tools/mockups/out/<name>-shot-<id>-desktop.png  each [data-shot="<id>"] section on its own
//   tools/mockups/out/<name>-shot-<id>-mobile.png   one phone screen (390 x 844) from that section's top
// They use the graded photographs in tools/photos/*/out (python tools/photos/prepare.py)
// and, for Meridian, tools/references/out.
// Then `npm run assets` converts them for the site. Uses your installed Chrome.
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { chromium } from 'playwright-core'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'tools/mockups/out')
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ['maison-aurel', 'anar', 'lune', 'meridian']

await mkdir(out, { recursive: true })
const server = await createServer({ root, server: { port: 5191, strictPort: false }, logLevel: 'error' })
await server.listen()
const base = server.resolvedUrls?.local[0] ?? 'http://localhost:5191/'
const browser = await chromium.launch({ channel: process.env.OG_BROWSER_CHANNEL ?? 'chrome' })

try {
  for (const name of pages) {
    for (const [variant, viewport, scale] of [
      ['desktop', { width: 1440, height: 900 }, 1],
      ['mobile', { width: 390, height: 844 }, 2],
    ]) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: scale })
      await page.goto(new URL(`tools/mockups/${name}.html`, base).href, { waitUntil: 'networkidle' })
      await page.evaluate(() => globalThis.document.fonts.ready) // runs in the page
      await page.screenshot({ path: path.join(out, `${name}-${variant}.png`), fullPage: true })
      // runs in the page: each marked section's id and box
      const shots = await page.evaluate(() =>
        [...globalThis.document.querySelectorAll('[data-shot]')].map((el) => {
          const r = el.getBoundingClientRect()
          return { id: el.dataset.shot, x: r.x + globalThis.scrollX, y: r.y + globalThis.scrollY, width: r.width, height: r.height }
        }),
      )
      for (const s of shots) {
        // the opening section is taken from the top of the page, so it includes the navigation
        const top = s.id === 'hero' ? 0 : Math.round(s.y)
        const clip =
          variant === 'desktop'
            ? { x: 0, y: top, width: viewport.width, height: Math.round(s.y + s.height) - top }
            : { x: 0, y: top, width: viewport.width, height: viewport.height }
        await page.screenshot({ path: path.join(out, `${name}-shot-${s.id}-${variant}.png`), fullPage: true, clip })
      }
      if (variant === 'desktop') {
        // runs in the page: where each nav item sits and where its section starts
        const anchors = await page.evaluate(() => {
          const doc = globalThis.document
          const W = doc.documentElement.scrollWidth
          const H = doc.documentElement.scrollHeight
          return [...doc.querySelectorAll('[data-target]')].map((el) => {
            const r = el.getBoundingClientRect()
            const t = doc.querySelector(el.dataset.target)?.getBoundingClientRect().top ?? 0
            return { label: el.textContent.trim(), x: r.x / W, y: r.y / H, w: r.width / W, h: r.height / H, top: t / H }
          })
        })
        if (anchors.length) await writeFile(path.join(out, `${name}-desktop.json`), JSON.stringify(anchors, null, 1) + '\n')
      }
      await page.close()
      console.log(`${name}-${variant}.png`)
    }
  }
} finally {
  await browser.close()
  await server.close()
}

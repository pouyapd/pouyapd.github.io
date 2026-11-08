// Renders the social previews (1200×630): the studio's card, tools/og/og-card.html →
// tools/og/og-card.png, and one card per featured project, tools/og/og-project.html?slug=… →
// tools/og/og-<slug>.png (used by that project's website pages and case study).
// Uses the locally installed Chrome through playwright-core (no browser download).
// Usage: npm run og   (then `npm run assets` to write public/og-image.jpg and public/og/<slug>.jpg)
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { chromium } from 'playwright-core'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const server = await createServer({ root, server: { port: 5190, strictPort: false }, logLevel: 'error' })
await server.listen()
const url = server.resolvedUrls?.local[0] ?? 'http://localhost:5190/'

const browser = await chromium.launch({ channel: process.env.OG_BROWSER_CHANNEL ?? 'chrome' })
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  await page.goto(new URL('tools/og/og-card.html', url).href, { waitUntil: 'networkidle' })
  await page.evaluate(() => globalThis.document.fonts.ready) // runs in the page
  await page.screenshot({ path: path.join(root, 'tools/og/og-card.png') })
  console.log('tools/og/og-card.png written')

  const { sites } = await server.ssrLoadModule('/src/content/en/projects.ts')
  for (const site of sites.filter((s) => s.featured !== false)) {
    await page.goto(new URL(`tools/og/og-project.html?slug=${site.slug}`, url).href, { waitUntil: 'networkidle' })
    await page.waitForFunction(() => globalThis.__ready === true) // runs in the page
    await page.screenshot({ path: path.join(root, `tools/og/og-${site.slug}.png`) })
    console.log(`tools/og/og-${site.slug}.png written`)
  }
} finally {
  await browser.close()
  await server.close()
}

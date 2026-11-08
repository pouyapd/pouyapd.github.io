// Captures the built websites for Selected Work and the case studies:
//   tools/captures/out/live-<slug>-desktop.png            the whole home page of the website, 1440 px wide
//   tools/captures/out/live-<slug>-mobile.png             the same at 390 px (@2x)
//   tools/captures/out/live-<slug>-shot-<id>-desktop.png  one screen (1440 x 900) of a page in a given state
//   tools/captures/out/live-<slug>-shot-<id>-mobile.png   one phone screen (390 x 844 @2x)
// Then `npm run assets -- sites/live shots/live` converts them for the site.
//
// Usage: npm run build && node scripts/captures.mjs [slug ...]
// It serves dist/ with `vite preview`, so it captures exactly what is deployed. Uses your installed Chrome.
/* global document, scrollTo */ // used inside page.evaluate (the browser)
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { chromium } from 'playwright-core'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'tools/captures/out')

/** Sample details typed into forms for the captures (clearly fictional). */
const SAMPLE = { email: 'alex@example.com', first: 'Alex', last: 'Morgan', address: '12 Sample Street', postcode: '1011 AB', city: 'Amsterdam', country: 'Netherlands' }

async function fillCheckout(page) {
  for (const [k, v] of Object.entries(SAMPLE)) {
    if (k === 'country') await page.selectOption('#co-country', v)
    else await page.fill(`#co-${k}`, v)
  }
}

/**
 * Each website: the page captured in full, and the sections for its case study.
 * A shot is { id, path, at?: selector to bring to the top, prepare?: (page) => actions first }.
 */
const SITES = {
  'maison-aurel': {
    full: 'work/maison-aurel/',
    shots: [
      { id: 'hero', path: 'work/maison-aurel/' },
      { id: 'collection', path: 'work/maison-aurel/collection/' },
      { id: 'product', path: 'work/maison-aurel/pieces/ondine-stack/' },
      {
        id: 'bag',
        path: 'work/maison-aurel/pieces/ondine-stack/',
        prepare: async (p) => {
          await p.locator('.a-sizes button, .a-sizes label').first().click().catch(() => {})
          await p.getByRole('button', { name: /add to bag/i }).first().click()
          await p.waitForTimeout(500)
        },
      },
      {
        id: 'checkout',
        path: 'work/maison-aurel/checkout/',
        before: async (p) => {
          await p.goto(new URL('work/maison-aurel/pieces/ondine-stack/', p.base).href)
          await p.evaluate(() => localStorage.setItem('maison-aurel-bag', JSON.stringify([{ id: 'ondine-stack', options: { metal: 'yellow', size: 'M' }, qty: 1 }, { id: 'ovale-pendant', options: { metal: 'yellow' }, qty: 1 }])))
        },
        prepare: async (p) => {
          await fillCheckout(p)
          await p.getByRole('button', { name: /continue to delivery/i }).click()
          await p.waitForTimeout(300)
        },
      },
      { id: 'appointment', path: 'work/maison-aurel/', at: '#appointment' },
    ],
  },
  lune: {
    full: 'work/lune/',
    shots: [
      { id: 'hero', path: 'work/lune/' },
      { id: 'treatments', path: 'work/lune/', at: '#treatments' },
      { id: 'signature', path: 'work/lune/', at: '#signature' },
      { id: 'gallery', path: 'work/lune/', at: '#gallery' },
      {
        id: 'booking',
        path: 'work/lune/',
        prepare: async (p) => {
          await p.locator('.l-avail').click()
          await p.waitForTimeout(800)
        },
        at: '#book',
      },
      { id: 'shop', path: 'work/lune/shop/' },
      { id: 'product', path: 'work/lune/shop/water-serum/' },
      {
        id: 'checkout',
        path: 'work/lune/checkout/',
        before: async (p) => {
          await p.goto(new URL('work/lune/shop/', p.base).href)
          await p.evaluate(() => localStorage.setItem('lune-bag', JSON.stringify([{ id: 'water-serum', options: { size: '30 ml' }, qty: 1 }, { id: 'gloss-oil', options: { size: '50 ml' }, qty: 1 }])))
        },
        prepare: async (p) => {
          await fillCheckout(p)
          await p.getByRole('button', { name: /continue to delivery/i }).click()
          await p.waitForTimeout(300)
        },
      },
    ],
  },
  tensile: {
    full: 'work/tensile/',
    shots: [
      { id: 'hero', path: 'work/tensile/' },
      { id: 'timetable', path: 'work/tensile/classes/', at: '.t-timetable' },
      {
        id: 'class',
        path: 'work/tensile/classes/',
        prepare: async (p) => {
          await p.locator('.t-session__btn').nth(3).click()
          await p.waitForTimeout(600)
        },
      },
      { id: 'memberships', path: 'work/tensile/memberships/' },
      { id: 'compare', path: 'work/tensile/memberships/', at: '#compare' },
      {
        id: 'trial',
        path: 'work/tensile/trial/',
        prepare: async (p) => {
          await p.locator('.t-cards label').first().click()
          await p.getByRole('button', { name: /^continue$/i }).click()
          await p.waitForTimeout(300)
        },
        at: '.t-trial',
      },
    ],
  },
  'p-design': {
    full: 'work/p-design/',
    shots: [
      { id: 'hero', path: '' },
      { id: 'work', path: '', at: '#work' },
      { id: 'mark', path: 'work/p-design/', at: '#mark .pd-figure' },
      { id: 'colour', path: 'work/p-design/', at: '#colour' },
      { id: 'lime', path: 'work/p-design/', at: '#lime' },
    ],
  },
  anar: {
    full: 'work/anar/',
    shots: [
      { id: 'hero', path: 'work/anar/' },
      { id: 'menu', path: 'work/anar/menu/' },
      { id: 'reserve', path: 'work/anar/', at: '#reserve' },
    ],
  },
}

const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
}

/** Scroll through the page so deferred images attach and load, then return to the top. */
async function settle(page) {
  await page.evaluate(() => document.fonts.ready)
  const h = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < h; y += 700) {
    await page.evaluate((yy) => scrollTo(0, yy), y)
    await page.waitForTimeout(90)
  }
  await page.evaluate(() => scrollTo(0, 0))
  await page.waitForLoadState('networkidle')
  await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 15000 }).catch(() => {})
  await page.waitForTimeout(400)
}

/** Bring a section to the top of the screen; sticky headers are unpinned first, so they never sit half-scrolled over it. */
async function bringToTop(page, selector) {
  await page.addStyleTag({ content: '.site-header, .l-header, .a-header, .t-header, .n-header, .pd-top { position: static !important; transform: none !important; }' })
  await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: 'start' }), selector)
  await page.waitForTimeout(500)
}

const only = process.argv.slice(2)
await mkdir(out, { recursive: true })
const server = await preview({ root, preview: { port: 4321, strictPort: false }, logLevel: 'error' })
const base = server.resolvedUrls.local[0]
const browser = await chromium.launch({ channel: process.env.OG_BROWSER_CHANNEL ?? 'chrome' })

try {
  for (const [slug, spec] of Object.entries(SITES)) {
    if (only.length && !only.includes(slug)) continue
    for (const [variant, options] of Object.entries(VIEWPORTS)) {
      const ctx = await browser.newContext({ ...options, reducedMotion: 'reduce' })
      const page = await ctx.newPage()
      page.base = base
      await page.goto(new URL(spec.full, base).href, { waitUntil: 'networkidle' })
      await settle(page)
      await page.screenshot({ path: path.join(out, `live-${slug}-${variant}.png`), fullPage: true })
      for (const shot of spec.shots) {
        if (shot.before) await shot.before(page)
        await page.goto(new URL(shot.path, base).href, { waitUntil: 'networkidle' })
        await settle(page)
        if (shot.prepare) await shot.prepare(page)
        if (shot.at) await bringToTop(page, shot.at)
        await page.waitForTimeout(300)
        await page.screenshot({ path: path.join(out, `live-${slug}-shot-${shot.id}-${variant}.png`) })
        await page.evaluate(() => localStorage.clear())
      }
      await ctx.close()
      console.log(`live-${slug}-${variant}`)
    }
  }
} finally {
  await browser.close()
  await new Promise((r) => server.httpServer.close(r))
}

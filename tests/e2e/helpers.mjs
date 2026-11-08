// Shared set-up for the browser tests (tests/e2e/*.test.mjs, run by scripts/test-e2e.mjs).
// They drive the built site in Chrome through playwright-core: no test framework beyond node:test.
import { readFileSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

/** The served build (scripts/test-e2e.mjs starts `vite preview` and sets it). */
export const BASE = process.env.E2E_BASE ?? 'http://localhost:4173/'

/** Every page built into dist/ (index.html files), as paths under BASE ('' is the home page). */
export function builtPaths() {
  const out = []
  const walk = (dir, rel) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(path.join(dir, e.name), `${rel}${e.name}/`)
      else if (e.name === 'index.html') out.push(rel)
    }
  }
  walk(path.join(root, 'dist'), '')
  return out.sort()
}

/** Every page in the built sitemap, as paths under BASE ('' is the home page). */
export function sitemapPaths() {
  const xml = readFileSync(path.join(root, 'dist/sitemap.xml'), 'utf8')
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)
  const base = new URL(BASE).pathname
  return locs.map((p) => p.slice(base.length))
}

export const PHONE = { width: 390, height: 844 }
export const DESKTOP = { width: 1440, height: 900 }

/** Chrome (installed, `channel: 'chrome'`, or E2E_CHANNEL), headless unless E2E_HEADED is set. */
export function launch() {
  return chromium.launch({ channel: process.env.E2E_CHANNEL ?? 'chrome', headless: !process.env.E2E_HEADED })
}

/**
 * A page that records console errors, uncaught exceptions and failed requests;
 * `page.problems()` returns them. `reducedMotion` emulates the user preference.
 */
export async function open(browser, url = '', { viewport = DESKTOP, reducedMotion = 'no-preference', permissions = [], bypassCSP = false } = {}) {
  const context = await browser.newContext({ viewport, reducedMotion, permissions, bypassCSP })
  const page = await context.newPage()
  const problems = []
  page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`))
  page.on('pageerror', (e) => problems.push(`exception: ${e.message}`))
  page.on('requestfailed', (r) => problems.push(`request failed: ${r.url()} (${r.failure()?.errorText})`))
  page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()}: ${r.url()}`))
  page.problems = () => problems
  await page.goto(BASE + url, { waitUntil: 'load' })
  return page
}

/** Scrolls an element's top to `offset` px below the top of the viewport and lets scroll-linked work settle. */
export async function scrollToElement(page, selector, offset = 0, settle = 400) {
  await page.evaluate(
    ([s, o]) => {
      const el = document.querySelector(s)
      window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - o)
    },
    [selector, offset],
  )
  await page.waitForTimeout(settle)
}

/** Glides the page by `dy` in small wheel-sized steps, as a visitor would. */
export async function glide(page, dy, steps = 8, pause = 40) {
  for (let i = 0; i < steps; i++) {
    await page.evaluate((d) => window.scrollBy(0, d), dy / steps)
    await page.waitForTimeout(pause)
  }
}

/** Waits until `fn` (run in the page) returns a truthy value, or fails after `timeout` ms. */
export async function until(page, fn, arg, timeout = 5000) {
  await page.waitForFunction(fn, arg, { timeout, polling: 50 })
}

const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')

/**
 * Runs axe-core (WCAG 2.0–2.2 A and AA rules) on the page and returns the violations. axe is injected as an
 * inline script, which the site's Content-Security-Policy blocks: open the page with `bypassCSP: true`.
 */
export async function axe(page, exclude = []) {
  await page.addScriptTag({ content: axeSource })
  return page.evaluate(
    async (ex) =>
      (
        await window.axe.run(
          { exclude: ex.map((s) => [s]) },
          { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] },
        )
      ).violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 4).map((n) => n.target.join(' ')) })),
    exclude,
  )
}

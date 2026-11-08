// Every built page: loads without errors, one <h1>, no sideways scrolling; the home page at the nine
// reference sizes; search metadata; and axe-core accessibility checks (WCAG 2.2 A/AA rules).
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { after, before, describe, test } from 'node:test'
import { BASE, DESKTOP, PHONE, axe, builtPaths, launch, open, sitemapPaths } from './helpers.mjs'

/** Pages that are built but deliberately not in the sitemap (marked noindex): the demo checkouts and the concept shops' product pages. */
const UNLISTED = builtPaths().filter((p) => /checkout\/$|^work\/maison-aurel\/pieces\/[^/]+\/$|^work\/lune\/shop\/[^/]+\/$/.test(p))
const SIZES = [
  [320, 720], [360, 780], [375, 812], [390, 844], [430, 932], [640, 960], [768, 1024], [1024, 768], [1280, 800], [1440, 900], [1920, 1080],
  // phones on their side
  [844, 390], [932, 430],
]

let browser
before(async () => (browser = await launch()))
after(() => browser?.close())

/** Walks to the bottom so lazy images, reveals and scroll-linked pieces have all run. */
async function walk(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight * 0.8) {
      scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 90))
    }
  })
  await page.waitForTimeout(300)
}

const overflow = (page) =>
  page.evaluate(() => {
    const vw = document.documentElement.clientWidth
    return document.documentElement.scrollWidth > vw ? `page is ${document.documentElement.scrollWidth}px wide in a ${vw}px viewport` : null
  })

describe('every page', () => {
  // every page that is built, listed in the sitemap or not
  const pages = builtPaths()
  // the narrowest phone too: a fixed minimum anywhere shows up first at 320 px
  for (const viewport of [{ width: 320, height: 720 }, PHONE, DESKTOP]) {
    test(`loads cleanly, with one <h1> and no sideways scrolling (${pages.length} pages, ${viewport.width}px)`, async () => {
      const context = await browser.newContext({ viewport })
      const failures = []
      for (const path of pages) {
        const page = await context.newPage()
        const problems = []
        page.on('console', (m) => m.type() === 'error' && problems.push(m.text()))
        page.on('pageerror', (e) => problems.push(e.message))
        page.on('response', (r) => r.status() >= 400 && problems.push(`HTTP ${r.status()} ${r.url()}`))
        const res = await page.goto(BASE + path, { waitUntil: 'load' })
        if (res.status() !== 200) problems.push(`status ${res.status()}`)
        await walk(page)
        const h1 = await page.$$eval('h1', (h) => h.length)
        if (h1 !== 1) problems.push(`${h1} <h1> elements`)
        const wide = await overflow(page)
        if (wide) problems.push(wide)
        if (problems.length) failures.push(`/${path}: ${problems.join('; ')}`)
        await page.close()
      }
      await context.close()
      assert.deepEqual(failures, [])
    })
  }

  test('an image waiting to load never shows as a broken image (no src yet: hidden, size kept)', async () => {
    for (const viewport of [PHONE, DESKTOP]) {
      const page = await open(browser, '', { viewport })
      const shown = await page.$$eval('img:not([src])', (is) => is.filter((i) => getComputedStyle(i).visibility !== 'hidden').length)
      const waiting = await page.$$eval('img:not([src])', (is) => is.length)
      assert.ok(waiting > 0, 'some images are deferred on load (the check is meaningful)')
      assert.equal(shown, 0, `${shown} sourceless images are visible`)
      await page.context().close()
    }
  })

  test('the Content-Security-Policy is enforced: an injected inline script is blocked, the site runs', async () => {
    for (const path of ['', 'work/tensile/', 'work/lune/case-study/']) {
      const page = await open(browser, path, { viewport: DESKTOP })
      const result = await page.evaluate(() => new Promise((resolve) => {
        const violations = []
        document.addEventListener('securitypolicyviolation', (e) => violations.push(e.violatedDirective))
        const s = document.createElement('script')
        s.textContent = 'window.__injected = true'
        document.head.append(s)
        setTimeout(() => resolve({ ran: window.__injected === true, violations, js: document.documentElement.classList.contains('js') }), 300)
      }))
      assert.equal(result.ran, false, `/${path}: the injected script must not run`)
      assert.ok(result.violations.some((d) => d.startsWith('script-src')), `/${path}: the browser reports the blocked script`)
      assert.ok(result.js, `/${path}: the page's own inline script ran (its hash is allowed)`)
      // the blocked injection is the only violation: nothing the site itself loads breaks the policy
      assert.deepEqual(page.problems().filter((p) => !/Content Security Policy|__injected/.test(p)), [])
      await page.context().close()
    }
  })

  test('a shared link with a malformed #escape still opens the page', async () => {
    for (const path of ['work/lune/#%E0%A4%A', 'work/maison-aurel/collection/#%', '#%E0%A4%A']) {
      const page = await open(browser, path, { viewport: PHONE })
      await page.waitForTimeout(500)
      assert.equal(await page.$$eval('h1', (h) => h.length), 1, `/${path} renders`)
      assert.deepEqual(page.problems(), [])
      await page.context().close()
    }
  })

  test('the 404 page is marked noindex and leads home', async () => {
    const page = await open(browser, '404.html', { viewport: PHONE })
    assert.equal(await page.getAttribute('meta[name="robots"]', 'content'), 'noindex')
    const links = await page.$$eval('main a', (as) => as.map((a) => new URL(a.href).pathname))
    assert.ok(links.includes(new URL(BASE).pathname), 'a link back to the home page')
    await page.context().close()
  })
})

describe('home page at every reference size', () => {
  for (const [width, height] of SIZES) {
    test(`${width} × ${height}: no sideways scrolling, nothing cut off, controls large enough to tap`, async () => {
      const page = await open(browser, '', { viewport: { width, height } })
      await walk(page)
      assert.equal(await overflow(page), null)
      // text blocks never run past the edge of the screen (cards in the Lune ring may, behind the stage edge)
      const cut = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth
        return [...document.querySelectorAll('main h1, main h2, main h3, main p, main a, main button')]
          .filter((e) => !e.closest('.orbit__stage, .assemble, .browser, .phone, .tech__browser, [aria-hidden="true"]'))
          .filter((e) => {
            const r = e.getBoundingClientRect()
            return r.width > 0 && (r.left < -1 || r.right > vw + 1)
          })
          .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]}`)
      })
      assert.deepEqual(cut, [])
      // WCAG 2.5.8: targets at least 24 × 24 px (inline text links are exempt)
      const small = await page.evaluate(() =>
        [...document.querySelectorAll('header a, header button, main button, .case__cta, .case__notes, .contact a, .btn')]
          .filter((e) => {
            const r = e.getBoundingClientRect()
            return r.width > 0 && getComputedStyle(e).visibility !== 'hidden' && (r.width < 24 || r.height < 24)
          })
          .map((e) => `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]} "${e.textContent.trim().slice(0, 20)}"`),
      )
      assert.deepEqual(small, [])
      assert.deepEqual(page.problems(), [])
      await page.context().close()
    })
  }
})

describe('search metadata', () => {
  test('each listed page has a unique title, a description, a canonical URL and Open Graph tags', async () => {
    const titles = new Map()
    for (const path of sitemapPaths()) {
      const html = readFileSync(new URL(`../../dist/${path}index.html`, import.meta.url), 'utf8')
      const title = html.match(/<title>([^<]+)<\/title>/)?.[1]
      assert.ok(title, `/${path} has a title`)
      assert.ok(!titles.has(title), `/${path} repeats the title of /${titles.get(title)}`)
      titles.set(title, path)
      assert.match(html, /<meta name="description" content="[^"]{50,}"/, `/${path} description`)
      assert.match(html, new RegExp(`<link rel="canonical" href="[^"]*/${path}">`), `/${path} canonical`)
      assert.match(html, /<meta property="og:image" content="https?:\/\/[^"]+">/, `/${path} og:image`)
      assert.doesNotMatch(html, /name="robots" content="noindex"/, `/${path} is listed, so it must be indexable`)
    }
    // a featured project's website and case study share its own social card; it exists
    for (const slug of ['maison-aurel', 'lune', 'anar', 'tensile']) {
      for (const path of [`work/${slug}/`, `work/${slug}/case-study/`]) {
        const html = readFileSync(new URL(`../../dist/${path}index.html`, import.meta.url), 'utf8')
        const og = html.match(/<meta property="og:image" content="([^"]+)">/)?.[1] ?? ''
        assert.ok(og.endsWith(`/og/${slug}.jpg`), `/${path} uses its project's card (${og})`)
        assert.equal((await fetch(new URL(`og/${slug}.jpg`, BASE))).status, 200)
      }
    }
    for (const path of UNLISTED) {
      const html = readFileSync(new URL(`../../dist/${path}index.html`, import.meta.url), 'utf8')
      assert.match(html, /<meta name="robots" content="noindex">/, `/${path} is kept out of search`)
    }
  })
})

describe('accessibility (axe-core)', () => {
  const PAGES = [
    '',
    'work/maison-aurel/',
    'work/maison-aurel/pieces/stella-solitaire/',
    'work/lune/',
    'work/lune/shop/',
    'work/lune/shop/night-oil/',
    'work/anar/menu/',
    'work/tensile/',
    'work/tensile/trial/',
    'work/p-design/',
    'work/maison-aurel/case-study/',
    'work/lune/case-study/',
    'work/anar/case-study/',
    'work/tensile/case-study/',
    '404.html',
  ]
  for (const viewport of [DESKTOP, PHONE]) {
    test(`no WCAG A/AA violations on ${PAGES.length} representative pages (${viewport.width}px)`, async () => {
      const found = []
      for (const path of PAGES) {
        const page = await open(browser, path, { viewport, reducedMotion: 'reduce', bypassCSP: true })
        await walk(page)
        for (const v of await axe(page)) found.push(`/${path} ${v.id} (${v.impact}): ${v.nodes.join(', ')}`)
        await page.context().close()
      }
      assert.deepEqual(found, [])
    })
  }
})

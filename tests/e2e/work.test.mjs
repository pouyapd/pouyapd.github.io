// Selected Work: the four projects and their presentations — Maison Aurel (ring), Lune Atelier (orbit),
// Anar Dining Room (assemble) and Tensile Athletic Club (website + live 3D technique module).
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { BASE, DESKTOP, PHONE, glide, launch, open, scrollToElement, until } from './helpers.mjs'
import { createRequire } from 'node:module'

const sharp = createRequire(import.meta.url)('sharp')

const PROJECTS = [
  { slug: 'maison-aurel', title: 'Maison Aurel', style: 'ring' },
  { slug: 'lune', title: 'Lune Atelier', style: 'orbit' },
  { slug: 'anar', title: 'Anar Dining Room', style: 'assemble' },
  { slug: 'tensile', title: 'Tensile Athletic Club', style: 'technique' },
]

let browser
before(async () => (browser = await launch()))
after(() => browser?.close())

/** All images inside `selector` have loaded and are drawn at the proportions of their files (object-fit aside). */
async function imagesLoaded(page, selector) {
  await until(page, (s) => [...document.querySelectorAll(`${s} img`)].every((i) => i.complete && i.naturalWidth > 0), selector, 10000)
}

describe('the four projects', () => {
  test('appear in order with their names, a summary, and working links to the website and the case study', async () => {
    const page = await open(browser, '', { viewport: DESKTOP })
    const cases = await page.$$eval('.work__cases > .case', (els) =>
      els.map((e) => ({
        cls: e.className,
        title: e.querySelector('.case__title .visually-hidden')?.textContent.trim(),
        summary: e.querySelector('.case__summary')?.textContent.trim() ?? '',
        site: e.querySelector('.case__cta')?.getAttribute('href'),
        notes: e.querySelector('.case__notes')?.getAttribute('href'),
      })),
    )
    assert.equal(cases.length, 4, 'four projects, and no others')
    for (const [i, p] of PROJECTS.entries()) {
      const c = cases[i]
      assert.match(c.cls, new RegExp(`case--${p.style}`))
      assert.equal(c.title, p.title)
      assert.ok(c.summary.length > 40, `${p.title} has a summary`)
      assert.match(c.site, new RegExp(`/work/${p.slug}/$`))
      assert.match(c.notes, new RegExp(`/work/${p.slug}/case-study/$`))
      for (const href of [c.site, c.notes]) assert.equal((await fetch(new URL(href, BASE))).status, 200, `${href} is served`)
    }
    await page.context().close()
  })
})

describe('Maison Aurel — ring', () => {
  test('the website leads, the 3D ring is a smaller accent that renders and turns, and no price is shown', async () => {
    const page = await open(browser, '', { viewport: DESKTOP })
    await scrollToElement(page, '.case--ring', 80, 300)
    await until(page, () => document.querySelector('.ring__scene')?.dataset.state === 'live', undefined, 10000)
    await imagesLoaded(page, '.case--ring .case__devices')
    const area = (s) => page.$eval(s, (e) => e.getBoundingClientRect().width * e.getBoundingClientRect().height)
    assert.ok((await area('.case--ring .case__browser')) > 1.5 * (await area('.ring__canvas')), 'the browser preview is the larger element')
    // the ring turns on its own: two frames a moment apart differ
    const a = await page.locator('.ring__canvas').screenshot()
    await page.waitForTimeout(700)
    const b = await page.locator('.ring__canvas').screenshot()
    assert.notDeepEqual(a, b, 'the ring is turning')
    const text = await page.textContent('.case--ring')
    assert.doesNotMatch(text, /€|\$|£|\b\d{1,3}[.,]\d{3}\b/, 'no price in the portfolio card')
    assert.deepEqual(page.problems(), [])
    await page.context().close()
  })
})

describe('Maison Aurel — the ring beside the website', () => {
  // the browser and phone stand in front of the ring for depth, but only its lowest edge may go behind them
  for (const viewport of [{ width: 320, height: 720 }, PHONE, { width: 1024, height: 768 }, DESKTOP]) {
    test(`${viewport.width}px: nearly the whole ring stays in view (at most 12 % of it behind the devices)`, async () => {
      const page = await open(browser, '', { viewport })
      await scrollToElement(page, '.case--ring', 20, 300)
      await until(page, () => document.querySelector('.ring__scene')?.dataset.state === 'live', undefined, 20000)
      // find the ring's own pixels: everything else hidden, on black
      await page.addStyleTag({ content: '.case--ring .case__devices, .ring__light { visibility: hidden !important } .case--ring { background: #000 !important }' })
      await page.waitForTimeout(600)
      const box = await page.locator('.ring__canvas').boundingBox()
      const { data, info } = await sharp(await page.screenshot({ clip: box })).raw().toBuffer({ resolveWithObject: true })
      const front = await page.evaluate(() => ['.case--ring .case__browser', '.case--ring .case__phone'].map((q) => {
        const r = document.querySelector(q).getBoundingClientRect()
        return [r.left, r.top, r.right, r.bottom]
      }))
      let ring = 0
      let behind = 0
      for (let y = 0; y < info.height; y++) {
        for (let x = 0; x < info.width; x++) {
          const i = (y * info.width + x) * info.channels
          if (Math.max(data[i], data[i + 1], data[i + 2]) < 60) continue
          ring++
          const px = box.x + (x * box.width) / info.width
          const py = box.y + (y * box.height) / info.height
          if (front.some(([l, t, r, b]) => px >= l && px <= r && py >= t && py <= b)) behind++
        }
      }
      assert.ok(ring > 500, `the ring is drawn (${ring} px)`)
      assert.ok(behind / ring <= 0.12, `${((100 * behind) / ring).toFixed(1)} % of the ring is behind the browser or phone`)
      await page.context().close()
    })
  }
})

describe('Maison Aurel — its own website', () => {
  test('without WebGL the ring stage shows a still of the Stella ring, not an empty square', async () => {
    const context = await browser.newContext({ viewport: DESKTOP })
    await context.addInitScript(() => {
      const real = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        return /webgl/.test(type) ? null : real.call(this, type, ...rest)
      }
    })
    const page = await context.newPage()
    await page.goto(BASE + 'work/maison-aurel/', { waitUntil: 'load' })
    await scrollToElement(page, '.a-feature', 40)
    await until(page, () => document.querySelector('.a-3d')?.dataset.state === 'failed', undefined, 10000)
    await until(page, () => document.querySelector('.a-3d__still img')?.complete, undefined, 10000)
    const still = await page.$eval('.a-3d__still img', (i) => ({ w: i.naturalWidth, h: i.getBoundingClientRect().height, opacity: getComputedStyle(i.closest('.a-3d__still')).opacity }))
    assert.ok(still.w > 0 && still.h > 200 && still.opacity === '1', JSON.stringify(still))
    await context.close()
  })
})

describe('Lune Atelier — orbit', () => {
  /** The card nearest the front of the ring (the one a visitor would tap). */
  const frontCard = (page) =>
    page.$$eval('.orbit__card', (cards) => cards.map((c) => Number(c.style.zIndex)).reduce((best, z, i, all) => (z > all[best] ? i : best), 0))
  /** Clicks the front card where it is, as a pointer would (the ring never stops moving), and returns the chosen index. */
  const chooseFront = async (page) => {
    const i = await frontCard(page)
    const box = await page.locator(`.orbit__card:nth-child(${i + 1})`).boundingBox()
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
    await until(page, () => document.querySelector('.orbit__card[aria-pressed="true"]'))
    return page.$$eval('.orbit__card', (cs) => cs.findIndex((c) => c.getAttribute('aria-pressed') === 'true'))
  }
  const scaleOf = (page, i) =>
    page.$eval(`.orbit__card:nth-child(${i + 1})`, (c) => {
      const m = new DOMMatrix(getComputedStyle(c).transform)
      return Math.hypot(m.m11, m.m12, m.m13)
    })

  for (const viewport of [DESKTOP, PHONE]) {
    test(`six salon pages at phone proportions; choose one, scroll on, and it eases back into the turning ring (${viewport.width}px)`, async () => {
      const page = await open(browser, '', { viewport })
      await scrollToElement(page, '.orbit', 40)
      await imagesLoaded(page, '.orbit__stage')
      const cards = await page.$$eval('.orbit__card', (cs) => cs.map((c) => ({ ratio: c.offsetWidth / c.offsetHeight, img: c.querySelector('img')?.getAttribute('src') ?? '' })))
      assert.equal(cards.length, 6)
      for (const c of cards) {
        assert.ok(Math.abs(c.ratio - 390 / 844) < 0.02, `a card keeps the phone capture's proportions (${c.ratio.toFixed(3)})`)
        assert.match(c.img, /lune-shot-/, 'each card shows a capture of the Lune website')
      }
      assert.equal(await page.$$eval('.orbit button, .orbit a', (els) => els.filter((e) => /^\s*back\b/i.test(e.textContent)).length), 0, 'no Back control')

      // the ring turns while nothing is chosen
      const t0 = await page.$eval('.orbit__card', (c) => c.style.transform)
      await page.waitForTimeout(500)
      assert.notEqual(await page.$eval('.orbit__card', (c) => c.style.transform), t0, 'the ring turns on its own')

      for (const dir of [1, -1]) {
        const i = await chooseFront(page)
        await until(page, (n) => {
          const m = new DOMMatrix(getComputedStyle(document.querySelector(`.orbit__card:nth-child(${n + 1})`)).transform)
          return Math.hypot(m.m11, m.m12, m.m13) > 1.15
        }, i)
        const label = await page.textContent('.orbit__now')
        const open_ = await page.getAttribute('.orbit__do a', 'href')
        assert.ok(open_?.includes('/work/lune/'), `“Open this page” leads into the Lune website (${open_})`)
        assert.ok(label.length > 8)
        // the chosen card holds while the page is still, then lets go once the page scrolls on (down, then up)
        await page.waitForTimeout(600)
        assert.equal(await page.getAttribute(`.orbit__card:nth-child(${i + 1})`, 'aria-pressed'), 'true', 'it stays forward while the page is still')
        await glide(page, 140 * dir, 6, 50)
        await until(page, () => [...document.querySelectorAll('.orbit__card')].every((c) => c.getAttribute('aria-pressed') === 'false'))
        await until(page, (n) => {
          const m = new DOMMatrix(getComputedStyle(document.querySelector(`.orbit__card:nth-child(${n + 1})`)).transform)
          return Math.hypot(m.m11, m.m12, m.m13) < 1.02
        }, i, 4000)
        assert.ok((await scaleOf(page, i)) < 1.02, 'the card is back to its size in the ring')
        await scrollToElement(page, '.orbit', 40, 300)
      }

      // Escape also lets go, and focus stays on the card
      const i = await chooseFront(page)
      await page.keyboard.press('Escape')
      await until(page, (n) => document.querySelector(`.orbit__card:nth-child(${n + 1})`).getAttribute('aria-pressed') === 'false', i)
      assert.deepEqual(page.problems(), [])
      await page.context().close()
    })
  }

  test('keyboard: Enter on a card brings it forward; the six pages are also plain links', async () => {
    const page = await open(browser, '', { viewport: DESKTOP })
    await scrollToElement(page, '.orbit', 40)
    await page.focus('.orbit__card:nth-child(3)')
    await page.keyboard.press('Enter')
    assert.equal(await page.getAttribute('.orbit__card:nth-child(3)', 'aria-pressed'), 'true')
    const links = await page.$$eval('.orbit__pages a', (as) => as.map((a) => a.getAttribute('href')))
    assert.equal(links.length, 6)
    for (const href of links) assert.equal((await fetch(new URL(href, BASE))).status, 200, `${href} is served`)
    await page.context().close()
  })

  test('with reduced motion the ring holds still, and a chosen card still comes forward', async () => {
    const page = await open(browser, '', { viewport: DESKTOP, reducedMotion: 'reduce' })
    await scrollToElement(page, '.orbit', 40)
    const t0 = await page.$eval('.orbit__card', (c) => c.style.transform)
    await page.waitForTimeout(500)
    assert.equal(await page.$eval('.orbit__card', (c) => c.style.transform), t0)
    await page.click('.orbit__card:nth-child(1)')
    await until(page, () => new DOMMatrix(getComputedStyle(document.querySelector('.orbit__card')).transform).m11 > 1.15)
    await page.context().close()
  })
})

describe('Anar Dining Room — assemble', () => {
  const landed = (page) => page.$$eval('.assemble__card', (cs) => cs.map((c) => c.dataset.landed))

  for (const viewport of [DESKTOP, PHONE]) {
    test(`the scattered pages assemble with the scroll, both ways, into a browser and a phone (${viewport.width}px)`, async () => {
      const page = await open(browser, '', { viewport })
      await scrollToElement(page, '.assemble__track', 0, 600)
      assert.ok((await landed(page)).every((l) => l !== 'true'), 'scattered at the start of the track')
      // scroll through the held composition in wheel-sized steps
      const travel = await page.$eval('.assemble__track', (t) => t.offsetHeight - innerHeight)
      await glide(page, travel, 30, 30)
      await until(page, () => [...document.querySelectorAll('.assemble__card')].every((c) => c.dataset.landed === 'true'), undefined, 6000)
      // the composition stays held on screen while it assembles
      const pin = await page.$eval('.assemble', (e) => e.getBoundingClientRect())
      assert.ok(pin.top >= 0 && pin.bottom <= viewport.height, 'the composition is on screen')
      // the phone captures sit inside the phone, at the capture's proportions
      const fit = await page.evaluate(() => {
        const f = document.querySelector('.assemble__phone').getBoundingClientRect()
        return [...document.querySelectorAll('.assemble__card--phone')].map((c) => {
          const r = c.getBoundingClientRect()
          return { inside: r.left >= f.left && r.right <= f.right && r.top >= f.top && r.bottom <= f.bottom, ratio: r.width / r.height }
        })
      })
      for (const f of fit) {
        assert.ok(f.inside, 'the phone capture is inside the phone frame')
        assert.ok(Math.abs(f.ratio - 390 / 844) < 0.02, `phone capture ratio ${f.ratio.toFixed(3)}`)
      }
      // and back up: it comes apart again
      await glide(page, -travel, 30, 30)
      await until(page, () => [...document.querySelectorAll('.assemble__card')].every((c) => c.dataset.landed !== 'true'), undefined, 6000)
      assert.deepEqual(page.problems(), [])
      await page.context().close()
    })
  }

  test('with reduced motion the finished picture is shown, not held', async () => {
    const page = await open(browser, '', { viewport: DESKTOP, reducedMotion: 'reduce' })
    await scrollToElement(page, '.assemble__track', 0, 300)
    assert.ok((await landed(page)).every((l) => l === 'true'))
    await page.context().close()
  })
})

describe('Tensile Athletic Club — website and live technique module', () => {
  for (const viewport of [DESKTOP, PHONE]) {
    test(`shows the real website and runs the 3D lifts: lift tabs, pause and play, the range, drag to turn (${viewport.width}px)`, async () => {
      const page = await open(browser, '', { viewport })
      await scrollToElement(page, '.case--technique', 40)
      await imagesLoaded(page, '.tech__site')
      assert.equal(await page.$$eval('.tech__pages a', (as) => as.length), 3, 'three more pages of the website')
      await scrollToElement(page, '.tech__demo', 40)
      await until(page, () => document.querySelector('.tq')?.dataset.state === 'live', undefined, 10000)

      // the lifts: each tab shows its own cues; arrow keys move between tabs
      const cues = async () => page.textContent('.tq__cues')
      const squat = await cues()
      await page.click('.tq__tab:has-text("Bench press")')
      assert.equal(await page.getAttribute('.tq__tab:has-text("Bench press")', 'aria-selected'), 'true')
      assert.notEqual(await cues(), squat)
      assert.match(await page.getAttribute('.tq__canvas', 'aria-label'), /bench press/)
      await page.keyboard.press('ArrowRight')
      assert.equal(await page.evaluate(() => document.activeElement.textContent), '03Deadlift')
      assert.equal(await page.getAttribute('.tq__tab:has-text("Deadlift")', 'aria-selected'), 'true')

      // it plays: the range follows the movement; Pause stops it, Play starts it again
      const value = () => page.$eval('.tq__range input', (i) => i.value)
      const moving = async () => {
        const v = await value()
        await page.waitForTimeout(450)
        return (await value()) !== v
      }
      assert.equal((await page.textContent('.tq__play')).trim(), 'Pause')
      assert.ok(await moving(), 'the lift plays')
      await page.click('.tq__play')
      assert.equal((await page.textContent('.tq__play')).trim(), 'Play')
      assert.equal(await moving(), false, 'paused')
      await page.click('.tq__play')
      assert.ok(await moving(), 'playing again')

      // moving the range pauses the lift at that point
      await page.focus('.tq__range input')
      for (let k = 0; k < 5; k++) await page.keyboard.press('ArrowRight')
      assert.equal((await page.textContent('.tq__play')).trim(), 'Play')
      assert.equal(await moving(), false)

      // dragging the figure turns it
      const canvas = page.locator('.tq__canvas')
      await page.waitForTimeout(300)
      const before = await canvas.screenshot()
      const box = await canvas.boundingBox()
      await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.5, { steps: 8 })
      await page.mouse.up()
      await page.waitForTimeout(500)
      assert.notDeepEqual(await canvas.screenshot(), before, 'the view turned')
      assert.deepEqual(page.problems(), [])
      await page.context().close()
    })
  }

  // where the module stacks (frames up to 560 px wide: phones, 641 px, and the 1001–1240 px layouts) the
  // picture keeps its proportion and the controls take their own row, clear of the feet and the bar
  for (const width of [320, 360, 390, 430, 640, 1024, 1180]) {
    test(`${width}px: the 3D picture keeps its proportion and the controls sit under it, not over it`, async () => {
      const page = await open(browser, '', { viewport: { width, height: 800 } })
      await scrollToElement(page, '.tech__demo', 40)
      await until(page, () => document.querySelector('.tq__stage'), undefined, 10000)
      const m = await page.evaluate(() => {
        const r = (s) => document.querySelector(s).getBoundingClientRect()
        const canvas = r('.tq__canvas')
        const controls = r('.tq__controls')
        return { w: canvas.width, h: canvas.height, gap: controls.top - canvas.bottom, inside: controls.bottom <= r('.tq__stage').bottom + 1 }
      })
      assert.ok(m.h >= m.w * 0.74, `the picture is at least 4:3 (${Math.round(m.w)}×${Math.round(m.h)})`)
      if (width <= 430) assert.ok(m.h >= m.w * 0.99, `on a phone the picture is square (${Math.round(m.w)}×${Math.round(m.h)})`)
      assert.ok(m.gap >= -0.5 && m.inside, `the controls start below the picture (gap ${m.gap.toFixed(1)} px)`)
      assert.deepEqual(page.problems(), [])
      await page.context().close()
    })
  }

  test('on a touchscreen: taps work, a vertical swipe over the figure scrolls the page, a sideways one turns it', async () => {
    const context = await browser.newContext({ viewport: PHONE, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })
    const page = await context.newPage()
    await page.goto(BASE, { waitUntil: 'load' })
    await scrollToElement(page, '.tech__demo', 40)
    await until(page, () => document.querySelector('.tq')?.dataset.state === 'live', undefined, 20000)
    await page.tap('.tq__tab:has-text("Deadlift")')
    assert.equal(await page.getAttribute('.tq__tab:has-text("Deadlift")', 'aria-selected'), 'true')
    await page.tap('.tq__play')
    assert.equal((await page.textContent('.tq__play')).trim(), 'Play')
    const cdp = await context.newCDPSession(page)
    const box = await page.locator('.tq__canvas').boundingBox()
    const swipe = async (x0, y0, x1, y1) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] })
      for (let i = 1; i <= 8; i++) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + ((x1 - x0) * i) / 8, y: y0 + ((y1 - y0) * i) / 8 }] })
        await page.waitForTimeout(16)
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await page.waitForTimeout(600)
    }
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2
    const y0 = await page.evaluate(() => scrollY)
    await swipe(cx, cy + 60, cx, cy - 60)
    assert.ok((await page.evaluate(() => scrollY)) > y0 + 20, 'the page scrolled')
    const box2 = await page.locator('.tq__canvas').boundingBox()
    const before = await page.locator('.tq__canvas').screenshot()
    await swipe(box2.x + box2.width * 0.2, box2.y + box2.height / 2, box2.x + box2.width * 0.8, box2.y + box2.height / 2)
    assert.notDeepEqual(await page.locator('.tq__canvas').screenshot(), before, 'the figure turned')
    await context.close()
  })

  test('without WebGL the still stays as the picture, says why, and hides the controls it cannot use', async () => {
    for (const [viewport, path, sel] of [[PHONE, '', '.tech__demo'], [DESKTOP, 'work/tensile/', '.tq']]) {
      const context = await browser.newContext({ viewport })
      await context.addInitScript(() => {
        const real = HTMLCanvasElement.prototype.getContext
        HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
          return /webgl/.test(type) ? null : real.call(this, type, ...rest)
        }
      })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', (e) => errors.push(e.message))
      await page.goto(BASE + path, { waitUntil: 'load' })
      await scrollToElement(page, sel, 40)
      await until(page, () => document.querySelector('.tq')?.dataset.state === 'failed', undefined, 10000)
      const s = await page.evaluate(() => {
        const still = document.querySelector('.tq__still')
        return {
          still: still.complete && still.naturalWidth > 0 && getComputedStyle(still).opacity === '1',
          says: document.querySelector('.tq__fallback')?.textContent ?? '',
          controls: getComputedStyle(document.querySelector('.tq__controls')).display,
        }
      })
      assert.ok(s.still, `/${path}: the still is shown`)
      assert.match(s.says, /WebGL/)
      assert.equal(s.controls, 'none')
      assert.deepEqual(errors, [])
      await context.close()
    }
  })

  test('until the live figure is drawn, a still of the same lift holds its place', async () => {
    // the live figure is held back so the still can be checked (the shader compiles in seconds on a first visit)
    const page = await open(browser, '', { viewport: DESKTOP })
    await page.route(/lifts-[^/]*\.js$/, (r) => r.abort())
    await scrollToElement(page, '.tech__demo', 40)
    await until(page, () => document.querySelector('.tq__still')?.complete, undefined, 10000)
    const still = await page.$eval('.tq__still', (i) => ({ w: i.naturalWidth, src: i.currentSrc, opacity: getComputedStyle(i).opacity }))
    assert.ok(still.w > 0 && /lifts\/squat-/.test(still.src) && still.opacity === '1', `the squat still is shown (${JSON.stringify(still)})`)
    await page.click('.tq__tab:has-text("Deadlift")')
    await until(page, () => /deadlift-/.test(document.querySelector('.tq__still').currentSrc))
    await page.context().close()
  })

  test('once the figure is live, choosing lifts downloads no more stills (they would be hidden)', async () => {
    const page = await open(browser, '', { viewport: DESKTOP })
    await scrollToElement(page, '.tech__demo', 40)
    await until(page, () => document.querySelector('.tq')?.dataset.state === 'live', undefined, 20000)
    const stills = []
    page.on('request', (r) => /\/media\/lifts\//.test(r.url()) && stills.push(r.url()))
    for (const name of ['Bench press', 'Deadlift', 'Back squat']) {
      await page.click(`.tq__tab:has-text("${name}")`)
      await page.waitForTimeout(150)
    }
    assert.deepEqual(stills, [])
    assert.deepEqual(page.problems(), [])
    await page.context().close()
  })

  test('with reduced motion the figure holds until Play', async () => {
    const page = await open(browser, '', { viewport: DESKTOP, reducedMotion: 'reduce' })
    await scrollToElement(page, '.tech__demo', 40)
    await until(page, () => document.querySelector('.tq')?.dataset.state === 'live', undefined, 10000)
    assert.equal((await page.textContent('.tq__play')).trim(), 'Play')
    await page.click('.tq__play')
    assert.equal((await page.textContent('.tq__play')).trim(), 'Pause')
    await page.context().close()
  })
})

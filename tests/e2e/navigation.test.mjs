// Header, desktop navigation, mobile menu, footer links and the contact actions on the home page.
import assert from 'node:assert/strict'
import { after, before, describe, test } from 'node:test'
import { DESKTOP, PHONE, glide, launch, open, until } from './helpers.mjs'

const SECTIONS = ['work', 'services', 'approach', 'studio', 'contact']

let browser
before(async () => (browser = await launch()))
after(() => browser?.close())

/**
 * Runs `click`, waits for the smooth scroll it starts to end (the browser's scrollend event),
 * and returns the section's distance from the top of the viewport.
 */
async function jump(page, click, id) {
  // let any earlier scroll finish first, so its scrollend is not mistaken for this one
  await page.waitForTimeout(300)
  await page.evaluate(() => {
    window.__scrollEnded = false
    addEventListener('scrollend', () => (window.__scrollEnded = true), { once: true })
  })
  await click()
  await until(page, () => window.__scrollEnded, undefined, 15000)
  return page.evaluate((i) => document.getElementById(i).getBoundingClientRect().top, id)
}

describe('desktop header and navigation', () => {
  test('each link scrolls its section under the header and marks it current, from any scroll position', async () => {
    const page = await open(browser, '', { viewport: DESKTOP })
    // start from the bottom, then the middle, so every jump goes both up and down
    for (const start of ['bottom', 'middle']) {
      await page.evaluate((s) => scrollTo(0, s === 'bottom' ? document.body.scrollHeight : document.body.scrollHeight / 2), start)
      // scrolling down tucks the header away; scrolling up a little brings it back
      await glide(page, 400, 4)
      await glide(page, -60, 2)
      for (const id of SECTIONS) {
        // no scrolling between jumps: the header must stay put after a jump it started
        const top = await jump(page, () => page.click(`.site-nav a[href="#${id}"]`, { timeout: 3000 }), id)
        const header = await page.evaluate(() => document.querySelector('.site-header').getBoundingClientRect().height)
        assert.ok(top >= -2 && top <= header + 40, `#${id} should sit just under the header after the jump (top ${top}px, header ${header}px)`)
        assert.equal(await page.evaluate(() => location.hash), `#${id}`)
        await until(page, (i) => document.querySelector(`.site-nav a[href="#${i}"]`)?.getAttribute('aria-current') === 'true', id)
      }
    }
    assert.deepEqual(page.problems(), [])
    await page.context().close()
  })

  test('the logo returns to the top; the header fills in after scrolling and tucks away going down, back going up', async () => {
    const page = await open(browser, '', { viewport: DESKTOP })
    const header = () => page.evaluate(() => {
      const h = document.querySelector('.site-header')
      return { scrolled: h.dataset.scrolled, tucked: h.dataset.tucked }
    })
    assert.deepEqual(await header(), { scrolled: 'false', tucked: 'false' })
    await glide(page, 1600, 10)
    await until(page, () => document.querySelector('.site-header').dataset.tucked === 'true')
    assert.equal((await header()).scrolled, 'true')
    await glide(page, -200, 4)
    await until(page, () => document.querySelector('.site-header').dataset.tucked === 'false')
    await page.click('.site-header__home')
    await until(page, () => scrollY < 2, undefined, 8000)
    await page.context().close()
  })

  test('keyboard: the skip link is first, shows on focus and moves focus to the content', async () => {
    const page = await open(browser, '', { viewport: DESKTOP })
    await page.keyboard.press('Tab')
    await page.waitForTimeout(400) // it slides in
    const skip = await page.evaluate(() => {
      const a = document.activeElement
      const r = a.getBoundingClientRect()
      return { cls: a.className, visible: r.top >= 0 && r.height > 0 && getComputedStyle(a).opacity !== '0' }
    })
    assert.match(skip.cls, /skip-link/)
    assert.ok(skip.visible, 'the skip link is visible while focused')
    await page.keyboard.press('Enter')
    assert.equal(await page.evaluate(() => document.activeElement.id), 'main')
    // the next stop is the first thing in the content: the hero's primary action
    await page.keyboard.press('Tab')
    assert.equal(await page.evaluate(() => document.activeElement.closest('.hero') !== null), true)
    await page.context().close()
  })

  test('every visible focusable element shows a focus indicator', async () => {
    const page = await open(browser, '', { viewport: DESKTOP })
    const missing = []
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab')
      const r = await page.evaluate(() => {
        const a = document.activeElement
        if (!a || a === document.body) return null
        // the ring may be drawn on the element or on a part of it (the arrow link rings its circle)
        const ringed = (el) => {
          const s = getComputedStyle(el)
          return (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== 'none'
        }
        const ring = ringed(a) || [...a.querySelectorAll('*')].some(ringed)
        return { name: `${a.tagName.toLowerCase()}.${String(a.className).split(' ')[0]} ${a.textContent.trim().slice(0, 30)}`, ring }
      })
      if (r && !r.ring) missing.push(r.name)
    }
    assert.deepEqual(missing, [], 'focused elements without an outline or ring')
    await page.context().close()
  })
})

describe('mobile menu', () => {
  test('opens as a modal, locks the page, closes on Escape and returns focus to the toggle', async () => {
    const page = await open(browser, '', { viewport: PHONE })
    assert.equal(await page.isVisible('.site-nav'), false, 'the desktop navigation is hidden on a phone')
    await page.click('.menu-toggle')
    await until(page, () => document.getElementById('site-menu').open)
    assert.equal(await page.getAttribute('.menu-toggle', 'aria-expanded'), 'true')
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('is-locked')), true)
    assert.equal(await page.evaluate(() => document.getElementById('site-menu').contains(document.activeElement)), true, 'focus moves into the menu')
    await page.keyboard.press('Escape')
    // the dialog's close event (which unlocks the page) follows its closing
    await until(page, () => !document.getElementById('site-menu').open && !document.documentElement.classList.contains('is-locked'))
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('is-locked')), false, 'the page scrolls again')
    assert.equal(await page.evaluate(() => document.activeElement.classList.contains('menu-toggle')), true)
    assert.equal(await page.getAttribute('.menu-toggle', 'aria-expanded'), 'false')
    await page.context().close()
  })

  test('the close button closes it; each link closes it and lands on its section', async () => {
    const page = await open(browser, '', { viewport: PHONE })
    await page.click('.menu-toggle')
    await page.click('.menu-panel__close')
    await until(page, () => !document.getElementById('site-menu').open)
    for (const id of SECTIONS) {
      // the header (and its Menu button) stays in view after the menu's own jump
      await page.click('.menu-toggle', { timeout: 3000 })
      await until(page, () => document.getElementById('site-menu').open)
      const top = await jump(page, () => page.click(`.menu-panel__link[href="#${id}"]`), id)
      assert.ok(Math.abs(top) < 120, `#${id} is at the top after choosing it in the menu (top ${top}px)`)
      assert.equal(await page.evaluate(() => document.documentElement.classList.contains('is-locked')), false)
      assert.equal(await page.evaluate(() => document.activeElement.id), id, 'focus moves to the section')
    }
    // the call to action in the menu goes to Contact (from the top of the page)
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
    await page.click('.menu-toggle')
    await until(page, () => document.getElementById('site-menu').open)
    assert.ok(Math.abs(await jump(page, () => page.click('.menu-panel__foot a'), 'contact')) < 120)
    assert.equal(await page.evaluate(() => document.getElementById('site-menu').open), false)
    assert.deepEqual(page.problems(), [])
    await page.context().close()
  })

  test('widening the window to the desktop layout closes an open menu', async () => {
    const page = await open(browser, '', { viewport: PHONE })
    await page.click('.menu-toggle')
    await until(page, () => document.getElementById('site-menu').open)
    await page.setViewportSize(DESKTOP)
    await until(page, () => !document.getElementById('site-menu').open)
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('is-locked')), false)
    assert.equal(await page.isVisible('.site-nav'), true)
    await page.context().close()
  })
})

describe('contact and footer', () => {
  test('the email actions are pre-filled mailto links; Copy address copies it and says so', async () => {
    const page = await open(browser, '', { viewport: DESKTOP, permissions: ['clipboard-read', 'clipboard-write'] })
    const email = (await page.textContent('.contact__email span')).trim()
    assert.match(email, /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/)
    for (const sel of ['.contact__email', '.contact__tools a']) {
      const href = await page.getAttribute(sel, 'href')
      assert.ok(href.startsWith(`mailto:${email}?subject=`), `${sel} opens a pre-filled email`)
      assert.match(decodeURIComponent(href), /body=.+/s)
    }
    await page.click('.contact__copy')
    await until(page, () => /copied/i.test(document.querySelector('.contact__copy').textContent))
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), email)
    assert.match(await page.textContent('.contact [role="status"]'), /copied/i, 'the copy is announced')
    await page.context().close()
  })

  test('on a phone, Contact reads in order: the address, what to include, then elsewhere', async () => {
    const page = await open(browser, '', { viewport: PHONE })
    const tops = await page.evaluate(() => ['.contact__email', '.contact__checklist', '.contact__social'].map((s) => document.querySelector(s).getBoundingClientRect().top))
    assert.ok(tops[0] < tops[1] && tops[1] < tops[2], `order on screen: ${tops.map(Math.round)}`)
    await page.context().close()
  })

  test('social links open in a new tab safely and say so; footer links point at real sections', async () => {
    const page = await open(browser, '', { viewport: DESKTOP })
    const external = await page.$$eval('a[target="_blank"]', (as) => as.map((a) => ({ href: a.href, rel: a.rel, name: a.getAttribute('aria-label') ?? '' })))
    assert.ok(external.length >= 4)
    for (const a of external) {
      assert.match(a.rel, /noopener/, `${a.href} has rel=noopener`)
      assert.match(a.name, /new tab/i, `${a.href} says it opens a new tab`)
      assert.match(a.href, /^https:\/\//)
    }
    const anchors = await page.$$eval('a[href^="#"]', (as) => as.map((a) => a.getAttribute('href')).filter((h) => h.length > 1))
    for (const h of new Set(anchors)) assert.ok(await page.$(h), `${h} has a target`)
    await page.context().close()
  })
})

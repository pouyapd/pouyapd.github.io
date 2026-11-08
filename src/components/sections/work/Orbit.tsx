import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { prefersReducedMotion } from '../../motion/media'
import { ResponsiveImage } from '../../ui/ResponsiveImage'
import { CaseActions, CaseIntro, CaseShell, siteHref, type CaseProps } from './parts'
import './orbit.css'

/** Resting rotation (degrees a second), the most the scroll can add, and how strongly it adds. */
const REST = 7
const MAX_EXTRA = 42
const PER_PX = 0.022
/** How far the page may scroll while a card is chosen before it goes back into the ring. */
const RELEASE_PX = 48

/**
 * Orbit: six pages of the website, each a complete phone capture on its own
 * card, stand on one ring and turn slowly round it. Scrolling the page adds
 * to the speed (down turns it forward, up turns it back), eased in and out,
 * and the ring settles back to its resting pace when the scroll stops. Click
 * or tap a card (or press Enter on it) and the ring brings it to the front,
 * a little larger, with the others behind it; once the page scrolls on, the
 * card eases back into the ring and the ring turns again. The page's name, a
 * line and a link to it sit below. With reduced motion the ring does not
 * turn on its own and a chosen card comes forward without travel.
 */
export function Orbit({ site, index, viewLabel, notesLabel }: CaseProps) {
  const sections = site.showcase?.sections ?? []
  const n = sections.length
  const step = 360 / n
  const stage = useRef<HTMLDivElement>(null)
  const cards = useRef<(HTMLButtonElement | null)[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [front, setFront] = useState(0)
  const chosen = useRef<number | null>(null)
  const focused = useRef<number | null>(null)
  const hovered = useRef(false)
  const wake = useRef<() => void>(() => {})

  useEffect(() => {
    chosen.current = selected
    wake.current()
  }, [selected])

  useEffect(() => {
    const el = stage.current
    if (!el) return
    const still = prefersReducedMotion()
    let rot = 0 // the ring's turn, degrees
    let speed = still ? 0 : REST
    let velocity = 0 // the page's scroll speed, px/s, smoothed
    let lastY = window.scrollY
    let lastT = performance.now()
    let raf = 0
    let visible = false
    let shownFront = -1
    let size = { w: 0, card: 0 }
    let drift = 0 // scroll since a card was chosen
    let heldAt: number | null = null
    const amount = cards.current.map(() => 0) // how far each card has come forward, 0 … 1, eased

    const measure = () => {
      size = { w: el.clientWidth, card: cards.current[0]?.offsetWidth ?? 0 }
    }

    const place = () => {
      const { w, card } = size
      // the ring's width keeps the side cards inside the stage; its depth is a flattened circle
      const rx = Math.max(card * 0.6, Math.min(card * 1.9, w / 2 - card * 0.45))
      const rz = rx * 0.75
      // seen a little from above: cards further away stand higher (more on a phone, so the ones behind still show a clear edge)
      const lift = card * (card < 200 ? 0.54 : 0.32)
      const grow = card < 200 ? 1.42 : 1.22 // a chosen card comes forward; more on a phone, where the cards are small
      let best = 0
      let bestC = -2
      cards.current.forEach((b, i) => {
        if (!b) return
        const a = ((i * step + rot) * Math.PI) / 180
        const s = Math.sin(a)
        const c = Math.cos(a)
        const pick = chosen.current === i
        const k = amount[i] ?? 0
        b.style.transform = `translate3d(${rx * s}px, ${-lift * (1 - c) * 0.5}px, ${rz * (c - 1) + 70 * k}px) rotateY(${-s * 16 * (1 - k)}deg) scale(${1 + (grow - 1) * k})`
        b.style.opacity = String(Math.min(1, 0.42 + 0.58 * ((c + 1) / 2) ** 1.4 + k))
        b.style.zIndex = String(Math.round(100 + c * 50) + (k > 0.01 ? 200 : 0))
        // cards turned away show only a sliver: not a tap target (still reachable by keyboard and by the links below)
        b.style.pointerEvents = c < -0.25 && !pick ? 'none' : ''
        if (c > bestC) {
          bestC = c
          best = i
        }
      })
      if (best !== shownFront) {
        shownFront = best
        setFront(best)
      }
    }

    const tick = (now: number) => {
      raf = 0
      const dt = Math.min(0.1, (now - lastT) / 1000)
      lastT = now
      // the scroll speed, measured each frame and eased, so single wheel steps don't jolt the ring
      const y = window.scrollY
      const moved = y - lastY
      const v = dt > 0 ? moved / dt : 0
      lastY = y
      velocity += (v - velocity) * Math.min(1, dt * 5)
      // a chosen (or keyboard-focused) card stays forward until the page scrolls on; then it goes back into the ring
      if (chosen.current !== heldAt) {
        heldAt = chosen.current
        drift = 0
      }
      if (chosen.current !== null || focused.current !== null) {
        drift += Math.abs(moved)
        if (drift > RELEASE_PX) {
          if (chosen.current !== null) {
            chosen.current = null
            setSelected(null)
          }
          focused.current = null
          drift = 0
        }
      } else drift = 0
      let moving = false
      // each card eases towards its place: forward and larger when chosen, back in the ring otherwise
      amount.forEach((k, i) => {
        const goal = chosen.current === i ? 1 : 0
        const next = still ? goal : k + (goal - k) * Math.min(1, dt * 6)
        amount[i] = Math.abs(goal - next) < 0.002 ? goal : next
        if (amount[i] !== goal) moving = true
      })
      const hold = chosen.current ?? focused.current
      if (hold !== null) {
        // bring the chosen card to the front by the shortest way round
        const aim = -hold * step
        const d = ((((aim - rot) % 360) + 540) % 360) - 180
        rot += still ? d : d * Math.min(1, dt * 5)
        speed = 0
        moving = moving || Math.abs(d) > 0.05
      } else if (!still) {
        // the ring picks up speed again from rest, so letting go never jolts
        const extra = Math.max(-MAX_EXTRA, Math.min(MAX_EXTRA, velocity * PER_PX))
        const target = (REST + extra) * (hovered.current ? 0.3 : 1)
        speed += (target - speed) * Math.min(1, dt * 2)
        rot += speed * dt
        moving = true
      }
      place()
      if (visible && !document.hidden && (moving || Math.abs(velocity) > 1 || hold !== null)) raf = requestAnimationFrame(tick)
    }
    const run = () => {
      if (!raf && visible && !document.hidden) {
        lastT = performance.now()
        raf = requestAnimationFrame(tick)
      }
    }
    wake.current = run

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible) {
        lastY = window.scrollY
        run()
      }
    })
    io.observe(el)
    const ro = new ResizeObserver(() => {
      measure()
      place()
    })
    ro.observe(el)
    window.addEventListener('scroll', run, { passive: true })
    document.addEventListener('visibilitychange', run)
    measure()
    place()
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      window.removeEventListener('scroll', run)
      document.removeEventListener('visibilitychange', run)
      wake.current = () => {}
    }
  }, [step])

  const shown = selected ?? front
  const current = sections[shown]
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && selected !== null) {
      cards.current[selected]?.focus()
      setSelected(null)
    }
  }

  return (
    <CaseShell site={site} style="orbit">
      <div className="case__body orbit__text">
        <div>
          <CaseIntro site={site} index={index} />
        </div>
        <div className="orbit__side">
          {site.showcase?.note && <p className="case__note">{site.showcase.note}</p>}
          <CaseActions site={site} viewLabel={viewLabel} notesLabel={notesLabel} />
        </div>
      </div>

      <div className="orbit" onKeyDown={onKey}>
        <div
          className="orbit__stage"
          ref={stage}
          data-selected={selected !== null}
          onPointerEnter={() => (hovered.current = true)}
          onPointerLeave={() => (hovered.current = false)}
        >
          {sections.map((s, i) => (
            <button
              key={s.shot}
              type="button"
              className="orbit__card"
              ref={(el) => {
                cards.current[i] = el
              }}
              aria-pressed={selected === i}
              aria-label={`${s.label}: ${s.text}`}
              data-chosen={selected === i}
              onClick={() => setSelected(i)}
              onFocus={(e) => {
                // keyboard focus turns a card to the front (a click chooses it instead)
                if (e.currentTarget.matches(':focus-visible')) {
                  focused.current = i
                  wake.current()
                }
              }}
              onBlur={() => {
                focused.current = null
                wake.current()
              }}
            >
              <ResponsiveImage group="shots" name={`${site.preview}-shot-${s.shot}-mobile`} alt="" defer sizes="(max-width: 760px) 60vw, 320px" />
            </button>
          ))}
        </div>

        <div className="orbit__caption">
          <span className="visually-hidden" aria-live="polite">
            {selected !== null ? `${sections[selected].label}, brought forward.` : ''}
          </span>
          <p className="orbit__now">
            <span className="orbit__n">
              {String(shown + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
            </span>{' '}
            {current?.label}
          </p>
          <p className="orbit__line">{current?.text}</p>
          <p className="orbit__do">
            {selected === null ? (
              <span className="orbit__hint">Choose a card to bring it forward.</span>
            ) : (
              <a href={siteHref(site, sections[selected].path)}>Open this page →</a>
            )}
          </p>
        </div>

        <ul className="orbit__pages" role="list" aria-label={`${site.title}: the pages shown`}>
          {sections.map((s, i) => (
            <li key={s.shot}>
              <a href={siteHref(site, s.path)} data-on={i === shown}>
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </CaseShell>
  )
}

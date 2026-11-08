import { useRef, type CSSProperties } from 'react'
import { useScrollProgress } from '../../motion/useScrollProgress'
import { ResponsiveImage } from '../../ui/ResponsiveImage'
import { CaseActions, CaseIntro, CaseShell, siteHref, type CaseProps } from './parts'
import './assemble.css'

/**
 * Assemble: the website's sections lie scattered over the card, desktop and
 * phone captures at different sizes and slight angles. The composition is
 * held on screen (position: sticky) for a long stretch of scroll: first the
 * scattered pages stay still to be looked at, then they slide together one
 * after another and settle into the screens of a desktop browser and a
 * phone, the screens appear around them, and the finished picture holds.
 * Progress follows the scroll position both ways, eased so that wheel steps
 * glide; the page scrolls normally throughout. The cards only move (transforms); their resting
 * place is their layout position, so the final picture is pixel-exact, and it
 * is what reduced motion and no JavaScript show.
 *
 * Positions are in container units of the composition (cqw: 1/100 of its
 * width), one set for wide screens and one for phones and upright tablets.
 */

type Rect = [number, number, number, number] // left, top, width, height
type Scatter = [number, number, number, number] // centre x, centre y, scale, degrees

const SCREEN = {
  wide: {
    browser: [10, 6.6, 66, 41.25] as Rect,
    phone: [73.6, 13.6, 15.2, 32.93] as Rect,
  },
  // on phones the composition is tall (100 x 156): the browser across the top, a larger phone standing in front of it
  narrow: {
    browser: [0, 4.4, 100, 62.5] as Rect,
    phone: [28, 54, 44, 95.3] as Rect,
  },
}

/** Where each capture starts: desktop sections first, then the phone ones (order of `sections`). */
const SCATTER: Record<'wide' | 'narrow', { desktop: Scatter[]; mobile: Scatter[] }> = {
  wide: {
    desktop: [
      [26, 15, 0.5, -5],
      [74, 11.5, 0.44, 4],
      [50, 37, 0.46, -2],
    ],
    mobile: [
      [91.5, 27, 0.9, 6],
      [8.5, 32, 0.84, -7],
      [76, 37, 0.8, 3],
    ],
  },
  narrow: {
    desktop: [
      [31, 19, 0.55, -5],
      [68, 64, 0.5, 4],
      [36, 113, 0.5, -3],
    ],
    mobile: [
      [80, 31, 0.62, 7],
      [19, 71, 0.58, -6],
      [77, 127, 0.55, 3],
    ],
  },
}

/** Phones, and any screen held upright (portrait tablets): the tall composition. Same query as assemble.css. */
const TALL = '(max-width: 760px), (max-aspect-ratio: 4/5)'

/** Eased in and out, so each card starts and settles gently. */
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)

/**
 * The scroll through the held composition, in parts: the scattered pages
 * stay still long enough to look at, then come together one after another,
 * the screens appear around them, and the finished picture holds.
 */
const HOLD_START = 0.14
const ASSEMBLE_END = 0.8
const centre = (r: Rect) => [r[0] + r[2] / 2, r[1] + r[3] / 2]
const rectVars = (name: string, r: Rect) => ({
  [`--${name}l`]: `${r[0]}cqw`,
  [`--${name}t`]: `${r[1]}cqw`,
  [`--${name}w`]: `${r[2]}cqw`,
  [`--${name}h`]: `${r[3]}cqw`,
})

export function Assemble({ site, index, viewLabel, notesLabel }: CaseProps) {
  const sections = site.showcase?.sections ?? []
  const track = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const cards = useRef<(HTMLElement | null)[]>([])

  useScrollProgress(
    track,
    // 0 when the held composition first fills the screen, 1 when the track has scrolled past it
    (r, vh) => -r.top / Math.max(1, r.height - vh),
    (p) => {
      const el = box.current
      if (!el) return
      const layout = window.matchMedia(TALL).matches ? 'narrow' : 'wide'
      const q = (p - HOLD_START) / (ASSEMBLE_END - HOLD_START) // 0 … 1 through the assembly
      el.style.setProperty('--frame', String(ease((q - 0.82) / 0.18)))
      cards.current.forEach((card, i) => {
        if (!card) return
        const phone = i >= sections.length
        const k = phone ? i - sections.length : i
        const [cx, cy, s, deg] = SCATTER[layout][phone ? 'mobile' : 'desktop'][k]
        const [fx, fy] = centre(SCREEN[layout][phone ? 'phone' : 'browser'])
        // one after another: the pages beneath first, the home page last (it ends on top)
        const delay = (sections.length - 1 - k) * 0.11 + (phone ? 0.06 : 0)
        const e = ease((q - delay) / 0.66)
        card.style.transform = `translate(${(cx - fx) * (1 - e)}cqw, ${(cy - fy) * (1 - e)}cqw) scale(${s + (1 - s) * e}) rotate(${deg * (1 - e)}deg)`
        card.dataset.landed = String(e > 0.999)
      })
    },
    1,
    6,
  )

  const style = {
    ...rectVars('b', SCREEN.wide.browser),
    ...rectVars('p', SCREEN.wide.phone),
    ...rectVars('bn', SCREEN.narrow.browser),
    ...rectVars('pn', SCREEN.narrow.phone),
  } as CSSProperties

  const card = (s: (typeof sections)[number], i: number, phone: boolean) => (
    <a
      key={`${phone ? 'm' : 'd'}-${s.shot}`}
      ref={(el) => {
        cards.current[phone ? sections.length + i : i] = el
      }}
      href={siteHref(site, s.path)}
      className={`assemble__card assemble__card--${phone ? 'phone' : 'desktop'}`}
      style={{ zIndex: (phone ? 20 : 10) + sections.length - i }}
      tabIndex={phone || i > 0 ? -1 : undefined}
      aria-hidden={phone || i > 0 ? true : undefined}
      aria-label={i === 0 && !phone ? `${site.title}: ${s.label}` : undefined}
    >
      <ResponsiveImage
        group="shots"
        name={`${site.preview}-shot-${s.shot}-${phone ? 'mobile' : 'desktop'}`}
        alt=""
        defer
        sizes={phone ? '(max-width: 760px) 30vw, 12vw' : '(max-width: 760px) 92vw, 60vw'}
        focus="50% 0%"
      />
    </a>
  )

  return (
    <CaseShell site={site} style="assemble">
      <div className="case__body assemble__text">
        <div>
          <CaseIntro site={site} index={index} />
        </div>
        <div className="assemble__side">
          {site.showcase?.note && <p className="case__note">{site.showcase.note}</p>}
          <ul className="assemble__links" role="list">
            {sections.map((s) => (
              <li key={s.shot}>
                <a href={siteHref(site, s.path)}>{s.label}</a> <span>{s.text}</span>
              </li>
            ))}
          </ul>
          <CaseActions site={site} viewLabel={viewLabel} notesLabel={notesLabel} />
        </div>
      </div>
      <div className="assemble__track" ref={track}>
        <div className="assemble__pin">
          <div className="assemble" ref={box} style={style}>
            <div className="assemble__browser" aria-hidden="true">
              <span className="assemble__bar">
                <i />
                <i />
                <i />
                <span>{site.url}</span>
              </span>
            </div>
            <div className="assemble__phone" aria-hidden="true" />
            {sections.map((s, i) => card(s, i, false))}
            {sections.map((s, i) => card(s, i, true))}
          </div>
        </div>
      </div>
    </CaseShell>
  )
}

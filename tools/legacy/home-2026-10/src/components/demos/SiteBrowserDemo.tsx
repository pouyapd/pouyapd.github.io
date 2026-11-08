import { useRef, useState } from 'react'
import media from '../../content/generated/media.json'
import { prefersReducedMotion } from '../motion/media'
import { BrowserFrame, PhoneFrame } from '../ui/DeviceFrames'
import { PagePreview } from '../ui/PagePreview'
import './site-demo.css'

/** Nav items measured in the mockup by `npm run mockups` (fractions of the full page). */
interface Anchor {
  label: string
  x: number
  y: number
  w: number
  h: number
  top: number
}

const NAME = 'meridian-desktop'

/**
 * Web design & development: the Meridian Atelier concept as a working page.
 * The capture scrolls inside the browser frame like a real site, and its own
 * menu items are clickable — each scrolls the page to its section and updates
 * the address bar.
 */
export function SiteBrowserDemo() {
  const root = useRef<HTMLDivElement>(null)
  const [section, setSection] = useState<string | null>(null)
  const anchors = (media.sites[NAME] as { anchors?: Anchor[] }).anchors ?? []

  const go = (a: Anchor) => {
    const el = root.current?.querySelector<HTMLElement>('.sv-site__browser .page-preview')
    const page = el?.firstElementChild as HTMLElement | null
    if (!el || !page) return
    el.scrollTo({ top: Math.max(0, a.top * page.offsetHeight - 6), behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    setSection(a.label.toLowerCase())
  }

  const menu = anchors.length ? (
    <nav className="site-demo__menu" aria-label="Meridian Atelier concept menu">
      {anchors.map((a) => (
        <button
          key={a.label}
          type="button"
          className="site-demo__hot"
          style={{ left: `${a.x * 100}%`, top: `${a.y * 100}%`, width: `${a.w * 100}%`, height: `${a.h * 100}%` }}
          aria-label={`${a.label}: scroll the preview to this section`}
          aria-current={section === a.label.toLowerCase() ? 'true' : undefined}
          onClick={() => go(a)}
        />
      ))}
    </nav>
  ) : null

  return (
    <div className="sv-site" ref={root}>
      <BrowserFrame url={`meridian-atelier.concept${section ? `/#${section}` : ''}`} tone="light" className="sv-site__browser">
        <PagePreview
          name={NAME}
          alt="Meridian Atelier concept homepage: a concrete and glass house at dusk beside the headline “Buildings shaped by light and procession”, followed by a project index, three details of the house, the practice and a footer."
          sizes="(max-width: 900px) 92vw, 52vw"
          mode="native"
          regionLabel="Meridian Atelier concept website. Scroll to explore the page."
          overlay={menu}
        />
      </BrowserFrame>
      <PhoneFrame className="sv-site__phone">
        <PagePreview name="meridian-mobile" alt="" sizes="160px" mode="none" />
      </PhoneFrame>
    </div>
  )
}

import { useEffect, type ReactNode } from 'react'
import { asset } from '../app/paths'
import type { ConceptSite } from '../content/types'
import { Logo } from '../components/ui/Logo'
import './concept-frame.css'

/**
 * Wraps a concept website in a slim P. DESIGN bar: the way back to the
 * portfolio, an honest label (a fictional brand with sample content, or the
 * studio's own brand), and the notes on how the project was designed. Everything below it is the
 * concept's own site, in its own identity.
 */
export function ConceptFrame({ site, children }: { site: ConceptSite; children: ReactNode }) {
  // arriving with #section from another page: scroll there once the page has rendered
  useEffect(() => {
    // a malformed escape in a shared link (#%E0%A4) must not take the page down: then there is no target
    let id: string
    try {
      id = decodeURIComponent(location.hash.slice(1))
    } catch {
      return
    }
    const el = id && document.getElementById(id)
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }))
  }, [])

  return (
    <div className={`cx cx--${site.slug}`}>
      <a className="cx-skip" href="#cx-main">
        Skip to the {site.title} website
      </a>
      <aside className="cx-bar" aria-label="P. DESIGN portfolio">
        <a className="cx-bar__home" href={`${asset('')}#work`}>
          <Logo className="cx-bar__logo" height="1.45rem" />
          <span>
            <span className="cx-bar__wide">Back to the </span>portfolio
          </span>
        </a>
        <p className="cx-bar__label">
          <span className="cx-bar__dot" aria-hidden="true" />
          {site.own ? (
            <>
              Brand guidelines<span className="cx-bar__wide"> · the studio's own identity</span>
            </>
          ) : (
            <>
              Concept website<span className="cx-bar__wide"> · fictional brand, sample content</span>
            </>
          )}
        </p>
        <a className="cx-bar__notes" href={asset(`work/${site.slug}/case-study/`)}>
          About<span className="cx-bar__wide"> this {site.own ? 'project' : 'concept'}</span>
        </a>
      </aside>
      <div id="cx-main" className="cx-site" tabIndex={-1}>
        {children}
      </div>
    </div>
  )
}

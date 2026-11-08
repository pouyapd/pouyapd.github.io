import type { ReactNode } from 'react'
import { asset } from '../../../app/paths'
import { isLight, vars } from '../../../app/style'
import type { ConceptSite } from '../../../content/types'
import { Icon } from '../../ui/Icon'
import { Wordmark } from '../../ui/Wordmark'

export interface CaseProps {
  site: ConceptSite
  index: number
  viewLabel: string
  notesLabel: string
}

/** An address inside a project's website. */
export const siteHref = (site: ConceptSite, path = '') => asset(`work/${site.slug}/${path}`)

/** The card itself: the project's own colours, a modifier for its presentation. */
export function CaseShell({ site, style, className = '', children }: { site: ConceptSite; style: string; className?: string; children: ReactNode }) {
  return (
    <article
      className={`case case--${style}${isLight(site.stage) ? ' case--light' : ''} ${className}`.trim()}
      style={vars({ '--stage': site.stage, '--ink': site.ink, '--accent': site.accent })}
      aria-labelledby={`case-${site.slug}`}
      data-preview-root
    >
      {children}
    </article>
  )
}

/** Number and category, the name in the brand's own typeface, and one line. */
export function CaseIntro({ site, index }: { site: ConceptSite; index: number }) {
  return (
    <>
      <p className="case__meta">
        <span className="case__index">{String(index + 1).padStart(2, '0')}</span>
        <span>{site.sector}</span>
      </p>
      <h3 id={`case-${site.slug}`} className={`case__title case__title--${site.slug}`}>
        <a href={siteHref(site)} className="case__link">
          <span className="visually-hidden">{site.title}</span>
          <Wordmark slug={site.slug} />
        </a>
      </h3>
      <p className="case__summary">{site.summary}</p>
    </>
  )
}

/** The two ways in: the working website, or the case study. */
export function CaseActions({ site, viewLabel, notesLabel }: Omit<CaseProps, 'index'>) {
  return (
    <div className="case__actions">
      <a className="case__cta" href={siteHref(site)} aria-label={`${viewLabel}: ${site.title}`}>
        <span>{viewLabel}</span>
        <Icon name="arrow-right" />
      </a>
      <a className="case__notes" href={siteHref(site, 'case-study/')} aria-label={`${notesLabel}: ${site.title}`}>
        {notesLabel}
      </a>
    </div>
  )
}

import type { ReactNode } from 'react'
import { vars } from '../../app/style'
import './section-header.css'

interface SectionHeaderProps {
  id: string
  eyebrow: string
  title: string
  /** Second part of the title, set in the editorial italic. */
  accent?: string
  intro?: ReactNode
  /** Title and intro one above the other, for a header in a narrow column. */
  stacked?: boolean
}

/** Shared heading block: eyebrow, large light title, optional intro. */
export function SectionHeader({ id, eyebrow, title, accent, intro, stacked }: SectionHeaderProps) {
  return (
    <header className={`section-header${stacked ? ' section-header--stacked' : ''}`}>
      <p className="eyebrow" data-reveal>
        {eyebrow}
      </p>
      <h2 id={id} className="section-header__title" data-reveal style={vars({ '--reveal-i': 1 })}>
        {title}
        {accent && (
          <>
            {' '}
            <span className="accent">{accent}</span>
          </>
        )}
      </h2>
      {intro && (
        <p className="section-header__intro" data-reveal style={vars({ '--reveal-i': 2 })}>
          {intro}
        </p>
      )}
    </header>
  )
}

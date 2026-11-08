import type { ReactNode } from 'react'

/** The honest line shown wherever a concept would send something to a real business. */
export function ConceptNotice({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return (
    <p className={`cx-notice ${className}`} role="note">
      <span className="cx-notice__dot" aria-hidden="true" />
      {children ?? 'Concept website: nothing is sent, booked or charged.'}
    </p>
  )
}

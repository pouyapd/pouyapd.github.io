import type { ComponentType } from 'react'
import type { ConceptSite } from '../content/types'

/** A concept website: its page component and the sub-pages it has (prerendered as /work/<slug>/<path>/). */
export interface ConceptModule {
  Site: ComponentType<ConceptProps>
  /** '' is the home page; e.g. 'collection', 'pieces/ondine-stack'. */
  paths: string[]
  /** Title of a sub-page, for <title> (the home page uses the brand name). */
  title?: (path: string) => string | undefined
}

export interface ConceptProps {
  site: ConceptSite
  path: string
}

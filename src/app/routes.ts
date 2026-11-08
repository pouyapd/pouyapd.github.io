import type { ConceptSite } from '../content/types'

/** 'home', 'not-found', or a page under /work/: 'work/<slug>' (the concept website), 'work/<slug>/<path>'. */
export type Route = 'home' | 'not-found' | `work/${string}`

export type Parsed =
  | { kind: 'home' }
  | { kind: 'not-found' }
  /** the notes on how a concept was designed (the case study) */
  | { kind: 'case'; site: ConceptSite }
  /** a page of the concept website itself; path '' is its home page */
  | { kind: 'concept'; site: ConceptSite; path: string }

export const CASE_STUDY = 'case-study'

export function parseRoute(route: Route, sites: ConceptSite[]): Parsed {
  if (route === 'home' || route === 'not-found') return { kind: route }
  const [, slug, ...rest] = route.replace(/\/+$/, '').split('/')
  const site = sites.find((s) => s.slug === slug)
  if (!site) return { kind: 'not-found' }
  const path = rest.join('/')
  if (path === CASE_STUDY) return { kind: 'case', site }
  return { kind: 'concept', site, path }
}

/** In development there is no prerender: read the route from the address bar. */
export function routeFromLocation(base: string): Route {
  const p = location.pathname.slice(base.length - 1).replace(/^\/+|\/+$/g, '')
  return p.startsWith('work/') ? (p as Route) : 'home'
}

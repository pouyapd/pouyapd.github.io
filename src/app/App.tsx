import { useEffect } from 'react'
import { getContent, type PageContent } from '../content'
import { SiteFooter } from '../components/layout/SiteFooter'
import { SiteHeader } from '../components/layout/SiteHeader'
import { initReveal } from '../components/motion/reveal'
import { ProjectPage } from '../components/project/ProjectPage'
import { Contact } from '../components/sections/Contact'
import { Hero } from '../components/sections/Hero'
import { Services } from '../components/sections/Services'
import { Approach, Studio } from '../components/sections/Studio'
import { Work } from '../components/sections/Work'
import { ConceptFrame } from '../concepts/ConceptFrame'
import type { ConceptModule } from '../concepts/types'
import { NotFound } from './NotFound'
import { asset } from './paths'
import { parseRoute, type Route } from './routes'
import { isLight } from './style'

export type { Route } from './routes'

/** On other pages, the in-page anchors point back to the home page. */
function navFor(nav: PageContent['nav'], home: boolean): PageContent['nav'] {
  if (home) return nav
  const out = (href: string) => (href.startsWith('#') ? `${asset('')}${href}` : href)
  return {
    ...nav,
    homeLabel: nav.homePageLabel,
    items: nav.items.map((i) => ({ ...i, href: out(i.href) })),
    cta: { ...nav.cta, href: out(nav.cta.href) },
  }
}

/**
 * The studio site (home page, case studies) and the concept websites. A
 * concept's own module is passed in: loaded before hydration on the client
 * (src/main.tsx), imported directly when prerendering (src/entry-server.tsx).
 */
export function App({ route = 'home', concept }: { route?: Route; concept?: ConceptModule }) {
  const content = getContent()
  const page = parseRoute(route, content.work.sites)

  useEffect(() => initReveal(), [])

  if (page.kind === 'not-found') return <NotFound content={content.notFound} nav={content.nav} />

  if (page.kind === 'concept') {
    if (!concept || !concept.paths.includes(page.path)) return <NotFound content={content.notFound} nav={content.nav} />
    return (
      <ConceptFrame site={page.site}>
        <concept.Site site={page.site} path={page.path} />
      </ConceptFrame>
    )
  }

  const project = page.kind === 'case' ? page.site : undefined
  const nav = navFor(content.nav, !project)

  return (
    <>
      <a className="skip-link" href="#main">
        {content.nav.skipLink}
      </a>
      <SiteHeader nav={nav} homeHref={project ? asset('') : '#top'} tone={project && isLight(project.stage) ? 'light' : 'dark'} />
      <main id="main" tabIndex={-1}>
        {project ? (
          <ProjectPage site={project} all={content.work.sites} labels={content.work.project} />
        ) : (
          <>
            <Hero content={content.hero} />
            <Work content={content.work} />
            <Services content={content.services} />
            <Approach content={content.approach} />
            <Studio content={content.studio} />
            <Contact content={content.contact} />
          </>
        )}
      </main>
      <SiteFooter nav={nav} content={content.footer} />
    </>
  )
}

import type { PageContent } from '../content/types'
import { asset } from './paths'
import { ButtonLink } from '../components/ui/Button'
import { Logo } from '../components/ui/Logo'
import './not-found.css'

/** Prerendered to 404.html — GitHub Pages serves it for unknown paths. */
export function NotFound({ content, nav }: { content: PageContent['notFound']; nav: PageContent['nav'] }) {
  return (
    <main className="not-found" id="main">
      <a className="not-found__home" href={asset('')} aria-label={nav.homePageLabel}>
        <Logo height="3rem" />
      </a>
      <div className="not-found__body">
        <p className="not-found__code" aria-hidden="true">
          404
        </p>
        <h1 className="not-found__title">{content.title}</h1>
        <p className="not-found__text">{content.text}</p>
        <ButtonLink href={asset('')}>{content.cta}</ButtonLink>
      </div>
    </main>
  )
}

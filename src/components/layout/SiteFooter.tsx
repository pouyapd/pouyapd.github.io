import { site } from '../../config/site'
import type { PageContent } from '../../content/types'
import { Icon } from '../ui/Icon'
import { Logo } from '../ui/Logo'
import './site-footer.css'

export function SiteFooter({ nav, content }: { nav: PageContent['nav']; content: PageContent['footer'] }) {
  const year = new Date().getFullYear()
  const { email } = site.contact

  return (
    <footer className="site-footer" id="site-footer">
      <div className="container">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <Logo height="clamp(2.6rem, 2.2rem + 1.1vw, 3.4rem)" />
            <p className="site-footer__tagline">{content.tagline}</p>
          </div>

          <nav className="site-footer__col" id="footer-nav" aria-label={content.navTitle}>
            <p className="site-footer__heading">{content.navTitle}</p>
            <ul role="list">
              {nav.items.map((item) => (
                <li key={item.href}>
                  <a href={item.href}>{item.label}</a>
                </li>
              ))}
              <li>
                <a href={nav.cta.href}>{nav.cta.label}</a>
              </li>
            </ul>
          </nav>

          <div className="site-footer__col">
            <p className="site-footer__heading">{content.contactTitle}</p>
            <ul role="list">
              <li>
                <a href={`mailto:${email}`}>{email}</a>
              </li>
            </ul>
          </div>

          {site.social.length > 0 && (
            <div className="site-footer__col">
              <p className="site-footer__heading">{content.socialTitle}</p>
              <ul role="list">
                {site.social.map((s) => (
                  <li key={s.href}>
                    <a href={s.href} rel="me noopener noreferrer" target="_blank" aria-label={`${s.label} (${content.newTab})`}>
                      <Icon name={s.icon} />
                      {s.label}
                      <Icon name="arrow-up-right" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="site-footer__bottom">
          {/* Year comes from the build; the live page may run in a later year. */}
          <p suppressHydrationWarning>
            © {year} {site.name}
          </p>
          <p>{content.note}</p>
          <a className="site-footer__top-link" href="#top">
            {content.backToTop}
            <Icon name="arrow-up" />
          </a>
        </div>
      </div>
    </footer>
  )
}

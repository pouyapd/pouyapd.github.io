import { useEffect, useRef, useState } from 'react'
import { asset } from '../../app/paths'
import { isLight, vars } from '../../app/style'
import credits from '../../content/generated/credits.json'
import type { ConceptSite, PageContent } from '../../content/types'
import { ButtonLink } from '../ui/Button'
import { BrowserFrame, PhoneFrame } from '../ui/DeviceFrames'
import { Icon } from '../ui/Icon'
import { PagePreview } from '../ui/PagePreview'
import { ResponsiveImage } from '../ui/ResponsiveImage'
import { Wordmark } from '../ui/Wordmark'
import './project.css'

/** How each concept typeface is loaded on these pages (project.css) and set, as in the concept. */
const FACES: Record<string, { family: string; style?: string; weight?: number; stretch?: string }> = {
  'Bodoni Moda': { family: "'Bodoni Moda Variable', serif", weight: 400 },
  Jost: { family: "'Jost Variable', sans-serif", weight: 400 },
  Fraunces: { family: "'Fraunces Variable', serif", style: 'italic', weight: 400 },
  Inter: { family: "'Inter Variable', sans-serif", weight: 400 },
  'Cormorant Garamond': { family: "'Cormorant Garamond', serif", weight: 300 },
  Manrope: { family: "'Manrope Variable', sans-serif", weight: 500 },
  'Archivo Condensed': { family: "'Archivo Variable', 'Arial Narrow', sans-serif", weight: 800, stretch: '62%' },
  Archivo: { family: "'Archivo Variable', sans-serif", weight: 400 },
  Geist: { family: "'Geist Variable', sans-serif", weight: 400 },
  'Instrument Serif': { family: "'Instrument Serif', serif", style: 'italic', weight: 400 },
}

/** The display face of each case study (its headings use the concept's own voice). */
const DISPLAY: Record<string, { family: string; weight: number; tracking: string; stretch?: string; transform?: string }> = {
  lune: { family: "'Cormorant Garamond', 'Iowan Old Style', Georgia, serif", weight: 300, tracking: '-0.02em' },
  'maison-aurel': { family: "'Bodoni Moda Variable', 'Didot', Georgia, serif", weight: 400, tracking: '-0.02em' },
  anar: { family: "'Fraunces Variable', Georgia, serif", weight: 380, tracking: '-0.025em' },
  tensile: { family: "'Archivo Variable', 'Arial Narrow', sans-serif", weight: 800, tracking: '0', stretch: '62%', transform: 'uppercase' },
  'p-design': { family: "'Geist Variable', system-ui, sans-serif", weight: 400, tracking: '-0.035em' },
}

/**
 * A line set in a concept typeface. The face is applied once the line is near
 * the viewport, so its font file never competes with the page's first images
 * (without JavaScript it applies straight away, see project.css).
 */
function Specimen({ face, children }: { face?: (typeof FACES)[string]; children: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || near) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '50% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [near])
  return (
    <span
      ref={ref}
      className={`project__specimen${near ? ' is-near' : ''}`}
      style={face && vars({ '--face': face.family, '--face-style': face.style ?? 'normal', '--face-weight': face.weight ?? 400, '--face-stretch': face.stretch ?? '100%' })}
    >
      {children}
    </span>
  )
}

interface Props {
  site: ConceptSite
  all: ConceptSite[]
  labels: PageContent['work']['project']
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Dark or light text for a colour swatch, whichever has the higher WCAG contrast. */
function textOn(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16)
  const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
  return (L + 0.05) / 0.05 > 1.05 / (L + 0.05) ? '#1a1410' : '#f6f0e9'
}

/**
 * A concept's case study (/work/<slug>/), set in the concept's own palette and
 * display typeface: the cover and overview, the brief and direction, the full
 * homepage (scrollable), its key sections one by one with the reasoning, the
 * phone layout, the design decisions and system, an honest status, the
 * photography credits, and the next concept.
 */
export function ProjectPage({ site, all, labels }: Props) {
  const light = isLight(site.stage)
  const i = all.findIndex((s) => s.slug === site.slug)
  const next = all[(i + 1) % all.length]
  const home = asset('')
  const display = DISPLAY[site.slug]
  const photoCredits = [...((credits as Record<string, { key: string; photographer: string; page: string; subject: string }[]>)[site.photoSet] ?? []), ...(site.credits ?? []).map((c) => ({ ...c, key: c.page }))]
  const cover = site.cover
  const shot = (id: string, variant: 'desktop' | 'mobile') => `${site.preview}-shot-${id}-${variant}`

  return (
    <article
      className={`project${light ? ' project--light' : ''}`}
      style={vars({
        '--stage': site.stage,
        '--ink': site.ink,
        '--accent': site.accent,
        '--display': display?.family ?? 'var(--font-accent)',
        '--display-weight': display?.weight ?? 400,
        '--display-tracking': display?.tracking ?? '-0.02em',
        '--display-stretch': display?.stretch ?? '100%',
        '--display-transform': display?.transform ?? 'none',
      })}
      aria-labelledby="project-title"
    >
      {/* cover ------------------------------------------------------------ */}
      <header className="project__hero" id="top">
        <div className="container project__hero-grid">
          <div className="project__hero-copy">
            <nav className="project__crumbs" aria-label="Breadcrumb">
              <a href={`${home}#work`}>
                <Icon name="arrow-right" className="project__back-icon" />
                {labels.back}
              </a>
            </nav>
            <p className="project__meta">
              <span className="project__tag">{site.kind}</span>
              <span>{site.sector}</span>
            </p>
            <h1 id="project-title" className={`project__title project__title--${site.slug}`}>
              <span className="visually-hidden">{site.title}</span>
              <Wordmark slug={site.slug} />
            </h1>
            <p className="project__intro">{site.intro}</p>
            <div className="project__actions">
              <ButtonLink href={`${home}#contact`} className="project__cta">
                {labels.cta}
              </ButtonLink>
              <a className="project__jump" href="#p-homepage">
                {labels.seeDesign}
                <Icon name="arrow-right" className="project__jump-icon" />
              </a>
              <a className="project__live" href={site.liveUrl ?? asset(`work/${site.slug}/`)}>
                {labels.live}
                <Icon name="arrow-up-right" />
              </a>
            </div>
          </div>
          <figure className="project__cover" style={{ viewTransitionName: `cover-${site.slug}` }}>
            <ResponsiveImage
              group={cover.group ?? 'photos'}
              name={cover.group === 'hero' ? cover.key : `${site.photoSet}-${cover.key}`}
              alt={cover.alt}
              focus={cover.focus}
              sizes="(max-width: 900px) 100vw, 48vw"
              eager
              priority
            />
            <figcaption>{site.tagline}</figcaption>
          </figure>
        </div>

        <dl className="container project__facts">
          <div>
            <dt>{labels.factSector}</dt>
            <dd>{site.sector}</dd>
          </div>
          <div>
            <dt>{labels.factYear}</dt>
            <dd>{site.year}</dd>
          </div>
          <div>
            <dt>{labels.factScope}</dt>
            <dd>{site.details.scope.slice(0, 2).join(', ')}</dd>
          </div>
          <div>
            <dt>{labels.status}</dt>
            <dd>{site.own ? 'The studio’s own brand' : labels.statusShort}</dd>
          </div>
        </dl>
      </header>

      {/* brief and direction ---------------------------------------------- */}
      <section className="project__band container project__story" aria-labelledby="p-brief">
        <p className="project__h" id="p-brief">
          {labels.brief}
        </p>
        <p className="project__lead" data-reveal>
          {site.details.brief}
        </p>
        <div className="project__story-grid">
          <div data-reveal>
            <h2 className="project__h">{labels.direction}</h2>
            <p>{site.details.direction}</p>
          </div>
          <div data-reveal style={vars({ '--reveal-i': 1 })}>
            <h2 className="project__h">{labels.features}</h2>
            <ol className="project__features" role="list">
              {site.features.map((f) => (
                <li key={f.title}>
                  <b>{f.title}</b> — {f.text}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* key journeys ------------------------------------------------------ */}
      <section className="project__band container" aria-labelledby="p-journeys">
        <div className="project__section-head">
          <p className="project__h">{labels.journeys}</p>
          <h2 id="p-journeys" className="project__display">
            {labels.journeysTitle}
          </h2>
        </div>
        <ol className="project__journeys" role="list">
          {site.journeys.map((j, n) => (
            <li key={j.title} data-reveal style={vars({ '--reveal-i': n })}>
              <h3>
                <span className="project__num">{pad(n + 1)}</span>
                {j.title}
              </h3>
              <ol className="project__path" role="list">
                {j.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      </section>

      {/* the whole homepage ------------------------------------------------ */}
      <section className="project__band project__showcase-band" id="p-homepage" aria-labelledby="p-homepage-title">
        <div className="container">
          <div className="project__section-head">
            <p className="project__h">{labels.homepage}</p>
            <h2 id="p-homepage-title" className="project__display">
              {labels.homepageTitle}
            </h2>
            <p className="project__hint">{labels.scrollHint}</p>
          </div>
          <div className="project__showcase">
            <figure className="project__desktop" data-reveal>
              <BrowserFrame url={site.url} tone={light ? 'light' : 'dark'}>
                <PagePreview
                  name={`${site.preview}-desktop`}
                  alt={site.previewAlt}
                  sizes="(max-width: 900px) 92vw, 66vw"
                  mode="native"
                  regionLabel={`${site.title}, ${labels.desktop}. ${labels.scrollHint}`}
                />
              </BrowserFrame>
              <figcaption>{labels.desktop}</figcaption>
            </figure>
            <figure className="project__mobile" data-reveal style={vars({ '--reveal-i': 1 })}>
              <PhoneFrame>
                <PagePreview
                  name={`${site.preview}-mobile`}
                  alt=""
                  sizes="(max-width: 900px) 44vw, 20vw"
                  mode="native"
                  regionLabel={`${site.title}, ${labels.mobile}. ${labels.scrollHint}`}
                />
              </PhoneFrame>
              <figcaption>{labels.mobile}</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* key sections, one by one ------------------------------------------ */}
      <section className="project__band container" aria-labelledby="p-sections">
        <div className="project__section-head">
          <p className="project__h">{labels.sections}</p>
          <h2 id="p-sections" className="project__display">
            {labels.sectionsTitle}
          </h2>
        </div>
        <ol className="project__spots" role="list">
          {site.spotlights.map((s, n) => (
            <li key={s.shot} className={`project__spot${n % 2 ? ' project__spot--flip' : ''}`}>
              <div className="project__spot-media" data-reveal="clip">
                <div className="project__spot-frame">
                  <span className="project__spot-bar" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  <ResponsiveImage group="shots" name={shot(s.shot, 'desktop')} alt={`${site.title}: ${s.title}`} sizes="(max-width: 900px) 92vw, 62vw" />
                </div>
              </div>
              <div className="project__spot-text" data-reveal>
                <span className="project__num">{pad(n + 1)}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* on a phone --------------------------------------------------------- */}
      <section className="project__band project__phones-band" aria-labelledby="p-responsive">
        <div className="container">
          <div className="project__section-head">
            <p className="project__h">{labels.responsive}</p>
            <h2 id="p-responsive" className="project__display">
              {labels.responsiveTitle}
            </h2>
          </div>
          {/* scrolls sideways on small screens: focusable so the keyboard can scroll it too */}
          <ul className="project__phones" role="list" tabIndex={0} aria-labelledby="p-responsive">
            {site.phones.map((p, n) => (
              <li key={p.shot} data-reveal style={vars({ '--reveal-i': n })}>
                <PhoneFrame>
                  <ResponsiveImage group="shots" name={shot(p.shot, 'mobile')} alt={`${site.title} on a phone: ${p.caption}`} sizes="(max-width: 640px) 70vw, 22vw" />
                </PhoneFrame>
                <p>{p.caption}</p>
              </li>
            ))}
          </ul>
          <ul className="project__notes" role="list">
            {site.responsive.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* decisions and system ---------------------------------------------- */}
      <section className="project__band container" aria-labelledby="p-decisions">
        <div className="project__section-head">
          <p className="project__h">{labels.decisions}</p>
          <h2 id="p-decisions" className="project__display">
            {labels.decisionsTitle}
          </h2>
        </div>
        <ul className="project__decisions" role="list">
          {site.decisions.map((d, n) => (
            <li key={d.title} data-reveal style={vars({ '--reveal-i': n % 2 })}>
              <span className="project__num">{pad(n + 1)}</span>
              <h3>{d.title}</h3>
              <p>{d.text}</p>
            </li>
          ))}
        </ul>

        <div className="project__system">
          <div>
            <p className="project__h">{labels.palette}</p>
            <ul className="project__palette" role="list">
              {site.palette.map((c) => (
                <li key={c.hex} style={{ background: c.hex, color: textOn(c.hex) }}>
                  <span>{c.name}</span>
                  <code>{c.hex}</code>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="project__h">{labels.type}</p>
            <ul className="project__type" role="list">
              {site.typefaces.map((t) => (
                <li key={t.name}>
                  <span className="project__type-name">
                    {t.name}
                    <small>{t.role}</small>
                  </span>
                  <Specimen face={FACES[t.name]}>{t.sample}</Specimen>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {site.imagery.photos.length > 0 && (
      <section className="project__band project__imagery" aria-labelledby="p-imagery">
        <div className="container">
          <div className="project__section-head project__section-head--split">
            <div>
              <p className="project__h">{labels.imagery}</p>
              <h2 id="p-imagery" className="project__display">
                {labels.imageryTitle}
              </h2>
            </div>
            <p className="project__imagery-text">{site.imagery.text}</p>
          </div>
          <ul className="project__photos" role="list">
            {site.imagery.photos.map((ph, n) => (
              <li key={ph.key} data-reveal="clip" style={vars({ '--reveal-i': n })}>
                <ResponsiveImage group="photos" name={`${site.photoSet}-${ph.key}`} alt={ph.alt} focus={ph.focus} sizes="(max-width: 640px) 50vw, 20vw" />
              </li>
            ))}
          </ul>
        </div>
      </section>
      )}

      {/* status, credits ---------------------------------------------------- */}
      <section className="project__band container project__status-band" aria-labelledby="p-status">
        <div>
          <h2 id="p-status" className="project__h">
            {labels.status}
          </h2>
          <p className="project__status">{site.details.status}</p>
        </div>
        <div className="project__progress">
          <div>
            <p className="project__sub">{labels.done}</p>
            <ul className="project__list project__list--done" role="list">
              {site.implementation.done.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="project__sub">{labels.next}</p>
            <ul className="project__list project__list--next" role="list">
              {site.implementation.next.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
        {photoCredits.length > 0 && (
          <details className="project__credits">
            <summary>
              {labels.credits} ({photoCredits.length})
            </summary>
            <p>{site.creditsNote ?? labels.creditsNote}</p>
            <ul role="list">
              {photoCredits.map((c) => (
                <li key={c.key}>
                  <a href={c.page} target="_blank" rel="noopener noreferrer">
                    {c.photographer}
                  </a>{' '}
                  — {c.subject}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {/* next concept + contact -------------------------------------------- */}
      <nav className="project__next" aria-label={labels.more}>
        <a
          href={asset(`work/${next.slug}/`)}
          className={`project__next-link${isLight(next.stage) ? ' project__next-link--light' : ''}`}
          style={vars({ '--stage': next.stage, '--ink': next.ink, '--accent': next.accent })}
        >
          <ResponsiveImage group="photos" name={`${next.photoSet}-${next.cover.key}`} alt="" focus={next.cover.focus} sizes="100vw" className="project__next-img" defer />
          <span className="container project__next-inner">
            <span className="project__next-label">{labels.nextProject}</span>
            <span className={`project__next-name project__next-name--${next.slug}`}>
              <span className="visually-hidden">{next.title}</span>
              <Wordmark slug={next.slug} />
            </span>
            <span className="project__next-sector">
              {next.sector}
              <Icon name="arrow-right" />
            </span>
          </span>
        </a>
      </nav>

      <section className="project__contact container" aria-labelledby="p-contact">
        <h2 id="p-contact" className="project__contact-text">
          {labels.ctaText}
        </h2>
        <ButtonLink href={`${home}#contact`}>{labels.cta}</ButtonLink>
      </section>
    </article>
  )
}

import { asset } from '../../app/paths'
import { vars } from '../../app/style'
import type { PageContent, Service } from '../../content/types'
import { Icon } from '../ui/Icon'
import { ResponsiveImage } from '../ui/ResponsiveImage'
import { SectionHeader } from '../ui/SectionHeader'
import './services.css'

/**
 * One service: a real page from the project that shows it (when it has one;
 * otherwise the service is a text entry), the title, two lines on what it is
 * for, what it covers, and the way into that project. The picture is a link
 * to the first example, hidden from assistive technology (the named links
 * below it carry the same destination).
 */
function ServiceCard({ service, index, seenIn }: { service: Service; index: number; seenIn: string }) {
  const { image } = service
  const group = image?.group ?? 'photos'
  return (
    <article className={`service${image ? '' : ' service--text'}`} aria-labelledby={`service-${service.id}`} data-reveal style={vars({ '--reveal-i': index % 2 })}>
      {image && (
        <a className={`service__media service__media--${group}`} href={asset(service.examples[0].href)} tabIndex={-1} aria-hidden="true">
          <ResponsiveImage group={group} name={image.key} alt="" focus={image.focus} defer sizes="(max-width: 760px) 92vw, 46vw" />
        </a>
      )}
      <h3 id={`service-${service.id}`} className="service__title">
        {service.title}
      </h3>
      <p className="service__summary">{service.summary}</p>
      <p className="service__includes">{service.includes.join(' · ')}</p>
      <p className="service__examples">
        <span className="service__seen">{seenIn}</span>
        {service.examples.map((e, i) => (
          // the separator wraps with the link it introduces, never alone at a line end
          <span key={e.href} className="service__example">
            {i > 0 && <span aria-hidden="true">·</span>}
            <a href={asset(e.href)}>
              {e.label}
              <Icon name="arrow-right" />
            </a>
          </span>
        ))}
      </p>
    </article>
  )
}

/** Services: the kinds of work — those with a page to show first, the others as text beneath them. */
export function Services({ content }: { content: PageContent['services'] }) {
  const shown = content.items.filter((s) => s.image)
  const listed = content.items.filter((s) => !s.image)
  return (
    <section className="services section" id="services" aria-labelledby="services-title">
      <div className="container">
        <SectionHeader id="services-title" eyebrow={content.eyebrow} title={content.title} accent={content.titleAccent} intro={content.intro} />
        <div className="services__grid">
          {shown.map((s, i) => (
            <ServiceCard key={s.id} service={s} index={i} seenIn={content.seenIn} />
          ))}
        </div>
        {listed.length > 0 && (
          <div className="services__more">
            {listed.map((s, i) => (
              <ServiceCard key={s.id} service={s} index={i} seenIn={content.seenIn} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

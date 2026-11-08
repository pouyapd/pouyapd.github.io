import { asset } from '../../app/paths'
import { vars } from '../../app/style'
import type { PageContent } from '../../content/types'
import { Icon } from '../ui/Icon'
import { SectionHeader } from '../ui/SectionHeader'
import './studio.css'

/** Approach: how a project moves, in four steps — what happens, and what you have at the end of it. */
export function Approach({ content }: { content: PageContent['approach'] }) {
  return (
    <section className="process section" id="approach" aria-labelledby="approach-title">
      <div className="container process__grid">
        <SectionHeader id="approach-title" stacked eyebrow={content.eyebrow} title={content.title} accent={content.titleAccent} intro={content.intro} />
        <ol className="process__steps" role="list">
          {content.process.map((step, i) => (
            <li key={step.title} className="process-step" data-reveal style={vars({ '--reveal-i': i })}>
              <span className="process-step__num">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="process-step__title">{step.title}</h3>
              <p className="process-step__text">{step.text}</p>
              <p className="process-step__outcome">{step.outcome}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/** Studio: a short introduction — who you work with, how the work is labelled — and the studio's own identity. */
export function Studio({ content }: { content: PageContent['studio'] }) {
  return (
    <section className="about section" id="studio" aria-labelledby="studio-title">
      <div className="container about__grid">
        <div className="about__intro">
          <SectionHeader id="studio-title" stacked eyebrow={content.eyebrow} title={content.title} accent={content.titleAccent} intro={content.intro} />
          <a className="about__link" href={asset(content.link.href)} data-reveal style={vars({ '--reveal-i': 3 })}>
            {content.link.label}
            <Icon name="arrow-right" />
          </a>
        </div>
        <ul className="about__points" role="list">
          {content.points.map((p, i) => (
            <li key={p.title} data-reveal style={vars({ '--reveal-i': i })}>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

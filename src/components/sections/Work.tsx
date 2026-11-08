import type { PageContent } from '../../content/types'
import { SectionHeader } from '../ui/SectionHeader'
import { Assemble } from './work/Assemble'
import { Orbit } from './work/Orbit'
import { Ring } from './work/Ring'
import { TechniqueCase } from './work/TechniqueCase'
import './work.css'

/** Each project's presentation (content/en/projects.ts → showcase.style). */
const PRESENTATION = { ring: Ring, orbit: Orbit, assemble: Assemble, technique: TechniqueCase }

/**
 * Selected Work: the four commercial projects, each shown in the way that
 * suits its brand — a ring from the shop turning in the light (Maison
 * Aurel), six pages turning on a ring (Lune), scattered pages that assemble
 * into a desktop and a phone (Anar), and the website beside its own live
 * technique module (Tensile).
 */
export function Work({ content }: { content: PageContent['work'] }) {
  const featured = content.sites.filter((s) => s.featured !== false)
  return (
    <section className="work section" id="work" aria-labelledby="work-title">
      <div className="container">
        <SectionHeader id="work-title" eyebrow={content.eyebrow} title={content.title} accent={content.titleAccent} intro={content.intro} />
        <div className="work__cases">
          {featured.map((s, i) => {
            const Case = PRESENTATION[s.showcase?.style ?? 'ring']
            return <Case key={s.slug} site={s} index={i} viewLabel={content.viewLabel} notesLabel={content.notesLabel} />
          })}
        </div>
      </div>
    </section>
  )
}

import { useEffect, useRef, useState, type ComponentType } from 'react'
import { useNear } from '../../motion/useNear'
import { BrowserFrame, PhoneFrame } from '../../ui/DeviceFrames'
import { PagePreview } from '../../ui/PagePreview'
import { ResponsiveImage } from '../../ui/ResponsiveImage'
import { CaseActions, CaseIntro, CaseShell, siteHref, type CaseProps } from './parts'
import './technique-case.css'

type TechniqueModule = ComponentType<{ classesHref: string; compact?: boolean }>

/**
 * Technique: Tensile's preview shows the website itself — the home page in a
 * browser (hover to glide through it), the timetable on a phone, and three
 * more pages — and, below, one part of it working: the technique library
 * (src/concepts/tensile/Technique.tsx), live in its own browser frame with
 * the 3D lifts, their controls and cues. The module, its code and its
 * typeface load only when it comes near the screen; until then the frame
 * holds its size.
 */
export function TechniqueCase({ site, index, viewLabel, notesLabel }: CaseProps) {
  const frame = useRef<HTMLDivElement>(null)
  const near = useNear(frame, '600px')
  const [Module, setModule] = useState<TechniqueModule | null>(null)
  const pages = site.showcase?.sections ?? []

  useEffect(() => {
    if (!near) return
    let gone = false
    import('../../../concepts/tensile/Technique').then((m) => !gone && setModule(() => m.Technique))
    return () => {
      gone = true
    }
  }, [near])

  return (
    <CaseShell site={site} style="technique">
      <span className="tech__photo" aria-hidden="true">
        <ResponsiveImage name={`${site.photoSet}-${site.cover.key}`} alt="" focus="30% 40%" defer sizes="(max-width: 1000px) 100vw, 60vw" />
      </span>
      <div className="case__body tech__text">
        <CaseIntro site={site} index={index} />
        {site.showcase?.note && <p className="case__note">{site.showcase.note}</p>}
        <CaseActions site={site} viewLabel={viewLabel} notesLabel={notesLabel} />
      </div>
      <div className="tech__site">
        <BrowserFrame url={site.url} className="tech__browser">
          <PagePreview name={`${site.preview}-desktop`} alt={site.previewAlt} sizes="(max-width: 1000px) 92vw, 52vw" />
        </BrowserFrame>
        <PhoneFrame className="tech__phone">
          <ResponsiveImage group="shots" name={`${site.preview}-shot-timetable-mobile`} alt={`${site.title} on a phone: this week’s timetable, filtered by day, discipline and coach.`} defer sizes="(max-width: 1000px) 26vw, 10vw" />
        </PhoneFrame>
      </div>
      <div className="tech__demo" ref={frame}>
        <BrowserFrame url={`${site.url}/#technique`} className="tech__browser tech__browser--demo">
          {Module ? <Module classesHref={siteHref(site, 'classes/#strength')} compact /> : <span className="tech__wait" />}
        </BrowserFrame>
      </div>
      <ul className="tech__pages" role="list">
        {pages.map((s) => (
          <li key={s.shot}>
            <a href={siteHref(site, s.path)}>
              <span className="tech__thumb">
                <ResponsiveImage group="shots" name={`${site.preview}-shot-${s.shot}-desktop`} alt="" defer sizes="(max-width: 1000px) 44vw, 16vw" />
              </span>
              <span className="tech__page">
                <b>{s.label}</b>
                <span>{s.text}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </CaseShell>
  )
}

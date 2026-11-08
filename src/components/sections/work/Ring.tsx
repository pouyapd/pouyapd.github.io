import { useRef } from 'react'
import { isLight } from '../../../app/style'
import { useSolitaire } from '../../motion/lab/useSolitaire'
import { useTilt } from '../../motion/useTilt'
import { BrowserFrame, PhoneFrame } from '../../ui/DeviceFrames'
import { PagePreview } from '../../ui/PagePreview'
import { ResponsiveImage } from '../../ui/ResponsiveImage'
import { CaseActions, CaseIntro, CaseShell, type CaseProps } from './parts'
import './ring.css'

/** Warm yellow, champagne and pale gold (reflectance at normal incidence, linear RGB). */
const GOLDS: [number, number, number][] = [
  [1.0, 0.74, 0.36],
  [0.97, 0.83, 0.62],
  [0.96, 0.89, 0.7],
]

/**
 * Ring: Maison Aurel's presentation. The Stella solitaire from the shop —
 * the same real-time model as on its product page (motion/lab/solitaire.ts,
 * ray traced: the diamond refracts, the metal reflects a studio) — stands in
 * the card's own light, with no frame round it, its contact shadow on the
 * ground. It turns slowly, and as it turns its metal moves between warm
 * yellow, champagne and pale gold. The real website sits over the scene in a
 * browser and on a phone. Until the model is drawn (or where WebGL is
 * missing) a still of the same model stands in, faded into the background.
 */
export function Ring({ site, index, viewLabel, notesLabel }: CaseProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const devicesRef = useRef<HTMLSpanElement>(null)
  useTilt(devicesRef)
  const ring = useSolitaire(canvas, 'yellow', { spin: 0.2, tones: GOLDS, yaw: 0.4 })
  const light = isLight(site.stage)
  return (
    <CaseShell site={site} style="ring">
      <div className="ring__scene" data-state={ring.state}>
        <span className="ring__light" aria-hidden="true" />
        <span className="ring__still" aria-hidden="true">
          <ResponsiveImage name={`${site.photoSet}-stella-render-front`} alt="" defer sizes="(max-width: 1000px) 80vw, 40vw" />
        </span>
        <canvas ref={canvas} className="ring__canvas" role="img" aria-label="The Stella solitaire, a round brilliant diamond on a gold band, turning slowly in the light." />
        <span className="case__devices" ref={devicesRef} aria-hidden="true">
          <BrowserFrame url={site.url} tone={light ? 'light' : 'dark'} className="case__browser">
            <PagePreview name={`${site.preview}-desktop`} alt="" sizes="(max-width: 900px) 60vw, 30vw" />
          </BrowserFrame>
          <PhoneFrame className="case__phone">
            <PagePreview name={`${site.preview}-mobile`} alt="" sizes="(max-width: 900px) 22vw, 9vw" />
          </PhoneFrame>
        </span>
      </div>
      <div className="case__body">
        <CaseIntro site={site} index={index} />
        <CaseActions site={site} viewLabel={viewLabel} notesLabel={notesLabel} />
      </div>
    </CaseShell>
  )
}

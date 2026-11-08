import { useCallback, useId, useRef, useState, type KeyboardEvent } from 'react'
import { asset } from '../../app/paths'
import type { Lift } from '../../components/motion/lab/lifts'
import { useLifts } from '../../components/motion/lab/useLifts'
import { prefersReducedMotion } from '../../components/motion/media'
import './technique.css'

/** The three lifts the strength classes teach, with the cues the coaches use. */
export const lifts: { id: Lift; label: string; works: string; cues: string[] }[] = [
  {
    id: 'squat',
    label: 'Back squat',
    works: 'Thighs, glutes and trunk',
    cues: [
      'The bar rests on the upper back and stays over the middle of the foot, down and up.',
      'Knees travel forward and out over the toes; heels stay down.',
      'Sit until the hip crease is below the knee, then drive up, chest leading.',
    ],
  },
  {
    id: 'bench',
    label: 'Bench press',
    works: 'Chest, shoulders and triceps',
    cues: [
      'Shoulder blades pulled together, feet flat on the floor.',
      'Lower the bar to the lower chest, forearms vertical under it.',
      'Press up and slightly back, until the bar is over the shoulders.',
    ],
  },
  {
    id: 'deadlift',
    label: 'Deadlift',
    works: 'Back, glutes and hamstrings',
    cues: [
      'Bar over the middle of the foot, shins close, shoulders just ahead of the bar.',
      'Back flat, arms long: push the floor away and keep the bar on the legs.',
      'Finish standing tall, hips through, without leaning back. Lower the same way.',
    ],
  },
]

/**
 * Technique: the three barbell lifts on a 3D demonstration figure. Choose a
 * lift, drag to walk round it, pause it, or move it through its range with
 * the slider. `compact` is the version shown inside the studio's portfolio
 * (it also carries the section's title); `classesHref` leads to the classes
 * that teach the lifts.
 */
export function Technique({ classesHref, compact = false }: { classesHref: string; compact?: boolean }) {
  const id = useId()
  const [lift, setLift] = useState<Lift>('squat')
  // the still under the live figure follows the lift only while it is the picture (before the figure is drawn, or without WebGL)
  const [stillLift, setStillLift] = useState<Lift>('squat')
  // null until the visitor chooses: then it plays, unless they prefer reduced motion (known once the figure is live)
  const [choice, setPlaying] = useState<boolean | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const range = useRef<HTMLInputElement>(null)
  const scrubbing = useRef(false)
  const onDepth = useCallback((d: number) => {
    if (range.current && !scrubbing.current) range.current.value = String(Math.round(d * 100))
  }, [])
  const demo = useLifts(canvas, lift, onDepth)
  const playing = choice ?? !(demo.state === 'live' && prefersReducedMotion())
  const current = lifts.find((l) => l.id === lift)!
  const tabs = useRef<(HTMLButtonElement | null)[]>([])

  const choose = (next: Lift) => {
    setLift(next)
    if (demo.state !== 'live') setStillLift(next)
    if (playing) demo.play(true)
  }
  const onKey = (e: KeyboardEvent, i: number) => {
    const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const n = (i + step + lifts.length) % lifts.length
    choose(lifts[n].id)
    tabs.current[n]?.focus()
  }
  const toggle = () => {
    const on = !playing
    setPlaying(on)
    demo.play(on)
  }

  return (
    <div className={`tq${compact ? ' tq--compact' : ''}`} data-state={demo.state}>
      {compact && (
        <div className="tq__head">
          <p className="tq__kicker">Technique</p>
          <p className="tq__title">
            Learn the lift. <em>Then load it.</em>
          </p>
        </div>
      )}
      <div className="tq__stage">
        {/* a still of the same figure (npm run render:lifts) until the live one is drawn: the shader can take seconds to compile on a first visit */}
        <img
          className="tq__still"
          src={asset(`media/lifts/${stillLift}-960.webp`)}
          srcSet={[960, 1680].map((w) => `${asset(`media/lifts/${stillLift}-${w}.webp`)} ${w}w`).join(', ')}
          sizes="(max-width: 760px) 200vw, 60vw"
          alt=""
          decoding="async"
        />
        <canvas ref={canvas} className="tq__canvas" role="img" aria-label={`A demonstration figure performing a ${current.label.toLowerCase()}.`} />
        {demo.state === 'failed' && <p className="tq__fallback">This browser could not start WebGL, so the demonstration cannot run here. The cues beside it still apply.</p>}
        <p className="tq__hint" aria-hidden="true">
          Drag to turn
        </p>
        <div className="tq__controls">
          {/* the label says what a press does (Play / Pause), so no aria-pressed: both together would contradict */}
          <button type="button" className="tq__play" onClick={toggle} disabled={demo.state !== 'live'}>
            {playing ? 'Pause' : 'Play'}
          </button>
          <label className="tq__range">
            <span className="tq__range-l">Top</span>
            <input
              ref={range}
              type="range"
              min={0}
              max={100}
              defaultValue={0}
              aria-label={`Position in the ${current.label.toLowerCase()}, from top to bottom`}
              disabled={demo.state !== 'live'}
              onPointerDown={() => (scrubbing.current = true)}
              onPointerUp={() => (scrubbing.current = false)}
              onInput={(e) => {
                setPlaying(false)
                demo.hold(Number(e.currentTarget.value) / 100)
              }}
            />
            <span className="tq__range-l">Bottom</span>
          </label>
        </div>
      </div>
      <div className="tq__side">
        <div className="tq__tabs" role="tablist" aria-label="Lift" aria-orientation="vertical">
          {lifts.map((l, i) => (
            <button
              key={l.id}
              ref={(el) => {
                tabs.current[i] = el
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${l.id}`}
              aria-selected={lift === l.id}
              aria-controls={`${id}-panel`}
              tabIndex={lift === l.id ? 0 : -1}
              className="tq__tab"
              onClick={() => choose(l.id)}
              onKeyDown={(e) => onKey(e, i)}
            >
              <span className="tq__tab-n">0{i + 1}</span>
              {l.label}
            </button>
          ))}
        </div>
        <div className="tq__panel" role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${lift}`}>
          <ol className="tq__cues" role="list">
            {current.cues.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ol>
          {!compact && (
            <p className="tq__works">
              <span>Works</span> {current.works}
            </p>
          )}
          <a className="tq__link" href={classesHref}>
            {compact ? 'The classes that teach it →' : 'Taught in Strength Foundations and Barbell Club →'}
          </a>
        </div>
        {!compact && <p className="tq__note">A simplified demonstration figure. In class, a coach sets the stance, grip and depth for you.</p>}
      </div>
    </div>
  )
}

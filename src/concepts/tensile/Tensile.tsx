import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { ConceptNotice } from '../shared/ConceptNotice'
import { CloseButton, Dialog } from '../shared/Dialog'
import { conceptHref, euro } from '../shared/links'
import { Photo } from '../shared/Photo'
import { Technique } from './Technique'
import type { ConceptModule, ConceptProps } from '../types'
import {
  classById,
  classTypes,
  coachById,
  coaches,
  comparison,
  DAY_NAMES,
  DAYS,
  disciplines,
  faqs,
  goals,
  placesLeft,
  plans,
  sessionId,
  timetable,
  type Coach,
  type Discipline,
  type Plan,
  type Session,
} from './data'
import './tensile.css'

const SET = 'tensile'
const SLUG = 'tensile'
const href = (path = '', hash = '') => conceptHref(SLUG, path, hash)

const NAV = [
  { path: 'classes', label: 'Classes' },
  { path: 'memberships', label: 'Memberships' },
  { path: 'coaches', label: 'Coaches' },
]

/** The sample timetable starts on a Monday; "today" is fixed so the page is the same on every visit. */
const TODAY = 2

/**
 * Tensile Athletic Club: a strength and conditioning club website. Members and
 * newcomers can compare memberships, browse the weekly timetable by day,
 * discipline and coach, open any class, hold a place, meet the coaches and
 * request a free trial. Every booking, join and request ends in an honest
 * concept notice: nothing is sent or booked.
 */
function Tensile({ path }: ConceptProps) {
  const [menu, setMenu] = useState(false)
  const [booked, setBooked] = useState<string[]>([])
  const hold = (id: string) => setBooked((b) => (b.includes(id) ? b : [...b, id]))
  return (
    <div className="t-root">
      <a className="t-announce" href={href('trial')}>
        <span>Your first week is free</span>
        <b>Start a trial →</b>
      </a>
      <header className="t-header">
        <div className="t-wrap t-nav">
          <a className="t-brand" href={href()}>
            <Wordmark />
          </a>
          <ul className="t-nav__links">
            {NAV.map((n) => (
              <li key={n.path}>
                <a href={href(n.path)} aria-current={path === n.path ? 'page' : undefined}>
                  {n.label}
                </a>
              </li>
            ))}
            <li>
              <a href={href('', 'visit')}>Visit</a>
            </li>
          </ul>
          <a className="t-btn t-btn--sm t-nav__cta" href={href('trial')} aria-current={path === 'trial' ? 'page' : undefined}>
            Free trial
          </a>
          <button type="button" className="t-burger" aria-label="Open the menu" aria-haspopup="dialog" onClick={() => setMenu(true)}>
            <i />
            <i />
            <i />
          </button>
        </div>
      </header>

      <Dialog open={menu} onClose={() => setMenu(false)} label="Menu" className="t-drawer">
        <div className="t-drawer__head">
          <Wordmark />
          <CloseButton onClick={() => setMenu(false)} />
        </div>
        <nav aria-label="Tensile Athletic Club">
          <ul className="t-drawer__links" role="list">
            {[{ path: '', label: 'Home' }, ...NAV].map((n) => (
              <li key={n.label}>
                <a href={href(n.path)} aria-current={path === n.path ? 'page' : undefined}>
                  {n.label}
                </a>
              </li>
            ))}
            <li>
              <a href={href('', 'visit')}>Opening hours</a>
            </li>
          </ul>
        </nav>
        <a className="t-btn t-btn--wide" href={href('trial')}>
          Start a free trial
        </a>
        <p className="t-drawer__note">Sample hours: Mon–Fri 6:00–22:00 · Sat–Sun 8:00–18:00</p>
      </Dialog>

      <main>
        {path === '' && <Home booked={booked} onHold={hold} />}
        {path === 'classes' && <Classes booked={booked} onHold={hold} />}
        {path === 'memberships' && <Memberships />}
        {path === 'coaches' && <Coaches />}
        {path === 'trial' && <Trial />}
      </main>

      <footer className="t-footer">
        <div className="t-wrap">
          <div className="t-foot">
            <div>
              <a className="t-brand" href={href()}>
                <Wordmark />
              </a>
              <p>Strength and conditioning, coached. A written programme, small classes and coaches who know your numbers.</p>
            </div>
            <div>
              <h2 className="t-foot__h">Train</h2>
              <ul role="list">
                <li>
                  <a href={href('classes')}>Timetable</a>
                </li>
                <li>
                  <a href={href('classes', 'strength')}>Strength</a>
                </li>
                <li>
                  <a href={href('classes', 'conditioning')}>Conditioning</a>
                </li>
                <li>
                  <a href={href('classes', 'mobility')}>Mobility</a>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="t-foot__h">Join</h2>
              <ul role="list">
                <li>
                  <a href={href('memberships')}>Memberships</a>
                </li>
                <li>
                  <a href={href('memberships', 'compare')}>Compare plans</a>
                </li>
                <li>
                  <a href={href('trial')}>Free trial</a>
                </li>
                <li>
                  <a href={href('coaches')}>Coaches</a>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="t-foot__h">Hours</h2>
              <p className="t-foot__hours">
                Mon–Fri 6:00–22:00
                <br />
                Sat–Sun 8:00–18:00
              </p>
              <p className="t-foot__small">Sample hours. Tensile is a fictional club, so there is no address.</p>
            </div>
          </div>
          <div className="t-legal">
            <span>Tensile Athletic Club is a fictional brand. Plans, prices, classes and coach profiles are sample content. Photographs: Unsplash.</span>
            <span>Concept website designed and built by P. DESIGN</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

/** The club's wordmark: condensed capitals with a bar under tension. */
function Wordmark() {
  return (
    <span className="t-wordmark">
      <b>Tensile</b> <i aria-hidden="true" /> <small>Athletic Club</small>
    </span>
  )
}

/* ---- shared parts ---- */

function Intensity({ value }: { value: number }) {
  return (
    <span className="t-intensity" role="img" aria-label={`Intensity ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <i key={n} className={n <= value ? 'is-on' : ''} />
      ))}
    </span>
  )
}

function PageHead({ kicker, title, children, photo }: { kicker: string; title: ReactNode; children?: ReactNode; photo?: { name: string; alt: string; focus: string } }) {
  return (
    <section className={`t-pagehead${photo ? ' t-pagehead--photo' : ''}`}>
      {photo && (
        <div className="t-pagehead__ph">
          <Photo set={SET} name={photo.name} alt={photo.alt} sizes="100vw" focus={photo.focus} priority />
        </div>
      )}
      <div className="t-wrap t-pagehead__in">
        <p className="t-kicker">{kicker}</p>
        <h1 className="t-display">{title}</h1>
        {children}
      </div>
    </section>
  )
}

/** One class in the timetable: open it for details and to hold a place. */
function SessionRow({ s, booked, onOpen }: { s: Session; booked: boolean; onOpen: (s: Session) => void }) {
  const c = classById(s.type)!
  const coach = coachById(s.coach)!
  const left = placesLeft(s)
  return (
    <li className={`t-session t-session--${c.discipline}`}>
      <span className="t-session__time">{s.time}</span>
      <span className="t-session__main">
        <b>{c.name}</b>
        <span>
          {coach.name} · {c.minutes} min · {c.level}
        </span>
      </span>
      <Intensity value={c.intensity} />
      <span className={`t-session__left${left === 0 ? ' is-full' : left <= 3 ? ' is-low' : ''}`}>
        {booked ? 'Place held' : left === 0 ? 'Full · waitlist' : `${left} ${left === 1 ? 'place' : 'places'} left`}
      </span>
      <button type="button" className="t-session__btn" onClick={() => onOpen(s)} aria-haspopup="dialog" aria-label={`${c.name}, ${DAY_NAMES[s.day]} ${s.time}: details and booking`}>
        {booked ? 'View' : 'Details'}
      </button>
    </li>
  )
}

/** A class in detail, with a sample booking form. */
function SessionDialog({ session, booked, onClose, onHold }: { session: Session | null; booked: string[]; onClose: () => void; onHold: (id: string) => void }) {
  const [step, setStep] = useState<'info' | 'form' | 'done'>('info')
  const [who, setWho] = useState({ name: '', email: '', status: 'member' })
  const [error, setError] = useState('')
  const c = session ? classById(session.type)! : null
  const coach = session ? coachById(session.coach)! : null
  const id = session ? sessionId(session) : ''
  const left = session ? placesLeft(session) : 0
  const held = booked.includes(id)
  const close = () => {
    setStep('info')
    setError('')
    onClose()
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!who.name.trim()) return setError('Add your name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(who.email)) return setError('Add a valid email address.')
    setError('')
    onHold(id)
    setStep('done')
  }
  return (
    <Dialog open={Boolean(session)} onClose={close} label={c ? `${c.name}, ${DAY_NAMES[session!.day]} ${session!.time}` : 'Class'} className="t-modal">
      {session && c && coach && (
        <div className="t-class">
          <div className="t-class__ph">
            <Photo set={SET} name={c.photo} alt={c.alt} sizes="(max-width: 760px) 100vw, 420px" focus={c.focus} />
          </div>
          <div className="t-class__body">
            <CloseButton onClick={close} className="t-modal__close" />
            <p className="t-kicker">
              {disciplines.find((d) => d.id === c.discipline)!.label} · {c.level}
            </p>
            <h2 className="t-display t-display--md">{c.name}</h2>
            <p className="t-class__when">
              {DAY_NAMES[session.day]} {session.time} · {c.minutes} min · with {coach.name}
            </p>

            {step === 'info' && (
              <>
                <p>{c.detail}</p>
                <div className="t-class__meta">
                  <div>
                    <span className="t-lbl">Intensity</span>
                    <Intensity value={c.intensity} />
                  </div>
                  <div>
                    <span className="t-lbl">Places</span>
                    <b>{held ? 'Your place is held' : left === 0 ? 'Full, waitlist open' : `${left} of ${c.capacity} left`}</b>
                  </div>
                </div>
                <p className="t-lbl">What to expect</p>
                <ul className="t-list" role="list">
                  {c.expect.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <p className="t-small">
                  <b>Bring:</b> {c.kit}
                </p>
                <div className="t-class__actions">
                  {held ? (
                    <ConceptNotice>Your place in this class is held in this concept only. Nothing was booked.</ConceptNotice>
                  ) : (
                    <button type="button" className="t-btn" onClick={() => setStep('form')}>
                      {left === 0 ? 'Join the waitlist' : 'Book a place'}
                    </button>
                  )}
                  <a className="t-btn t-btn--line" href={`${href('trial')}?class=${id}`}>
                    New here? Try it free
                  </a>
                </div>
              </>
            )}

            {step === 'form' && (
              <form className="t-form" onSubmit={submit} noValidate>
                <label>
                  <span>Name</span>
                  <input autoComplete="name" value={who.name} onChange={(e) => setWho({ ...who, name: e.target.value })} />
                </label>
                <label>
                  <span>Email</span>
                  <input type="email" autoComplete="email" value={who.email} onChange={(e) => setWho({ ...who, email: e.target.value })} />
                </label>
                <fieldset className="t-radios">
                  <legend className="t-lbl">I am</legend>
                  {[
                    ['member', 'A member'],
                    ['trial', 'On a free trial'],
                  ].map(([v, l]) => (
                    <label key={v}>
                      <input type="radio" name="t-status" value={v} checked={who.status === v} onChange={() => setWho({ ...who, status: v })} />
                      <span>{l}</span>
                    </label>
                  ))}
                </fieldset>
                {error && (
                  <p className="t-error" role="alert">
                    {error}
                  </p>
                )}
                <button type="submit" className="t-btn t-btn--wide">
                  {left === 0 ? 'Join the waitlist' : `Hold my place · ${session.time}`}
                </button>
                <button type="button" className="t-linkbtn" onClick={() => setStep('info')}>
                  ← Back to the class
                </button>
                <ConceptNotice>Concept website: holding a place only changes this page. Nothing is sent or booked.</ConceptNotice>
              </form>
            )}

            {step === 'done' && (
              <div className="t-done">
                <p className="t-kicker">Sample booking</p>
                <h3 className="t-display t-display--sm">
                  {left === 0 ? 'On the waitlist' : 'See you there'}, {who.name.trim().split(' ')[0]}.
                </h3>
                <p>
                  {c.name}, {DAY_NAMES[session.day]} at {session.time}, with {coach.name}. A real club would send a confirmation to {who.email} and a reminder two hours before.
                </p>
                <ConceptNotice>This is a concept website: no place was booked and your details were not sent or stored.</ConceptNotice>
                <button type="button" className="t-btn t-btn--line" onClick={close}>
                  Back to the timetable
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Dialog>
  )
}

/** The timetable for one day at a time, filtered by discipline and coach. */
function Timetable({ booked, onHold, compact = false, initialDiscipline = 'all' }: { booked: string[]; onHold: (id: string) => void; compact?: boolean; initialDiscipline?: 'all' | Discipline }) {
  const [day, setDay] = useState(TODAY)
  const [disc, setDisc] = useState<'all' | Discipline>(initialDiscipline)
  const [coach, setCoach] = useState('all')
  const [open, setOpen] = useState<Session | null>(null)
  const list = timetable.filter((s) => s.day === day && (disc === 'all' || classById(s.type)!.discipline === disc) && (coach === 'all' || s.coach === coach))
  return (
    <div className="t-timetable">
      <div className="t-days" role="tablist" aria-label="Day">
        {DAYS.map((d, i) => (
          <button key={d} type="button" role="tab" aria-selected={day === i} className={day === i ? 'is-on' : ''} onClick={() => setDay(i)}>
            <span>{d}</span>
            {i === TODAY && <small>Today</small>}
          </button>
        ))}
      </div>
      {!compact && (
        <div className="t-filters">
          <div className="t-chips" role="group" aria-label="Discipline">
            {[{ id: 'all' as const, label: 'All' }, ...disciplines].map((d) => (
              <button key={d.id} type="button" aria-pressed={disc === d.id} className={disc === d.id ? 'is-on' : ''} onClick={() => setDisc(d.id)}>
                {d.label}
              </button>
            ))}
          </div>
          <label className="t-select">
            <span>Coach</span>
            <select value={coach} onChange={(e) => setCoach(e.target.value)}>
              <option value="all">Any coach</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <p className="t-timetable__count" aria-live="polite">
        {DAY_NAMES[day]} · {list.length} {list.length === 1 ? 'class' : 'classes'}
      </p>
      {list.length ? (
        <ul className="t-sessions" role="list">
          {list.map((s) => (
            <SessionRow key={sessionId(s)} s={s} booked={booked.includes(sessionId(s))} onOpen={setOpen} />
          ))}
        </ul>
      ) : (
        <p className="t-empty">No classes match on {DAY_NAMES[day]}. Try another day or clear a filter.</p>
      )}
      <SessionDialog session={open} booked={booked} onClose={() => setOpen(null)} onHold={onHold} />
    </div>
  )
}

function CoachDialog({ coach, onClose }: { coach: Coach | null; onClose: () => void }) {
  const teaches = coach ? timetable.filter((s) => s.coach === coach.id) : []
  const types = [...new Set(teaches.map((s) => s.type))]
  return (
    <Dialog open={Boolean(coach)} onClose={onClose} label={coach ? `${coach.name}, ${coach.role}` : 'Coach'} className="t-modal">
      {coach && (
        <div className="t-class">
          <div className="t-class__ph t-class__ph--tall">
            <Photo set={SET} name={coach.photo} alt={coach.alt} sizes="(max-width: 760px) 100vw, 420px" focus={coach.focus} />
          </div>
          <div className="t-class__body">
            <CloseButton onClick={onClose} className="t-modal__close" />
            <p className="t-kicker">{coach.role}</p>
            <h2 className="t-display t-display--md">{coach.name}</h2>
            <p className="t-sample">Fictional coach profile, shown with an Unsplash photograph</p>
            <p>{coach.bio}</p>
            <p className="t-lbl">Specialties</p>
            <ul className="t-tags" role="list">
              {coach.specialties.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p className="t-lbl">Teaches</p>
            <ul className="t-list" role="list">
              {types.map((t) => {
                const days = teaches.filter((s) => s.type === t)
                return (
                  <li key={t}>
                    <b>{classById(t)!.name}</b> — {days.map((s) => `${DAYS[s.day]} ${s.time}`).join(', ')}
                  </li>
                )
              })}
            </ul>
            <p className="t-lbl">A first session with {coach.name.split(' ')[0]}</p>
            <p>{coach.first}</p>
            <a className="t-btn" href={`${href('trial')}?coach=${coach.id}`}>
              Book a free intro with {coach.name.split(' ')[0]}
            </a>
          </div>
        </div>
      )}
    </Dialog>
  )
}

function CoachCard({ c, onOpen }: { c: Coach; onOpen: (c: Coach) => void }) {
  return (
    <li className="t-coach">
      <button type="button" onClick={() => onOpen(c)} aria-haspopup="dialog">
        <span className="t-coach__ph">
          <Photo set={SET} name={c.photo} alt="" sizes="(max-width: 760px) 46vw, 23vw" focus={c.focus} />
        </span>
        <span className="t-coach__name">{c.name}</span>
        <span className="t-coach__role">{c.role}</span>
        <span className="t-coach__more">Profile →</span>
      </button>
    </li>
  )
}

function PlanCard({ p, annual, onJoin }: { p: Plan; annual: boolean; onJoin?: (p: Plan) => void }) {
  const perMonth = annual ? Math.round((p.monthly * 10) / 12) : p.monthly
  return (
    <article className={`t-plan${p.highlight ? ' t-plan--hi' : ''}`} aria-labelledby={`t-plan-${p.id}`}>
      {p.highlight && <span className="t-plan__flag">Most chosen</span>}
      <h3 id={`t-plan-${p.id}`} className="t-plan__name">
        {p.name}
      </h3>
      <p className="t-plan__line">{p.line}</p>
      <p className="t-plan__price">
        <b>{euro(perMonth)}</b>
        <span>/ month</span>
      </p>
      <p className="t-plan__bill">{annual ? `${euro(p.monthly * 10)} billed yearly · two months free` : 'Billed monthly · cancel with 30 days’ notice'}</p>
      <ul className="t-plan__list" role="list">
        {p.includes.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
      {onJoin ? (
        <button type="button" className={`t-btn t-btn--wide${p.highlight ? '' : ' t-btn--line'}`} onClick={() => onJoin(p)} aria-haspopup="dialog">
          Join {p.name}
        </button>
      ) : (
        <a className={`t-btn t-btn--wide${p.highlight ? '' : ' t-btn--line'}`} href={href('memberships', `plan-${p.id}`)}>
          Choose {p.name}
        </a>
      )}
    </article>
  )
}

/* ---- pages ---- */

function Home({ booked, onHold }: { booked: string[]; onHold: (id: string) => void }) {
  const [coach, setCoach] = useState<Coach | null>(null)
  return (
    <>
      <section className="t-hero" aria-labelledby="t-hero-title">
        <div className="t-hero__ph">
          <Photo set={SET} name="hero-deadlift" alt="An athlete setting up a deadlift under a single light in a dark gym." sizes="100vw" focus="56% 60%" priority />
        </div>
        <div className="t-wrap t-hero__in">
          <p className="t-kicker">Strength &amp; conditioning club</p>
          <h1 id="t-hero-title" className="t-display t-display--xl">
            Strength,
            <br />
            <em>coached.</em>
          </h1>
          <p className="t-hero__lead">A written programme, small classes and coaches who know your numbers — from your first empty bar to your heaviest lift.</p>
          <div className="t-actions">
            <a className="t-btn" href={href('trial')}>
              Start a free trial
            </a>
            <a className="t-btn t-btn--ghost" href={href('classes')}>
              See the timetable
            </a>
          </div>
          <ul className="t-hero__facts" role="list">
            <li>
              <b>6:30</b> first class, weekdays
            </li>
            <li>
              <b>10</b> per barbell class, at most
            </li>
            <li>
              <b>7 days</b> free to try
            </li>
          </ul>
        </div>
      </section>

      <section className="t-sec" aria-labelledby="t-ways">
        <div className="t-wrap">
          <div className="t-head">
            <p className="t-kicker">How you train</p>
            <h2 id="t-ways" className="t-display t-display--lg">
              Three ways in. <em>One programme.</em>
            </h2>
          </div>
          <ul className="t-ways" role="list">
            {[
              { d: disciplines[0], photo: 'grip', focus: '45% 40%', alt: 'Hands gripping a barbell, close up.' },
              { d: disciplines[1], photo: 'kettlebell-chalk', focus: '50% 50%', alt: 'A chalked hand gripping a kettlebell.' },
              { d: disciplines[2], photo: 'mobility', focus: '50% 60%', alt: 'A woman in a back bend on a mat.' },
            ].map(({ d, photo, focus, alt }, i) => (
              <li key={d.id}>
                <a className="t-way" href={href('classes', d.id)}>
                  <span className="t-way__ph">
                    <Photo set={SET} name={photo} alt={alt} sizes="(max-width: 760px) 92vw, 30vw" focus={focus} />
                  </span>
                  <span className="t-way__n">0{i + 1}</span>
                  <span className="t-way__name">{d.label}</span>
                  <span className="t-way__line">{d.line}</span>
                  <span className="t-way__count">
                    {classTypes.filter((c) => c.discipline === d.id).length} classes · {timetable.filter((s) => classById(s.type)!.discipline === d.id).length} sessions a week →
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="t-sec" id="technique" aria-labelledby="t-technique">
        <div className="t-wrap">
          <div className="t-head t-head--row">
            <div>
              <p className="t-kicker">Technique</p>
              <h2 id="t-technique" className="t-display t-display--lg">
                Learn the lift. <em>Then load it.</em>
              </h2>
            </div>
            <p>Every barbell class starts from an empty bar. Here are the three main lifts the way the coaches teach them: choose one, turn it, slow it down.</p>
          </div>
          <Technique classesHref={href('classes', 'strength')} />
        </div>
      </section>

      <section className="t-sec t-sec--panel" aria-labelledby="t-today">
        <div className="t-wrap t-split">
          <div className="t-head t-head--side">
            <p className="t-kicker">On the floor</p>
            <h2 id="t-today" className="t-display t-display--lg">
              This <em>week.</em>
            </h2>
            <p>Every class is capped, coached and logged. Open one to see what to expect and hold a place.</p>
            <a className="t-arrow" href={href('classes')}>
              The full timetable →
            </a>
          </div>
          <Timetable booked={booked} onHold={onHold} compact />
        </div>
      </section>

      <section className="t-sec" aria-labelledby="t-plans">
        <div className="t-wrap">
          <div className="t-head t-head--row">
            <div>
              <p className="t-kicker">Memberships</p>
              <h2 id="t-plans" className="t-display t-display--lg">
                Pick a plan. <em>Change it any month.</em>
              </h2>
            </div>
            <a className="t-arrow" href={href('memberships', 'compare')}>
              Compare every plan →
            </a>
          </div>
          <div className="t-plans">
            {plans.map((p) => (
              <PlanCard key={p.id} p={p} annual={false} />
            ))}
          </div>
        </div>
      </section>

      <section className="t-sec t-sec--panel" aria-labelledby="t-coaches">
        <div className="t-wrap">
          <div className="t-head t-head--row">
            <div>
              <p className="t-kicker">Coaches</p>
              <h2 id="t-coaches" className="t-display t-display--lg">
                The people <em>on the floor.</em>
              </h2>
            </div>
            <p className="t-sample">Fictional coach profiles, shown with Unsplash photographs</p>
          </div>
          <ul className="t-coaches" role="list">
            {coaches.map((c) => (
              <CoachCard key={c.id} c={c} onOpen={setCoach} />
            ))}
          </ul>
        </div>
      </section>
      <CoachDialog coach={coach} onClose={() => setCoach(null)} />

      <section className="t-trialband" aria-labelledby="t-band">
        <div className="t-trialband__ph">
          <Photo set={SET} name="barbell-dark" alt="An athlete standing over a loaded barbell under a single light." sizes="100vw" focus="50% 42%" />
        </div>
        <div className="t-wrap t-trialband__in">
          <h2 id="t-band" className="t-display t-display--xl">
            Your first week <em>is on us.</em>
          </h2>
          <p>Seven days, any class on the timetable, and a coached first session. No card, no contract.</p>
          <a className="t-btn" href={href('trial')}>
            Start a free trial
          </a>
        </div>
      </section>

      <section className="t-sec" id="visit" aria-labelledby="t-visit">
        <div className="t-wrap t-visit">
          <div>
            <p className="t-kicker">Visit</p>
            <h2 id="t-visit" className="t-display t-display--lg">
              Open early. <em>Open late.</em>
            </h2>
          </div>
          <dl className="t-hours">
            <div>
              <dt>Monday – Friday</dt>
              <dd>6:00 – 22:00</dd>
            </div>
            <div>
              <dt>Saturday – Sunday</dt>
              <dd>8:00 – 18:00</dd>
            </div>
            <div>
              <dt>Coached classes</dt>
              <dd>From 6:30, see the timetable</dd>
            </div>
          </dl>
          <p className="t-small">Sample hours. Tensile Athletic Club is a fictional club, so there is no address, phone number or map.</p>
        </div>
      </section>
    </>
  )
}

function Classes({ booked, onHold }: { booked: string[]; onHold: (id: string) => void }) {
  const [disc, setDisc] = useState<'all' | Discipline>('all')
  useEffect(() => {
    const read = () => {
      const h = location.hash.slice(1)
      setDisc(disciplines.some((d) => d.id === h) ? (h as Discipline) : 'all')
    }
    read()
    addEventListener('hashchange', read)
    return () => removeEventListener('hashchange', read)
  }, [])
  const [type, setType] = useState<string | null>(null)
  const t = type ? classById(type) : null
  return (
    <>
      <PageHead kicker="Timetable" title={<>The week, <em>coached.</em></>}>
        <p className="t-pagehead__lead">Choose a day, filter by discipline or coach, and open any class to see what to expect and hold a place. Sample timetable.</p>
      </PageHead>
      <section className="t-sec t-sec--tight" aria-label="Timetable">
        <div className="t-wrap">
          <Timetable key={disc} booked={booked} onHold={onHold} initialDiscipline={disc} />
        </div>
      </section>
      <section className="t-sec t-sec--panel" aria-labelledby="t-types">
        <div className="t-wrap">
          <div className="t-head">
            <p className="t-kicker">The classes</p>
            <h2 id="t-types" className="t-display t-display--lg">
              Six classes, <em>one standard.</em>
            </h2>
          </div>
          <ul className="t-types" role="list">
            {classTypes.map((c) => (
              <li key={c.id}>
                <button type="button" className="t-type" onClick={() => setType(c.id)} aria-haspopup="dialog">
                  <span className="t-type__ph">
                    <Photo set={SET} name={c.photo} alt="" sizes="(max-width: 760px) 92vw, 30vw" focus={c.focus} />
                  </span>
                  <span className="t-kicker">{disciplines.find((d) => d.id === c.discipline)!.label}</span>
                  <span className="t-type__name">{c.name}</span>
                  <span className="t-type__line">{c.line}</span>
                  <span className="t-type__meta">
                    {c.minutes} min · {c.level} <Intensity value={c.intensity} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <Dialog open={Boolean(t)} onClose={() => setType(null)} label={t ? t.name : 'Class'} className="t-modal">
        {t && (
          <div className="t-class">
            <div className="t-class__ph">
              <Photo set={SET} name={t.photo} alt={t.alt} sizes="(max-width: 760px) 100vw, 420px" focus={t.focus} />
            </div>
            <div className="t-class__body">
              <CloseButton onClick={() => setType(null)} className="t-modal__close" />
              <p className="t-kicker">
                {disciplines.find((d) => d.id === t.discipline)!.label} · {t.level} · {t.minutes} min
              </p>
              <h2 className="t-display t-display--md">{t.name}</h2>
              <p>{t.detail}</p>
              <p className="t-lbl">When</p>
              <ul className="t-list" role="list">
                {timetable
                  .filter((s) => s.type === t.id)
                  .map((s) => (
                    <li key={sessionId(s)}>
                      {DAY_NAMES[s.day]} {s.time} with {coachById(s.coach)!.name}
                    </li>
                  ))}
              </ul>
              <p className="t-small">
                <b>Bring:</b> {t.kit}
              </p>
              <a className="t-btn" href={`${href('trial')}?type=${t.id}`}>
                Try {t.name} free
              </a>
            </div>
          </div>
        )}
      </Dialog>
    </>
  )
}

function Memberships() {
  const [annual, setAnnual] = useState(false)
  const [join, setJoin] = useState<Plan | null>(null)
  useEffect(() => {
    const read = () => {
      const m = location.hash.match(/^#plan-(\w+)/)
      const p = m && plans.find((x) => x.id === m[1])
      if (p) setJoin(p)
    }
    read()
    addEventListener('hashchange', read)
    return () => removeEventListener('hashchange', read)
  }, [])
  return (
    <>
      <PageHead kicker="Memberships" title={<>Train more. <em>Pay for what you use.</em></>} photo={{ name: 'racks-window', alt: 'Squat racks beside tall windows.', focus: '50% 40%' }}>
        <p className="t-pagehead__lead">Three plans, no joining fee, and a free week before any of them. Sample prices.</p>
      </PageHead>
      <section className="t-sec t-sec--tight" aria-labelledby="t-plans-title">
        <div className="t-wrap">
          <div className="t-billing">
            <h2 id="t-plans-title" className="t-lbl">
              Billing
            </h2>
            <div className="t-toggle" role="group" aria-label="Billing period">
              <button type="button" aria-pressed={!annual} className={!annual ? 'is-on' : ''} onClick={() => setAnnual(false)}>
                Monthly
              </button>
              <button type="button" aria-pressed={annual} className={annual ? 'is-on' : ''} onClick={() => setAnnual(true)}>
                Yearly <small>2 months free</small>
              </button>
            </div>
          </div>
          <div className="t-plans">
            {plans.map((p) => (
              <PlanCard key={p.id} p={p} annual={annual} onJoin={setJoin} />
            ))}
          </div>
        </div>
      </section>

      <section className="t-sec t-sec--panel" id="compare" aria-labelledby="t-compare">
        <div className="t-wrap">
          <div className="t-head">
            <p className="t-kicker">Compare</p>
            <h2 id="t-compare" className="t-display t-display--lg">
              Every plan, <em>side by side.</em>
            </h2>
          </div>
          <div className="t-table-wrap">
            <table className="t-table">
              <caption className="visually-hidden">What each membership includes</caption>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="visually-hidden">Feature</span>
                  </th>
                  {plans.map((p) => (
                    <th key={p.id} scope="col" className={p.highlight ? 'is-hi' : ''}>
                      {p.name}
                      <small>{euro(annual ? Math.round((p.monthly * 10) / 12) : p.monthly)}/mo</small>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.feature}>
                    <th scope="row">{row.feature}</th>
                    {row.cells.map((c, i) => (
                      <td key={plans[i].id} className={plans[i].highlight ? 'is-hi' : ''}>
                        {c === true ? <span className="t-yes" aria-label="Included">✓</span> : c === false ? <span className="t-no" aria-label="Not included">—</span> : c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="t-sec" aria-labelledby="t-faq">
        <div className="t-wrap t-faq">
          <div className="t-head">
            <p className="t-kicker">Questions</p>
            <h2 id="t-faq" className="t-display t-display--lg">
              Before <em>you join.</em>
            </h2>
          </div>
          <div className="t-acc">
            {faqs.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <JoinDialog plan={join} annual={annual} onClose={() => setJoin(null)} />
    </>
  )
}

/** Mondays from the sample week on, for a start date. */
const STARTS = ['Monday 2 November', 'Monday 9 November', 'Monday 16 November', 'Monday 23 November']

function JoinDialog({ plan, annual, onClose }: { plan: Plan | null; annual: boolean; onClose: () => void }) {
  const [start, setStart] = useState(STARTS[0])
  const [who, setWho] = useState({ name: '', email: '' })
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const close = () => {
    setDone(false)
    setError('')
    onClose()
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!who.name.trim()) return setError('Add your name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(who.email)) return setError('Add a valid email address.')
    setError('')
    setDone(true)
  }
  return (
    <Dialog open={Boolean(plan)} onClose={close} label={plan ? `Join ${plan.name}` : 'Join'} className="t-modal t-modal--narrow">
      {plan && (
        <div className="t-join">
          <CloseButton onClick={close} className="t-modal__close" />
          <p className="t-kicker">Join · sample</p>
          <h2 className="t-display t-display--md">{plan.name}</h2>
          <p className="t-join__price">
            {annual ? `${euro(plan.monthly * 10)} a year` : `${euro(plan.monthly)} a month`}
          </p>
          {done ? (
            <div className="t-done">
              <h3 className="t-display t-display--sm">Welcome, {who.name.trim().split(' ')[0]}.</h3>
              <p>
                {plan.name}, starting {start}. A real club would now take the first payment securely and email {who.email} your induction time.
              </p>
              <ConceptNotice>This is a concept website: no membership was created, nothing was charged and your details were not sent or stored.</ConceptNotice>
              <button type="button" className="t-btn t-btn--line" onClick={close}>
                Close
              </button>
            </div>
          ) : (
            <form className="t-form" onSubmit={submit} noValidate>
              <label>
                <span>Start date</span>
                <select value={start} onChange={(e) => setStart(e.target.value)}>
                  {STARTS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Name</span>
                <input autoComplete="name" value={who.name} onChange={(e) => setWho({ ...who, name: e.target.value })} />
              </label>
              <label>
                <span>Email</span>
                <input type="email" autoComplete="email" value={who.email} onChange={(e) => setWho({ ...who, email: e.target.value })} />
              </label>
              {error && (
                <p className="t-error" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="t-btn t-btn--wide">
                Continue to payment
              </button>
              <ConceptNotice>Concept website: there is no payment step. Continuing shows a sample welcome only.</ConceptNotice>
              <a className="t-linkbtn" href={href('trial')}>
                Not sure yet? Try a free week first →
              </a>
            </form>
          )}
        </div>
      )}
    </Dialog>
  )
}

function Coaches() {
  const [coach, setCoach] = useState<Coach | null>(null)
  return (
    <>
      <PageHead kicker="Coaches" title={<>Coaches who know <em>your numbers.</em></>}>
        <p className="t-pagehead__lead">Every member has a coach who has seen them lift. Open a profile to see what they teach and book a free intro. Fictional profiles, shown with Unsplash photographs.</p>
      </PageHead>
      <section className="t-sec t-sec--tight" aria-label="Coaches">
        <div className="t-wrap">
          <ul className="t-coaches t-coaches--page" role="list">
            {coaches.map((c) => (
              <CoachCard key={c.id} c={c} onOpen={setCoach} />
            ))}
          </ul>
        </div>
      </section>
      <section className="t-sec t-sec--panel" aria-labelledby="t-method">
        <div className="t-wrap t-split">
          <div className="t-head t-head--side">
            <p className="t-kicker">How coaching works</p>
            <h2 id="t-method" className="t-display t-display--lg">
              Written down. <em>Checked in.</em>
            </h2>
          </div>
          <ol className="t-steps" role="list">
            {[
              ['Assess', 'A movement screen and your first lifts, filmed and reviewed with you.'],
              ['Programme', 'Four-week blocks with set numbers, in the app and on the whiteboard.'],
              ['Review', 'Every eight weeks (every four on Coached): what moved, what changes next.'],
            ].map(([t, d], i) => (
              <li key={t}>
                <span className="t-steps__n">0{i + 1}</span>
                <b>{t}</b>
                <span>{d}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <CoachDialog coach={coach} onClose={() => setCoach(null)} />
    </>
  )
}

/** Beginner-friendly sessions offered as a first class, in timetable order from today. */
const FIRST_CLASSES = timetable
  .filter((s) => ['foundations', 'kettlebell', 'mobility', 'engine'].includes(s.type))
  .sort((a, b) => ((a.day - TODAY + 7) % 7) - ((b.day - TODAY + 7) % 7) || a.time.localeCompare(b.time))
  .slice(0, 8)

function Trial() {
  const [step, setStep] = useState(1)
  const [goal, setGoal] = useState('')
  const [mode, setMode] = useState<'class' | 'intro'>('class')
  const [session, setSession] = useState('')
  const [coach, setCoach] = useState(coaches[0].id)
  const [who, setWho] = useState({ name: '', email: '', phone: '', experience: 'new', health: false })
  const [error, setError] = useState('')

  // arriving from a class or a coach preselects it (?class=…, ?type=…, ?coach=…)
  useEffect(() => {
    const preselect = () => {
      const q = new URLSearchParams(location.search)
      const c = q.get('coach')
      const cl = q.get('class')
      const ty = q.get('type')
      if (c && coachById(c)) {
        setMode('intro')
        setCoach(c)
      }
      const all = cl ? timetable.find((s) => sessionId(s) === cl) : ty ? timetable.find((s) => s.type === ty) : undefined
      if (all) {
        setMode('class')
        setSession(sessionId(all))
      }
    }
    preselect()
  }, [])

  const choices = useMemo(() => {
    const extra = timetable.find((s) => sessionId(s) === session)
    return extra && !FIRST_CLASSES.includes(extra) ? [extra, ...FIRST_CLASSES] : FIRST_CLASSES
  }, [session])
  const chosen = timetable.find((s) => sessionId(s) === session)
  const chosenCoach = coachById(coach)!
  const steps = ['Your goal', 'First session', 'Your details']

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!who.name.trim()) return setError('Add your name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(who.email)) return setError('Add a valid email address.')
    if (!who.health) return setError('Please confirm the health questionnaire note.')
    setError('')
    setStep(4)
    scrollTo({ top: 0 })
  }

  return (
    <>
      <PageHead kicker="Free trial" title={<>Seven days. <em>On us.</em></>} photo={{ name: 'barbell-dark', alt: 'An athlete standing over a barbell in a dark gym.', focus: '55% 55%' }}>
        <p className="t-pagehead__lead">Tell us what you want from training, choose a first class or a 1:1 intro, and leave your details. No card, no contract.</p>
      </PageHead>
      <section className="t-sec t-sec--tight" aria-label="Trial request">
        <div className="t-wrap t-trial">
          {step < 4 && (
            <ol className="t-prog" aria-label="Trial steps">
              {steps.map((s, i) => (
                <li key={s} aria-current={step === i + 1 ? 'step' : undefined} className={step > i + 1 ? 'is-done' : step === i + 1 ? 'is-on' : ''}>
                  {step > i + 1 ? (
                    <button type="button" onClick={() => setStep(i + 1)}>
                      <span>0{i + 1}</span> {s}
                    </button>
                  ) : (
                    <span>
                      <span>0{i + 1}</span> {s}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}

          {step === 1 && (
            <fieldset className="t-cards">
              <legend className="t-display t-display--sm">What would you like from training?</legend>
              {goals.map((g) => (
                <label key={g.id} className={goal === g.id ? 'is-on' : ''}>
                  <input type="radio" name="t-goal" value={g.id} checked={goal === g.id} onChange={() => setGoal(g.id)} />
                  <b>{g.label}</b>
                  <span>{g.line}</span>
                </label>
              ))}
              <button type="button" className="t-btn" disabled={!goal} onClick={() => setStep(2)}>
                {goal ? 'Continue' : 'Choose a goal to continue'}
              </button>
            </fieldset>
          )}

          {step === 2 && (
            <div className="t-pickfirst">
              <div className="t-toggle" role="group" aria-label="First session">
                <button type="button" aria-pressed={mode === 'class'} className={mode === 'class' ? 'is-on' : ''} onClick={() => setMode('class')}>
                  A first class
                </button>
                <button type="button" aria-pressed={mode === 'intro'} className={mode === 'intro' ? 'is-on' : ''} onClick={() => setMode('intro')}>
                  A 1:1 intro with a coach
                </button>
              </div>
              {mode === 'class' ? (
                <fieldset className="t-firsts">
                  <legend className="t-lbl">Classes this week that suit a first visit</legend>
                  {choices.map((s) => {
                    const c = classById(s.type)!
                    const id = sessionId(s)
                    return (
                      <label key={id} className={session === id ? 'is-on' : ''}>
                        <input type="radio" name="t-first" value={id} checked={session === id} onChange={() => setSession(id)} />
                        <span className="t-firsts__when">
                          {DAYS[s.day]} {s.time}
                        </span>
                        <b>{c.name}</b>
                        <span>
                          {coachById(s.coach)!.name} · {c.minutes} min · {c.level}
                        </span>
                      </label>
                    )
                  })}
                </fieldset>
              ) : (
                <fieldset className="t-firsts t-firsts--coach">
                  <legend className="t-lbl">Choose a coach for a 45-minute intro</legend>
                  {coaches.map((c) => (
                    <label key={c.id} className={coach === c.id ? 'is-on' : ''}>
                      <input type="radio" name="t-coach" value={c.id} checked={coach === c.id} onChange={() => setCoach(c.id)} />
                      <span className="t-firsts__ph">
                        <Photo set={SET} name={c.photo} alt="" sizes="56px" focus={c.focus} />
                      </span>
                      <b>{c.name}</b>
                      <span>{c.specialties.slice(0, 2).join(' · ')}</span>
                    </label>
                  ))}
                </fieldset>
              )}
              <button type="button" className="t-btn" disabled={mode === 'class' && !session} onClick={() => setStep(3)}>
                {mode === 'class' && !session ? 'Choose a class to continue' : 'Continue'}
              </button>
            </div>
          )}

          {step === 3 && (
            <form className="t-form t-form--page" onSubmit={submit} noValidate>
              <p className="t-chosen">
                {mode === 'class' && chosen ? (
                  <>
                    <b>{classById(chosen.type)!.name}</b> · {DAY_NAMES[chosen.day]} {chosen.time} with {coachById(chosen.coach)!.name}
                  </>
                ) : (
                  <>
                    <b>1:1 intro</b> with {chosenCoach.name} · 45 min · a time agreed by email
                  </>
                )}
              </p>
              <div className="t-form__grid">
                <label>
                  <span>Name</span>
                  <input autoComplete="name" value={who.name} onChange={(e) => setWho({ ...who, name: e.target.value })} />
                </label>
                <label>
                  <span>Email</span>
                  <input type="email" autoComplete="email" value={who.email} onChange={(e) => setWho({ ...who, email: e.target.value })} />
                </label>
                <label>
                  <span>Phone (optional)</span>
                  <input type="tel" autoComplete="tel" value={who.phone} onChange={(e) => setWho({ ...who, phone: e.target.value })} />
                </label>
                <label>
                  <span>Training so far</span>
                  <select value={who.experience} onChange={(e) => setWho({ ...who, experience: e.target.value })}>
                    <option value="new">New to strength training</option>
                    <option value="some">Some experience</option>
                    <option value="regular">I train regularly</option>
                  </select>
                </label>
              </div>
              <label className="t-check">
                <input type="checkbox" checked={who.health} onChange={(e) => setWho({ ...who, health: e.target.checked })} />
                <span>I understand a short health questionnaire comes before the first session.</span>
              </label>
              {error && (
                <p className="t-error" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="t-btn">
                Request my free week
              </button>
              <ConceptNotice>Concept website: the request shows a confirmation screen only. Nothing is sent or booked.</ConceptNotice>
            </form>
          )}

          {step === 4 && (
            <div className="t-done t-done--page">
              <p className="t-kicker">Trial request · sample</p>
              <h2 className="t-display t-display--lg">
                Welcome in, <em>{who.name.trim().split(' ')[0]}.</em>
              </h2>
              <p>
                {mode === 'class' && chosen
                  ? `Your first session: ${classById(chosen.type)!.name}, ${DAY_NAMES[chosen.day]} at ${chosen.time}, with ${coachById(chosen.coach)!.name}.`
                  : `Your first session: a 1:1 intro with ${chosenCoach.name}. A real club would email ${who.email} to agree a time.`}{' '}
                Your seven days would start that day.
              </p>
              <ConceptNotice>This is the confirmation screen of a concept website. No trial was booked and your details were not sent or stored — Tensile is a fictional club.</ConceptNotice>
              <div className="t-actions">
                <a className="t-btn" href={href('classes')}>
                  See the timetable
                </a>
                <a className="t-btn t-btn--line" href={href()}>
                  Back to the club
                </a>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  )
}

export const concept: ConceptModule = {
  Site: Tensile,
  paths: ['', 'classes', 'memberships', 'coaches', 'trial'],
  title: (path) => ({ classes: 'Timetable', memberships: 'Memberships', coaches: 'Coaches', trial: 'Free trial' })[path],
}

import { useEffect, useState, type FormEvent } from 'react'
import { ConceptNotice } from '../shared/ConceptNotice'
import { CloseButton, Dialog } from '../shared/Dialog'
import { conceptHref, euro } from '../shared/links'
import { Photo } from '../shared/Photo'
import type { ConceptModule, ConceptProps } from '../types'
import { COURSES, DATES, DIET, dishById, dishes, HOURS, SEATING, shortDate, tablesLeft, TIMES, type Course, type Diet, type Dish } from './data'
import './anar.css'

const SET = 'anar'
const SLUG = 'anar'
const href = (path = '', hash = '') => conceptHref(SLUG, path, hash)

/**
 * Anar Dining Room: a restaurant website with a home page and the full menu.
 * Every dish opens with its story, ingredients and dietary notes; the
 * reservation panel is a working flow (evening, party, time, seating,
 * details) that ends in an honest confirmation — nothing is booked.
 */
function Anar({ path }: ConceptProps) {
  const [dish, setDish] = useState<Dish | null>(null)
  const home = path === ''
  return (
    <div className="n-root">
      <Header home={home} />
      <main>{home ? <Home onDish={setDish} /> : <MenuPage onDish={setDish} />}</main>
      <DishDialog dish={dish} onClose={() => setDish(null)} home={home} />
      <Footer />
    </div>
  )
}

function Header({ home }: { home: boolean }) {
  const [solid, setSolid] = useState(!home)
  const [menu, setMenu] = useState(false)
  useEffect(() => {
    if (!home) return
    const on = () => setSolid(window.scrollY > 40)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [home])
  const links = [
    { label: 'Menu', href: href('menu') },
    { label: 'Our kitchen', href: href('', 'kitchen') },
    { label: 'Tea', href: href('', 'tea') },
    { label: 'Private dining', href: href('', 'private') },
    { label: 'Visit', href: href('', 'visit') },
  ]
  return (
    <>
      <header className={`n-top${solid ? ' is-solid' : ''}${home ? ' is-home' : ''}`}>
        <div className="n-wrap n-nav">
          <a className="n-logo" href={href()}>
            Anar <small>Dining room</small>
          </a>
          <ul className="n-nav__links">
            {links.map((l) => (
              <li key={l.label}>
                <a href={l.href} aria-current={!home && l.label === 'Menu' ? 'page' : undefined}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="n-nav__end">
            <a className="n-btn n-btn--sm" href={href('', 'reserve')}>
              Reserve<span className="n-wide"> a table</span>
            </a>
            <button type="button" className="n-burger" aria-label="Open the menu" aria-haspopup="dialog" onClick={() => setMenu(true)}>
              <i />
              <i />
            </button>
          </div>
        </div>
      </header>
      <Dialog open={menu} onClose={() => setMenu(false)} label="Menu" className="n-drawer">
        <div className="n-drawer__head">
          <span className="n-logo">
            Anar <small>Dining room</small>
          </span>
          <CloseButton onClick={() => setMenu(false)} />
        </div>
        <ul className="n-drawer__links">
          {links.map((l) => (
            <li key={l.label}>
              <a href={l.href} onClick={() => setMenu(false)}>
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <a className="n-btn n-btn--wide" href={href('', 'reserve')} onClick={() => setMenu(false)}>
          Reserve a table
        </a>
        <p className="n-drawer__hours">Dinner Tuesday – Sunday · sample hours</p>
      </Dialog>
    </>
  )
}

function DishButton({ d, onDish }: { d: Dish; onDish: (d: Dish) => void }) {
  return (
    <button type="button" className="n-dish" onClick={() => onDish(d)} aria-haspopup="dialog">
      <b>{d.name}</b>
      <i>{euro(d.price)}</i>
      <span>{d.line}</span>
      {d.diet.length > 0 && (
        <span className="n-diet" aria-label={d.diet.map((x) => DIET[x]).join(', ')}>
          {d.diet.map((x) => (
            <abbr key={x} title={DIET[x]}>
              {x.toUpperCase()}
            </abbr>
          ))}
        </span>
      )}
    </button>
  )
}

function Home({ onDish }: { onDish: (d: Dish) => void }) {
  const [tea, setTea] = useState(false)
  const [enquiry, setEnquiry] = useState(false)
  const [photo, setPhoto] = useState<number | null>(null)
  const preview: [string, string, string[]][] = [
    ['To begin', 'spread', ['kashk-bademjan', 'sabzi-khordan', 'mast-o-khiar']],
    ['From the fire', 'saffron-plate', ['jujeh', 'ghormeh', 'fesenjan']],
    ['To share & finish', 'tahdig-3', ['tahchin', 'sholeh-zard', 'faloodeh']],
  ]
  return (
    <>
      <section className="n-hero" aria-labelledby="n-hero-title">
        <Photo set={SET} name="room-lights" alt="" sizes="100vw" focus="50% 60%" priority className="n-hero__img" />
        <div className="n-wrap">
          <p className="n-kicker">Persian kitchen · Wood fire · Saffron</p>
          <h1 id="n-hero-title" className="n-serif">
            A table set for <em>slow evenings.</em>
          </h1>
          <div className="n-hero__row">
            <p>Recipes from the regions of Iran, cooked over fire and served to share — in a room lit for long conversations.</p>
            <div>
              <b>Dinner</b>Tue – Sun
            </div>
            <div>
              <b>Kitchen</b>18:00 – 23:00
            </div>
            <div>
              <b>Private room</b>Up to 14 guests
            </div>
            <a className="n-btn" href="#reserve">
              Find a table →
            </a>
          </div>
        </div>
      </section>

      <section className="n-sec" id="kitchen" aria-labelledby="n-kitchen-title">
        <div className="n-wrap n-kitchen">
          <div>
            <p className="n-kicker n-kicker--deep">Our kitchen</p>
            <h2 id="n-kitchen-title" className="n-serif">
              Old recipes, cooked <em>over open flame.</em>
            </h2>
            <p className="n-lead">We cook with the seasons: herbs from the morning market, rice steamed until it forms a golden crust, and pomegranate in almost everything.</p>
            <div className="n-sigs">
              <button type="button" onClick={() => onDish(dishById('tahdig')!)} aria-haspopup="dialog">
                <b>Tahdig</b>
                <span>The golden crust of the pot — crisp, buttery, shared at every table.</span>
              </button>
              <button type="button" onClick={() => onDish(dishById('jujeh')!)} aria-haspopup="dialog">
                <b>Saffron</b>
                <span>Ground by hand to order, bloomed slowly, never rushed.</span>
              </button>
            </div>
          </div>
          <div className="n-kitchen__art">
            <div className="n-kitchen__a">
              <Photo set={SET} name="tahdig" alt="Golden saffron tahdig with barberries and pistachio." sizes="(max-width: 700px) 80vw, 40vw" />
            </div>
            <div className="n-kitchen__b">
              <Photo set={SET} name="pomegranate-tree" alt="Ripe pomegranates on the tree." sizes="250px" focus="50% 40%" />
            </div>
          </div>
        </div>
      </section>

      <section className="n-sec n-menu" aria-labelledby="n-menu-title">
        <div className="n-wrap">
          <div className="n-mhead">
            <div>
              <p className="n-kicker">Tonight</p>
              <h2 id="n-menu-title" className="n-serif">
                From the <em>menu</em>
              </h2>
            </div>
            <p>Dishes are made to share — two or three per guest. Tap any dish for its story and ingredients.</p>
          </div>
          <div className="n-courses">
            {preview.map(([title, ph, ids]) => (
              <div key={title} className="n-course">
                <div className="n-course__ph">
                  <Photo set={SET} name={ph} sizes="(max-width: 700px) 90vw, 30vw" />
                </div>
                <h3>{title}</h3>
                <ul role="list">
                  {ids.map((id) => (
                    <li key={id}>
                      <DishButton d={dishById(id)!} onDish={onDish} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="n-mfoot">
            <div className="n-chips">
              <span>Vegetarian options</span>
              <span>Gluten-free rice</span>
              <span>Feast for the table · €58 pp</span>
            </div>
            <a className="n-btn" href={href('menu')}>
              See the full menu
            </a>
          </div>
        </div>
      </section>

      <Reserve />

      <section className="n-sec n-tea" id="tea" aria-labelledby="n-tea-title">
        <div className="n-wrap">
          <div className="n-tea__ph">
            <Photo set={SET} name="samovar" alt="A brass samovar with glasses of tea, dates and nuts." sizes="(max-width: 700px) 46vw, 28vw" focus="40% 50%" />
          </div>
          <div className="n-tea__mid">
            <p className="n-kicker">After dinner</p>
            <h2 id="n-tea-title" className="n-serif">
              Tea from the <em>samovar.</em>
            </h2>
            <p>Brewed strong, poured clear and served with dates, saffron rock sugar and something sweet. Stay as long as you like.</p>
            <button type="button" className="n-btn n-btn--ghost" onClick={() => setTea(true)} aria-haspopup="dialog">
              The tea list
            </button>
          </div>
          <div className="n-tea__ph n-tea__ph--r">
            <Photo set={SET} name="tea-pour" alt="Tea being poured into a glass." sizes="(max-width: 700px) 46vw, 28vw" focus="50% 40%" />
          </div>
        </div>
      </section>

      <Dialog open={tea} onClose={() => setTea(false)} label="The tea list" className="n-modal n-modal--dark">
        <div className="n-teamenu">
          <div className="n-modal__head">
            <h2 className="n-serif">
              The <em>tea list</em>
            </h2>
            <CloseButton onClick={() => setTea(false)} />
          </div>
          <ul role="list">
            {dishes
              .filter((d) => d.course === 'tea')
              .map((d) => (
                <li key={d.id}>
                  <b>{d.name}</b>
                  <i>{euro(d.price)}</i>
                  <span>{d.detail}</span>
                </li>
              ))}
          </ul>
          <p className="n-fine">Sample prices. Tea is refilled for as long as you stay.</p>
        </div>
      </Dialog>

      <section className="n-sec" id="private" aria-labelledby="n-private-title">
        <div className="n-wrap">
          <div className="n-private">
            <div className="n-private__ph">
              <Photo set={SET} name="room-wood" alt="A warm, wood-lined private dining room set for dinner." sizes="(max-width: 700px) 100vw, 54vw" />
            </div>
            <div className="n-private__body">
              <p className="n-kicker n-kicker--deep">Private dining</p>
              <h2 id="n-private-title" className="n-serif">
                A room for <em>fourteen.</em>
              </h2>
              <p>Birthdays, engagements, long Friday dinners — a set feast cooked for your table, in our room behind the kitchen.</p>
              <ul role="list">
                <li>Set feasts from €58</li>
                <li>Up to 14 guests</li>
                <li>Your own playlist</li>
                <li>Menus for children</li>
              </ul>
              <button type="button" className="n-btn n-btn--dark" onClick={() => setEnquiry(true)} aria-haspopup="dialog">
                Enquire about a date
              </button>
            </div>
          </div>
          <ul className="n-gal" role="list">
            {GALLERY.map((g, i) => (
              <li key={g.key} className={g.cls}>
                <button type="button" onClick={() => setPhoto(i)} aria-label={`Enlarge: ${g.alt}`} aria-haspopup="dialog">
                  <Photo set={SET} name={g.key} sizes="(max-width: 700px) 90vw, 40vw" focus={g.focus} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Enquiry open={enquiry} onClose={() => setEnquiry(false)} />
      <Lightbox index={photo} onClose={() => setPhoto(null)} onMove={setPhoto} />
      <Visit />
    </>
  )
}

const GALLERY = [
  { key: 'tahdig-2', cls: 'n-gal__t', alt: 'Tahdig with barberries on a paisley cloth.' },
  { key: 'spread-2', cls: 'n-gal__w', alt: 'A spread of rice, herbs and small dishes from above.' },
  { key: 'tea-carpet', cls: '', alt: 'A glass of tea on a woven carpet.' },
  { key: 'room-candle', cls: '', alt: 'The front room by candlelight.', focus: '50% 60%' },
  { key: 'table-overhead', cls: 'n-gal__w', alt: 'A full table of dishes seen from above.', focus: '50% 40%' },
]

function Lightbox({ index, onClose, onMove }: { index: number | null; onClose: () => void; onMove: (i: number) => void }) {
  const g = index === null ? null : GALLERY[index]
  const go = (d: number) => index !== null && onMove((index + d + GALLERY.length) % GALLERY.length)
  return (
    <Dialog open={index !== null} onClose={onClose} label="Gallery" className="n-lightbox">
      {g && (
        <figure
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') go(1)
            if (e.key === 'ArrowLeft') go(-1)
          }}
        >
          <Photo set={SET} name={g.key} alt={g.alt} sizes="(max-width: 700px) 100vw, 70vw" />
          <figcaption>
            <span>
              {index! + 1} / {GALLERY.length} · {g.alt}
            </span>
            <span className="n-lightbox__nav">
              <button type="button" onClick={() => go(-1)} aria-label="Previous image">
                ←
              </button>
              <button type="button" onClick={() => go(1)} aria-label="Next image">
                →
              </button>
              <CloseButton onClick={onClose} />
            </span>
          </figcaption>
        </figure>
      )}
    </Dialog>
  )
}

function Reserve() {
  const [date, setDate] = useState(DATES[0])
  const [guests, setGuests] = useState(2)
  const [occasion, setOccasion] = useState('None')
  const [time, setTime] = useState('')
  const [seat, setSeat] = useState('room')
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' })
  const [error, setError] = useState('')
  const left = TIMES.reduce((n, t) => n + (tablesLeft(date, t, guests) > 0 ? 1 : 0), 0)
  const seatTitle = SEATING.find((s) => s.id === seat)!.title

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) return setError('Please add the name for the booking.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError('Please add a valid email address.')
    setError('')
    setStep(3)
  }

  return (
    <section className="n-sec" id="reserve" aria-labelledby="n-reserve-title">
      <div className="n-wrap n-reserve">
        <div>
          <p className="n-kicker n-kicker--deep">Reservations</p>
          <h2 id="n-reserve-title" className="n-serif">
            Find your <em>table.</em>
          </h2>
          <p className="n-lead">Book up to thirty days ahead. Tables for seven or more, and the private room, are arranged by enquiry.</p>
          <div className="n-rimg">
            <Photo set={SET} name="room-candle" alt="" sizes="(max-width: 700px) 90vw, 40vw" focus="50% 60%" />
            <p>The front room, by candlelight</p>
          </div>
        </div>
        <div className="n-panel" aria-live="polite">
          {step === 1 && (
            <>
              <h3>
                {shortDate(date)}, {guests} {guests === 1 ? 'guest' : 'guests'}
              </h3>
              <div className="n-fields">
                <label>
                  <small>Evening</small>
                  <select
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value)
                      setTime('')
                    }}
                  >
                    {DATES.map((d) => (
                      <option key={d} value={d}>
                        {shortDate(d)}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="n-guests">
                  <small id="n-guests-l">Guests</small>
                  <div role="group" aria-labelledby="n-guests-l">
                    <button
                      type="button"
                      aria-label="Fewer guests"
                      disabled={guests <= 1}
                      onClick={() => {
                        setGuests(guests - 1)
                        setTime('')
                      }}
                    >
                      −
                    </button>
                    <b aria-live="polite">{guests}</b>
                    <button
                      type="button"
                      aria-label="More guests"
                      disabled={guests >= 6}
                      onClick={() => {
                        setGuests(guests + 1)
                        setTime('')
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
                <label>
                  <small>Occasion</small>
                  <select value={occasion} onChange={(e) => setOccasion(e.target.value)}>
                    {['None', 'Birthday', 'Anniversary', 'Business', 'Celebration'].map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="n-lbl">
                <span>Available times</span>
                <span>
                  {left} of {TIMES.length} free · sample
                </span>
              </p>
              <div className="n-times" role="group" aria-label="Time">
                {TIMES.map((t) => {
                  const free = tablesLeft(date, t, guests) > 0
                  return (
                    <button key={t} type="button" disabled={!free} aria-pressed={time === t} className={time === t ? 'is-on' : ''} onClick={() => setTime(t)} aria-label={`${t}${free ? '' : ', fully booked'}`}>
                      {t}
                    </button>
                  )
                })}
              </div>
              <p className="n-lbl">
                <span>Seating</span>
              </p>
              <div className="n-seat" role="radiogroup" aria-label="Seating">
                {SEATING.map((s) => (
                  <button key={s.id} type="button" role="radio" aria-checked={seat === s.id} className={seat === s.id ? 'is-on' : ''} onClick={() => setSeat(s.id)}>
                    <b>{s.title}</b>
                    <small>{s.line}</small>
                  </button>
                ))}
              </div>
              <button type="button" className="n-btn n-btn--dark n-btn--wide" disabled={!time} onClick={() => setStep(2)}>
                {time ? `Continue — ${time} for ${guests}` : 'Choose a time'}
              </button>
              <p className="n-fine">No deposit for tables of up to six. Free cancellation until 15:00 on the day.</p>
            </>
          )}
          {step === 2 && (
            <form className="n-form" onSubmit={submit} noValidate>
              <h3>Your details</h3>
              <p className="n-summary">
                {shortDate(date)} · {time} · {guests} {guests === 1 ? 'guest' : 'guests'} · {seatTitle}
                {occasion !== 'None' ? ` · ${occasion}` : ''}{' '}
                <button type="button" className="n-textbtn" onClick={() => setStep(1)}>
                  Change
                </button>
              </p>
              <label>
                <small>Name</small>
                <input autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label>
                <small>Email</small>
                <input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </label>
              <label>
                <small>Phone (optional)</small>
                <input type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </label>
              <label>
                <small>Allergies or requests (optional)</small>
                <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </label>
              {error && (
                <p className="n-error" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="n-btn n-btn--dark n-btn--wide">
                Reserve {time} for {guests}
              </button>
              <ConceptNotice>Concept website: no table is held and nothing is sent.</ConceptNotice>
            </form>
          )}
          {step === 3 && (
            <div className="n-done">
              <p className="n-kicker n-kicker--deep">Reservation — concept preview</p>
              <h3 className="n-serif">
                See you on <em>{shortDate(date)}</em>, {form.name.split(' ')[0]}.
              </h3>
              <p className="n-summary">
                {time} · {guests} {guests === 1 ? 'guest' : 'guests'} · {seatTitle}
                {occasion !== 'None' ? ` · ${occasion}` : ''}
              </p>
              <ConceptNotice>
                This is the confirmation screen of a concept website. No table was reserved and your details were not sent or stored — Anar is a fictional restaurant.
              </ConceptNotice>
              <button
                type="button"
                className="n-btn n-btn--line n-btn--wide"
                onClick={() => {
                  setStep(1)
                  setTime('')
                }}
              >
                Make another reservation
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function Enquiry({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [sent, setSent] = useState(false)
  return (
    <Dialog
      open={open}
      onClose={() => {
        setSent(false)
        onClose()
      }}
      label="Private dining enquiry"
      className="n-modal"
    >
      <div className="n-enquiry">
        <div className="n-modal__head">
          <h2 className="n-serif">
            Private <em>dining</em>
          </h2>
          <CloseButton onClick={onClose} />
        </div>
        {sent ? (
          <>
            <p className="n-lead">Thank you. In a live site, the events team would reply within a day with menus and available dates.</p>
            <ConceptNotice>This is a concept: the enquiry was not sent anywhere.</ConceptNotice>
          </>
        ) : (
          <form
            className="n-form"
            onSubmit={(e) => {
              e.preventDefault()
              setSent(true)
            }}
          >
            <label>
              <small>Preferred date</small>
              <select defaultValue={DATES[4]}>
                {DATES.map((d) => (
                  <option key={d} value={d}>
                    {shortDate(d)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <small>Guests</small>
              <input type="number" min={7} max={14} defaultValue={10} />
            </label>
            <label>
              <small>Name</small>
              <input autoComplete="name" required />
            </label>
            <label>
              <small>Email</small>
              <input type="email" autoComplete="email" required />
            </label>
            <label>
              <small>Tell us about the evening (optional)</small>
              <textarea rows={3} />
            </label>
            <button type="submit" className="n-btn n-btn--dark n-btn--wide">
              Send enquiry
            </button>
            <ConceptNotice>Concept website: nothing is sent.</ConceptNotice>
          </form>
        )}
      </div>
    </Dialog>
  )
}

function Visit() {
  return (
    <section className="n-sec n-visit" id="visit" aria-labelledby="n-visit-title">
      <div className="n-wrap n-visit__grid">
        <div>
          <p className="n-kicker">Visit</p>
          <h2 id="n-visit-title" className="n-serif">
            Hours &amp; <em>finding us</em>
          </h2>
          <dl className="n-hours">
            {HOURS.map(([d, h]) => (
              <div key={d}>
                <dt>{d}</dt>
                <dd>{h}</dd>
              </div>
            ))}
          </dl>
          <ConceptNotice className="n-visit__note">
            Sample hours. Anar is a fictional restaurant, so there is no address, telephone number or email to contact.
          </ConceptNotice>
        </div>
        <figure className="n-map" aria-label="Illustrative map — not a real location">
          <svg viewBox="0 0 520 360" role="img" aria-label="An illustrative street map with a pomegranate marker">
            <rect width="520" height="360" fill="#2f0a10" />
            <g stroke="rgb(244 234 216 / 0.14)" strokeWidth="14" fill="none" strokeLinecap="round">
              <path d="M-10 250 C120 230 220 260 530 200" />
              <path d="M160 -10 C170 120 150 240 190 370" />
              <path d="M360 -10 L330 370" />
            </g>
            <g stroke="rgb(244 234 216 / 0.07)" strokeWidth="6" fill="none">
              <path d="M-10 110 L530 80" />
              <path d="M-10 320 L530 300" />
              <path d="M60 -10 L80 370" />
              <path d="M450 -10 L470 370" />
            </g>
            <circle cx="262" cy="176" r="46" fill="rgb(224 165 50 / 0.12)" />
            <circle cx="262" cy="176" r="15" fill="#e0a532" />
            <circle cx="262" cy="176" r="5" fill="#2f0a10" />
            <text x="262" y="236" textAnchor="middle" fill="#f4ead8" fontSize="15" fontStyle="italic" fontFamily="Fraunces Variable, Georgia, serif">
              Anar
            </text>
          </svg>
          <figcaption>Illustrative map — not a real location</figcaption>
        </figure>
      </div>
    </section>
  )
}

function DishDialog({ dish, onClose, home }: { dish: Dish | null; onClose: () => void; home: boolean }) {
  const course = dish ? COURSES.find((c) => c.id === dish.course)! : null
  return (
    <Dialog open={Boolean(dish)} onClose={onClose} label={dish?.name ?? 'Dish'} className={`n-modal${dish?.photo ? ' n-modal--photo' : ''}`}>
      {dish && course && (
        <div className="n-dishview">
          {dish.photo && (
            <div className="n-dishview__ph">
              <Photo set={SET} name={dish.photo.key} alt={dish.photo.alt} sizes="(max-width: 700px) 100vw, 420px" focus={dish.photo.focus} />
            </div>
          )}
          <div className="n-dishview__body">
            <div className="n-modal__head">
              <p className="n-kicker n-kicker--deep">{course.label}</p>
              <CloseButton onClick={onClose} />
            </div>
            <h2 className="n-serif">{dish.name}</h2>
            <p className="n-dishview__price">{euro(dish.price)}</p>
            <p className="n-dishview__line">{dish.line}</p>
            <p>{dish.detail}</p>
            {dish.diet.length > 0 && (
              <ul className="n-tags" role="list">
                {dish.diet.map((x) => (
                  <li key={x}>{DIET[x]}</li>
                ))}
              </ul>
            )}
            <p className="n-fine">Sample dish and price. Tell us about allergies when you book — the kitchen can adapt most dishes.</p>
            <a className="n-btn n-btn--dark" href={home ? '#reserve' : href('', 'reserve')} onClick={onClose}>
              Reserve a table
            </a>
          </div>
        </div>
      )}
    </Dialog>
  )
}

function MenuPage({ onDish }: { onDish: (d: Dish) => void }) {
  const [diet, setDiet] = useState<Diet[]>([])
  const toggle = (d: Diet) => setDiet(diet.includes(d) ? diet.filter((x) => x !== d) : [...diet, d])
  const shown = (c: Course) => dishes.filter((d) => d.course === c && diet.every((x) => (x === 'v' ? d.diet.includes('v') || d.diet.includes('vg') : d.diet.includes(x))))
  const total = COURSES.reduce((n, c) => n + shown(c.id).length, 0)
  return (
    <>
      <section className="n-menuhero" aria-labelledby="n-menu-h1">
        <Photo set={SET} name="table-overhead" alt="" sizes="100vw" focus="50% 40%" priority className="n-menuhero__img" />
        <div className="n-wrap">
          <p className="n-kicker">The menu</p>
          <h1 id="n-menu-h1" className="n-serif">
            Cooked to <em>share.</em>
          </h1>
          <p>Order two or three dishes each and let them arrive as they are ready. Or ask us to cook for the table: the feast is €58 a guest.</p>
        </div>
      </section>
      <div className="n-menunav">
        <div className="n-wrap">
          <nav aria-label="Courses">
            {COURSES.map((c) => (
              <a key={c.id} href={`#${c.id}`}>
                {c.label}
              </a>
            ))}
          </nav>
          <div className="n-filter" role="group" aria-label="Dietary filter">
            {(['v', 'vg', 'gf'] as Diet[]).map((d) => (
              <button key={d} type="button" aria-pressed={diet.includes(d)} className={diet.includes(d) ? 'is-on' : ''} onClick={() => toggle(d)}>
                {DIET[d]}
              </button>
            ))}
          </div>
        </div>
      </div>
      <section className="n-sec n-fullmenu" aria-label="Dishes">
        <div className="n-wrap">
          <p className="n-count" aria-live="polite">
            {diet.length ? `${total} dishes match` : `${total} dishes`} · tap a dish for its story · sample prices
          </p>
          {COURSES.map((c) => {
            const list = shown(c.id)
            return (
              <div key={c.id} className="n-courseblock" id={c.id}>
                <div className="n-courseblock__head">
                  <h2 className="n-serif">{c.label}</h2>
                  <p>{c.note}</p>
                </div>
                {list.length ? (
                  <ul role="list">
                    {list.map((d) => (
                      <li key={d.id}>
                        <DishButton d={d} onDish={onDish} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="n-none">No dishes in this course match the filter.</p>
                )}
              </div>
            )
          })}
          <div className="n-feast">
            <div>
              <h2 className="n-serif">
                The <em>feast</em>
              </h2>
              <p>Six dishes chosen by the kitchen, tahdig, tea and something sweet — for two guests or more. €58 a guest.</p>
            </div>
            <a className="n-btn" href={href('', 'reserve')}>
              Reserve a table
            </a>
          </div>
          <p className="n-fine n-legend">V vegetarian · VG vegan · GF gluten-free · N contains nuts. Please tell us about allergies when you book.</p>
        </div>
      </section>
    </>
  )
}

function Footer() {
  return (
    <footer className="n-footer">
      <div className="n-wrap">
        <div className="n-ft">
          <div>
            <a className="n-logo" href={href()}>
              Anar <small>Dining room</small>
            </a>
            <p>A Persian dining room for long dinners and good company.</p>
          </div>
          <div>
            <h2 className="n-ft__h">Visit</h2>
            <ul role="list">
              <li>Tuesday – Sunday</li>
              <li>From 18:00 (sample hours)</li>
              <li>
                <a href={href('', 'visit')}>Hours &amp; map</a>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="n-ft__h">Explore</h2>
            <ul role="list">
              <li>
                <a href={href('menu')}>Menu</a>
              </li>
              <li>
                <a href={href('', 'private')}>Private dining</a>
              </li>
              <li>
                <a href={href('', 'tea')}>Tea</a>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="n-ft__h">Book</h2>
            <ul role="list">
              <li>
                <a href={href('', 'reserve')}>Reserve a table</a>
              </li>
              <li>
                <a href={href('', 'private')}>Enquire about the private room</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="n-legal">
          <span>Anar is a fictional restaurant. Dishes, prices and hours are sample content. Photographs: Unsplash.</span>
          <span>Concept website designed and built by P. DESIGN</span>
        </div>
      </div>
    </footer>
  )
}

export const concept: ConceptModule = {
  Site: Anar,
  paths: ['', 'menu'],
  title: (path) => (path === 'menu' ? 'Menu' : undefined),
}

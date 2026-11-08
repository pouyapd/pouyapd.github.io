import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { createCart } from '../shared/cart'
import { Checkout } from '../shared/Checkout'
import { ConceptNotice } from '../shared/ConceptNotice'
import { CloseButton, Dialog } from '../shared/Dialog'
import { conceptHref, euro } from '../shared/links'
import { Photo } from '../shared/Photo'
import type { ConceptModule, ConceptProps } from '../types'
import {
  byId,
  dayName,
  dayNum,
  disciplineLabel,
  gallery,
  isFree,
  isOpen,
  longDate,
  NEXT_FREE,
  productById,
  products,
  rituals,
  shopCategories,
  TIMES,
  treatments,
  WEEKS,
  type Discipline,
  type Product,
  type Ritual,
  type ShopCategory,
} from './data'
import './lune.css'

const SET = 'lune'
const SLUG = 'lune'
const href = (path = '', hash = '') => conceptHref(SLUG, path, hash)
const productHref = (p: Product) => href(`shop/${p.id}`)

const NAV = [
  { href: href('', 'treatments'), label: 'Treatments' },
  { href: href('', 'prices'), label: 'Prices' },
  { href: href('shop'), label: 'Shop', path: 'shop' },
  { href: href('', 'about'), label: 'About' },
]

interface Booking {
  step: 1 | 2 | 3 | 4
  treatment: string
  week: number
  date: string
  time: string
}

/* ---- the bag: kept in this browser only (there is no shop behind it) ---- */

const useCart = createCart('lune-bag', (l) => {
  const p = productById(l.id)
  return !!p && p.sizes.some((s) => s.label === l.options.size)
})
const sizeOf = (p: Product, label?: string) => p.sizes.find((s) => s.label === label) ?? p.sizes[0]
type Bag = ReturnType<typeof useCart>
const bagTotal = (bag: Bag) => bag.lines.reduce((n, l) => n + sizeOf(productById(l.id)!, l.options.size).price * l.qty, 0)

/**
 * Lune Atelier: an editorial salon website. The home page presents the four
 * crafts, the menu with prices, the gallery and a working three-step booking
 * (treatment, day and time, details) that ends in an honest confirmation. The
 * shop sells the products used in the treatment rooms: a filterable range, a
 * page for every product, a bag and a demo checkout. Nothing is sent, booked
 * or charged.
 */
function Lune({ path }: ConceptProps) {
  const [menu, setMenu] = useState(false)
  const [bagOpen, setBagOpen] = useState(false)
  const bag = useCart()
  const product = path.startsWith('shop/') ? productById(path.slice(5)) : undefined
  const section = path === '' ? 'home' : path.split('/')[0]
  const total = bagTotal(bag)

  return (
    <div className="l-root">
      <div className="l-announce">
        <div className="l-wrap">
          <span>
            Now booking <b>November</b>
            <span className="l-wide"> · first visits include a consultation</span>
          </span>
          <span className="l-wide">Shop: free delivery over €60</span>
        </div>
      </div>

      <header className="l-header">
        <div className="l-wrap l-nav">
          <ul className="l-nav__links">
            {NAV.map((n) => (
              <li key={n.label}>
                <a href={n.href} aria-current={n.path && section === n.path ? 'page' : undefined}>
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
          <a className="l-logo" href={href()}>
            <b>Lune</b> <small>Atelier</small>
          </a>
          <div className="l-nav__end">
            <button type="button" className="l-nav__bag" onClick={() => setBagOpen(true)} aria-haspopup="dialog" aria-label={`Bag, ${bag.count} ${bag.count === 1 ? 'item' : 'items'}`}>
              Bag <span aria-hidden="true">({bag.count})</span>
            </button>
            <a className="l-btn l-btn--sm" href={href('', 'book')}>
              Book now
            </a>
            <button type="button" className="l-burger" aria-label="Open the menu" aria-haspopup="dialog" onClick={() => setMenu(true)}>
              <i />
              <i />
            </button>
          </div>
        </div>
      </header>

      <Dialog open={menu} onClose={() => setMenu(false)} label="Menu" className="l-drawer">
        <div className="l-drawer__head">
          <span className="l-logo">
            <b>Lune</b>
            <small>Atelier</small>
          </span>
          <CloseButton onClick={() => setMenu(false)} />
        </div>
        <nav aria-label="Lune Atelier">
          <ul className="l-drawer__links">
            {[...NAV, { href: href('', 'gallery'), label: 'Gallery' }, { href: href('', 'visit'), label: 'Visit' }, { href: href('', 'book'), label: 'Book an appointment' }].map((n) => (
              <li key={n.label}>
                <a href={n.href} onClick={() => setMenu(false)}>
                  {n.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <p className="l-drawer__hours">Tue – Fri 9:00 – 19:00 · Sat 9:00 – 17:00</p>
      </Dialog>

      <BagDrawer bag={bag} total={total} open={bagOpen} onClose={() => setBagOpen(false)} />

      <main id="top">
        {path === '' && <Home />}
        {path === 'shop' && (
          <Shop
            onAdd={(p) => {
              bag.add(p.id, { size: p.sizes[0].label })
              setBagOpen(true)
            }}
          />
        )}
        {product && (
          <ProductPage
            key={product.id}
            product={product}
            onAdd={(size, qty) => {
              bag.add(product.id, { size }, qty)
              setBagOpen(true)
            }}
          />
        )}
        {path === 'checkout' && (
          <Checkout
            brand="Lune Atelier"
            refPrefix="LN"
            items={bag.lines.map((l, i) => {
              const p = productById(l.id)!
              const size = sizeOf(p, l.options.size)
              return {
                key: `${i}-${l.id}`,
                name: p.name,
                detail: size.label,
                unit: size.price,
                qty: l.qty,
                href: productHref(p),
                image: <Photo set={SET} name={p.photo} sizes="64px" focus={p.focus} />,
              }
            })}
            delivery={[
              { id: 'standard', label: 'Standard delivery', detail: '2–4 working days · free over €60', price: total >= 60 ? 0 : 4.9 },
              { id: 'express', label: 'Express delivery', detail: 'Next working day, ordered before 2 pm', price: 9.9 },
              { id: 'collect', label: 'Collect at the atelier', detail: 'Ready the same day, with samples to try', price: 0 },
            ]}
            payments={[
              { id: 'card', label: 'Card', detail: 'A real shop would open a secure payment page here. This demo asks for nothing.' },
              { id: 'atelier', label: 'Pay when you collect', detail: 'For collection at the atelier' },
            ]}
            extra={{ label: 'Add two samples for my skin', detail: 'Travel sizes, chosen by our facialists' }}
            onEditCart={() => setBagOpen(true)}
            shopHref={href('shop')}
            shopLabel="Back to the shop"
            onPlaced={bag.clear}
          />
        )}
      </main>

      <LuneFooter />
    </div>
  )
}

/** The one-page home: hero, the four crafts, the signature treatment, the menu, the story, the gallery and booking. */
function Home() {
  const [ritual, setRitual] = useState<Ritual | null>(null)
  const [photo, setPhoto] = useState<number | null>(null)
  const [booking, setBooking] = useState<Booking>({ step: 1, treatment: '', week: 0, date: '', time: '' })
  const bookRef = useRef<HTMLElement>(null)

  /** start (or restart) the booking with a treatment chosen elsewhere on the page */
  const book = (treatment: string, date = '', time = '') => {
    setRitual(null)
    const week = date ? Math.max(0, WEEKS.findIndex((w) => w.includes(date))) : 0
    setBooking({ step: date && time ? 3 : 2, treatment, week, date, time })
    requestAnimationFrame(() => {
      bookRef.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
      bookRef.current?.querySelector<HTMLElement>('.l-panel')?.focus({ preventScroll: true })
    })
  }

  return (
    <>
      <section className="l-wrap l-hero" aria-labelledby="l-hero-title">
        <div className="l-hero__copy">
          <p className="l-kicker">Hair · Brows · Lashes · Skin</p>
          <h1 id="l-hero-title" className="l-serif">
            <span>The art of</span>
            <span className="l-indent">
              <em>quiet</em>
            </span>
            <span>beauty.</span>
          </h1>
          <p className="l-hero__lead">
            An atelier for colour, cut and care — brows shaped by hand, lashes lifted, skin brought back to calm. Every appointment begins with a
            conversation.
          </p>
          <div className="l-actions">
            <a className="l-btn" href={href('', 'book')}>
              Book an appointment <i aria-hidden="true">→</i>
            </a>
            <a className="l-btn l-btn--line" href={href('', 'prices')}>
              Treatments &amp; prices
            </a>
          </div>
          <div className="l-slot">
            <button type="button" className="l-avail" onClick={() => book(NEXT_FREE.treatment, NEXT_FREE.date, NEXT_FREE.time)}>
              <i aria-hidden="true" />
              <span>Next available</span>
              <b>
                {longDate(NEXT_FREE.date)}, {NEXT_FREE.time}
              </b>
            </button>
            <p>Brow sculpt with any specialist · 45 min</p>
          </div>
        </div>
        <div className="l-hero__art">
          <div className="l-hero__main">
            <Photo set={SET} name="portrait-hand" alt="A woman with long, glossy dark hair, her hand resting lightly against her face, in soft warm light." sizes="(max-width: 700px) 86vw, 46vw" focus="46% 30%" priority />
          </div>
          <div className="l-hero__inset">
            <Photo set={SET} name="hair-braid" alt="A loose, textured braid seen from behind." sizes="(max-width: 700px) 34vw, 240px" focus="50% 45%" />
          </div>
          <div className="l-seal" aria-hidden="true">
            <svg viewBox="0 0 150 150">
              <defs>
                <path id="l-seal-path" d="M75 75m-58 0a58 58 0 1 1 116 0a58 58 0 1 1-116 0" />
              </defs>
              <circle cx="75" cy="75" r="74" fill="#2a1d18" />
              <text fontSize="10.5" fontWeight="600" letterSpacing="3.6" fill="#cdb08a">
                <textPath href="#l-seal-path">HAIR · BROWS · LASHES · SKIN · BY APPOINTMENT ·</textPath>
              </text>
              <text x="75" y="88" textAnchor="middle" className="l-seal__l" fill="#f6f0e9">
                L
              </text>
            </svg>
          </div>
        </div>
      </section>

      <div className="l-strip" aria-hidden="true">
        <div>
          {[0, 1].map((k) => (
            <span key={k} className="l-strip__set">
              {['Colour & gloss', 'Brow lamination', 'Lash lift', 'Signature facial', 'Precision cut', 'Scalp ritual', 'Bridal hair'].map((w) => (
                <span key={w}>{w}</span>
              ))}
            </span>
          ))}
        </div>
      </div>

      <section className="l-sec" id="treatments" aria-labelledby="l-rituals">
        <div className="l-wrap">
          <div className="l-head">
            <div>
              <p className="l-kicker">The rituals</p>
              <h2 id="l-rituals" className="l-serif">
                Four crafts, <em>one</em> unhurried room.
              </h2>
            </div>
            <p>Each discipline has its own specialist. Open one to see its treatments, what to expect and the prices — and book from there.</p>
          </div>
          <ul className="l-cats" role="list">
            {rituals.map((r) => {
              const first = treatments.filter((t) => t.discipline === r.discipline).sort((a, b) => a.price - b.price)[0]
              return (
                <li key={r.discipline} className="l-cat">
                  <button type="button" className="l-cat__btn" onClick={() => setRitual(r)} aria-haspopup="dialog">
                    <span className="l-cat__ph">
                      <Photo set={SET} name={r.photo} alt="" sizes="(max-width: 700px) 44vw, 22vw" focus={r.focus} />
                    </span>
                    <span className="l-cat__n" aria-hidden="true">
                      {r.numeral}
                    </span>
                    <span className="l-cat__title">{r.title}</span>
                    <span className="l-cat__line">{r.line}</span>
                    <span className="l-cat__from">
                      <span>
                        {first.name} · {first.minutes} min
                      </span>
                      <b>from {euro(first.price)}</b>
                    </span>
                    <span className="l-cat__more">View treatments →</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      <RitualDialog ritual={ritual} onClose={() => setRitual(null)} onBook={book} />

      <section className="l-sec l-sig" id="signature" aria-labelledby="l-sig-title">
        <div className="l-wrap">
          <div className="l-sig__art">
            <div className="l-sig__a">
              <Photo set={SET} name="brow-treatment" alt="A brow treatment in progress." sizes="(max-width: 700px) 54vw, 26vw" focus="42% 50%" />
            </div>
            <div className="l-sig__b">
              <Photo set={SET} name="portrait-auburn" alt="A woman with auburn hair, freckles and softly groomed brows, against a warm beige wall." sizes="(max-width: 700px) 40vw, 19vw" focus="50% 30%" />
            </div>
          </div>
          <div>
            <p className="l-kicker">Signature treatment</p>
            <h2 id="l-sig-title" className="l-serif">
              The brow &amp; lash <em>edit.</em>
            </h2>
            <p className="l-lead">Our most-requested pairing: brows mapped and laminated, lashes lifted and tinted, in one calm sitting.</p>
            <ol className="l-steps">
              {[
                ['Mapping', 'We measure the arch to your bone structure, not a stencil.', '10 min'],
                ['Brow lamination & tint', 'Hairs set in place, softly tinted to your colouring.', '35 min'],
                ['Lash lift & tint', 'A natural curl that lasts six to eight weeks.', '45 min'],
              ].map(([t, d, m], i) => (
                <li key={t}>
                  <span className="l-steps__k">0{i + 1}</span>
                  <div>
                    <b>{t}</b>
                    <span>{d}</span>
                  </div>
                  <span className="l-steps__d">{m}</span>
                </li>
              ))}
            </ol>
            <div className="l-price">
              <span className="l-price__p l-serif">
                <small>90 min</small>
                {euro(135)}
              </span>
              <button type="button" className="l-btn" onClick={() => book('edit')}>
                Book the edit <i aria-hidden="true">→</i>
              </button>
            </div>
          </div>
        </div>
      </section>

      <PriceMenu onBook={book} />

      <section className="l-phil" id="about" aria-labelledby="l-phil-title">
        <div className="l-wrap">
          <div className="l-phil__ph1">
            <Photo set={SET} name="portrait-freckles" alt="A woman with freckled skin and loose waves, seen in profile against a warm wall." sizes="(max-width: 700px) 44vw, 26vw" focus="50% 30%" />
          </div>
          <blockquote>
            <p className="l-kicker">Our way</p>
            <h2 id="l-phil-title" className="l-serif">
              Fewer products, better ones — and time to <em>breathe</em> between them.
            </h2>
            <p>We keep the room quiet, the shelf short and the appointment unhurried. Everything we use, you can take home.</p>
            <div className="l-facts">
              <div>
                <b>4</b>
                <span>disciplines</span>
              </div>
              <div>
                <b>One</b>
                <span>guest per specialist</span>
              </div>
              <div>
                <b>48 h</b>
                <span>patch test for tints</span>
              </div>
            </div>
          </blockquote>
          <div className="l-phil__ph2">
            <Photo set={SET} name="skin-cream" alt="A swatch of rich cream on warm paper." sizes="(max-width: 700px) 44vw, 22vw" />
          </div>
        </div>
      </section>

      <section className="l-sec" aria-labelledby="l-notes-title">
        <div className="l-wrap">
          <div className="l-head">
            <div>
              <p className="l-kicker">Guest notes</p>
              <h2 id="l-notes-title" className="l-serif">
                Kind <em>words.</em>
              </h2>
            </div>
            <p>
              <span className="l-sample">Fictional sample reviews — written for this concept</span>
            </p>
          </div>
          <ul className="l-notes" role="list">
            {[
              ['My brows finally look like mine, only better. The mapping made all the difference.', 'Brow sculpt'],
              ['The calmest hour of my month. The gloss still shines three weeks later.', 'Colour & gloss'],
              ['I booked on my phone in under a minute, and they remembered everything I said.', 'Lash lift'],
            ].map(([q, t]) => (
              <li key={t} className="l-note">
                <q>{q}</q>
                <p>
                  <b>Sample guest</b>
                  <span>{t}</span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="l-sec l-sec--flush" id="gallery" aria-labelledby="l-gal-title">
        <div className="l-wrap">
          <h2 id="l-gal-title" className="l-kicker l-gal__title">
            From the atelier
          </h2>
          <ul className="l-gal" role="list">
            {gallery.map((g, i) => (
              <li key={g.photo} className={`l-gal__i l-gal__i--${i + 1}`}>
                <button type="button" onClick={() => setPhoto(i)} aria-label={`Enlarge: ${g.alt}`} aria-haspopup="dialog">
                  <Photo set={SET} name={g.photo} alt="" sizes="(max-width: 700px) 46vw, 26vw" focus={g.focus} />
                </button>
              </li>
            ))}
          </ul>
          <p className="l-gal__foot">Colour work, brow maps and quiet details — tap any image to see it larger.</p>
        </div>
      </section>

      <Lightbox index={photo} onClose={() => setPhoto(null)} onMove={setPhoto} />

      <section className="l-sec l-book" id="book" ref={bookRef} aria-labelledby="l-book-title">
        <div className="l-wrap">
          <div>
            <p className="l-kicker">Online booking</p>
            <h2 id="l-book-title" className="l-serif">
              Book in <em>three</em> calm steps.
            </h2>
            <p className="l-lead">Choose a treatment, a day and a time, then leave your details. You would receive a confirmation by email and a reminder the day before.</p>
            <div className="l-visit" id="visit">
              <div className="l-visit__ph">
                <Photo set={SET} name="lash-detail" alt="A close-up of long, softly curled lashes and a groomed brow." sizes="150px" focus="50% 50%" />
              </div>
              <div>
                <b>Visit the atelier</b>
                <span>
                  Tue – Fri 9:00 – 19:00 · Sat 9:00 – 17:00
                  <br />
                  Sample hours — Lune is a fictional salon, so there is no address.
                </span>
              </div>
            </div>
          </div>
          <BookingPanel booking={booking} setBooking={setBooking} />
        </div>
      </section>
      <ShopTeaser />
    </>
  )
}

/* ---- the shop ---- */

const SORTS = [
  { id: 'featured', label: 'Featured' },
  { id: 'low', label: 'Price, low to high' },
  { id: 'high', label: 'Price, high to low' },
] as const

/** A short band on the home page: three products from the treatment rooms. */
function ShopTeaser() {
  return (
    <section className="l-sec l-teaser" aria-labelledby="l-teaser-title">
      <div className="l-wrap">
        <div className="l-head">
          <div>
            <p className="l-kicker">The shop</p>
            <h2 id="l-teaser-title" className="l-serif">
              What we use, <em>to take home.</em>
            </h2>
          </div>
          <p>
            The serums, oils and balms from the treatment rooms, in full sizes. <a href={href('shop')}>See the whole range →</a>
          </p>
        </div>
        <ul className="l-products l-products--three" role="list">
          {['water-serum', 'gloss-oil', 'cleansing-balm'].map((id) => (
            <li key={id}>
              <ProductCard p={productById(id)!} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function ProductCard({ p, onAdd }: { p: Product; onAdd?: (p: Product) => void }) {
  return (
    <article className="l-product">
      <a href={productHref(p)} className="l-product__link">
        <span className="l-product__ph">
          {p.tag && <span className="l-product__tag">{p.tag}</span>}
          <Photo set={SET} name={p.photo} alt={p.alt} sizes="(max-width: 700px) 46vw, 24vw" focus={p.focus} />
        </span>
        <span className="l-product__name">{p.name}</span>
        <span className="l-product__line">{p.line}</span>
        <span className="l-product__price">
          {p.sizes.length > 1 ? 'from ' : ''}
          {euro(p.sizes[0].price)} <small>· {p.sizes[0].label}</small>
        </span>
      </a>
      {onAdd && (
        <button type="button" className="l-product__add" onClick={() => onAdd(p)} aria-label={`Add to bag: ${p.name}, ${p.sizes[0].label}`}>
          Add to bag
        </button>
      )}
    </article>
  )
}

/** The range, filtered by category (kept in the address: /shop/#skin) and sorted. */
function Shop({ onAdd }: { onAdd: (p: Product) => void }) {
  const [cat, setCat] = useState<'all' | ShopCategory>('all')
  const [sort, setSort] = useState<(typeof SORTS)[number]['id']>('featured')
  useEffect(() => {
    const read = () => {
      const h = location.hash.slice(1)
      setCat(shopCategories.some((c) => c.id === h) ? (h as ShopCategory) : 'all')
    }
    read()
    addEventListener('hashchange', read)
    return () => removeEventListener('hashchange', read)
  }, [])
  const choose = (id: 'all' | ShopCategory) => {
    setCat(id)
    history.replaceState(null, '', id === 'all' ? location.pathname : `#${id}`)
  }
  const shown = useMemo(() => {
    const list = products.filter((p) => cat === 'all' || p.category === cat)
    if (sort === 'low') return [...list].sort((a, b) => a.sizes[0].price - b.sizes[0].price)
    if (sort === 'high') return [...list].sort((a, b) => b.sizes[0].price - a.sizes[0].price)
    return list
  }, [cat, sort])

  return (
    <>
      <section className="l-wrap l-shop-hero" aria-labelledby="l-shop-title">
        <div>
          <p className="l-kicker">The shop</p>
          <h1 id="l-shop-title" className="l-serif">
            Fewer products, <em>better ones.</em>
          </h1>
          <p className="l-lead">Everything we use in the treatment rooms, in full sizes to take home — chosen by our specialists, unscented unless we say so.</p>
        </div>
        <div className="l-shop-hero__ph">
          <Photo set={SET} name="room-basin" alt="A bright treatment room with a wash basin, a black salon chair and a woven stool." sizes="(max-width: 700px) 92vw, 38vw" focus="58% 50%" priority />
        </div>
      </section>

      <section className="l-sec l-shop" aria-label="Products">
        <div className="l-wrap">
          <div className="l-shop__bar">
            <div className="l-chips" role="group" aria-label="Filter by category">
              {[{ id: 'all' as const, label: 'All' }, ...shopCategories].map((c) => (
                <button key={c.id} type="button" aria-pressed={cat === c.id} className={cat === c.id ? 'is-on' : ''} onClick={() => choose(c.id)}>
                  {c.label}
                </button>
              ))}
            </div>
            <label className="l-sort">
              <span>Sort</span>
              <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
                {SORTS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="l-shop__count" aria-live="polite">
            {shown.length} {shown.length === 1 ? 'product' : 'products'}
          </p>
          <ul className="l-products" role="list">
            {shown.map((p) => (
              <li key={p.id}>
                <ProductCard p={p} onAdd={onAdd} />
              </li>
            ))}
          </ul>
          <p className="l-menu-note">Sample range and prices: Lune Atelier is a fictional salon, so nothing here can be bought.</p>
        </div>
      </section>
    </>
  )
}

/** A price whose digits roll to the new value when the size changes (each digit is a strip of 0–9). */
function RollingPrice({ text }: { text: string }) {
  return (
    <>
      <span className="visually-hidden">{text}</span>
      <span className="l-roll" aria-hidden="true">
        {[...text].map((c, i) =>
          /\d/.test(c) ? (
            <span key={i} className="l-roll__d">
              <span className="l-roll__strip" style={{ transform: `translateY(${-Number(c) * 1.1}em)` }}>
                {'0123456789'.split('').map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </span>
            </span>
          ) : (
            <span key={i}>{c}</span>
          ),
        )}
      </span>
    </>
  )
}

function ProductPage({ product: p, onAdd }: { product: Product; onAdd: (size: string, qty: number) => void }) {
  const [size, setSize] = useState(p.sizes[0].label)
  const [qty, setQty] = useState(1)
  const price = sizeOf(p, size).price
  const t = byId(p.treatment)
  const cat = shopCategories.find((c) => c.id === p.category)!
  const related = products.filter((x) => x.id !== p.id && x.category === p.category).concat(products.filter((x) => x.id !== p.id && x.category !== p.category)).slice(0, 3)
  return (
    <>
      <div className="l-wrap l-pdp">
        <nav className="l-crumbs" aria-label="Breadcrumb">
          <a href={href('shop')}>Shop</a>
          <span aria-hidden="true">/</span>
          <a href={href('shop', cat.id)}>{cat.label}</a>
        </nav>
        <div className="l-pdp__ph">
          <Photo set={SET} name={p.photo} alt={p.alt} sizes="(max-width: 700px) 92vw, 48vw" focus={p.focus} priority />
        </div>
        <div className="l-pdp__info">
          <p className="l-kicker">{cat.label}</p>
          <h1 className="l-serif">{p.name}</h1>
          <p className="l-pdp__line">{p.line}</p>
          <p className="l-pdp__price" aria-live="polite">
            <RollingPrice text={euro(price)} />
          </p>
          {p.sizes.length > 1 && (
            <fieldset className="l-sizes">
              <legend className="l-lbl">Size</legend>
              {p.sizes.map((s) => (
                <label key={s.label} className={size === s.label ? 'is-on' : ''}>
                  <input type="radio" name="l-size" value={s.label} checked={size === s.label} onChange={() => setSize(s.label)} />
                  <span>{s.label}</span>
                  <small>{euro(s.price)}</small>
                </label>
              ))}
            </fieldset>
          )}
          <div className="l-pdp__buy">
            <div className="l-qty" role="group" aria-label="Quantity">
              <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} aria-label="One fewer" disabled={qty <= 1}>
                −
              </button>
              <output aria-live="polite">{qty}</output>
              <button type="button" onClick={() => setQty(Math.min(9, qty + 1))} aria-label="One more" disabled={qty >= 9}>
                +
              </button>
            </div>
            <button type="button" className="l-btn l-btn--wide" onClick={() => onAdd(size, qty)}>
              Add to bag · {euro(price * qty)}
            </button>
          </div>
          <p className="l-fine">Free delivery over €60 · collect at the atelier the same day. Sample prices.</p>
          <div className="l-acc">
            <details open>
              <summary>What it does</summary>
              <p>{p.detail}</p>
            </details>
            <details>
              <summary>How to use</summary>
              <p>{p.use}</p>
            </details>
            <details>
              <summary>Key ingredients</summary>
              <ul role="list">
                {p.ingredients.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </details>
            <details>
              <summary>Delivery &amp; returns</summary>
              <p>Sample policy: delivery in two to four working days, and unopened products can be returned within 30 days.</p>
            </details>
          </div>
          {t && (
            <p className="l-pdp__used">
              Used in the atelier in the <b>{t.name.toLowerCase()}</b> ({t.minutes} min, {euro(t.price)}). <a href={href('', 'prices')}>See the treatment →</a>
            </p>
          )}
        </div>
      </div>
      <section className="l-sec" aria-labelledby="l-rel-title">
        <div className="l-wrap">
          <h2 id="l-rel-title" className="l-kicker">
            Also from the treatment rooms
          </h2>
          <ul className="l-products l-products--three" role="list">
            {related.map((x) => (
              <li key={x.id}>
                <ProductCard p={x} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  )
}

function BagDrawer({ bag, total, open, onClose }: { bag: Bag; total: number; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} label="Your bag" className="l-drawer l-drawer--bag">
      <div className="l-drawer__head">
        <h2 className="l-serif l-bag__title">Your bag</h2>
        <CloseButton onClick={onClose} />
      </div>
      {bag.lines.length === 0 ? (
        <div className="l-bag__empty">
          <p>Your bag is empty.</p>
          <a className="l-btn" href={href('shop')} onClick={onClose}>
            Visit the shop
          </a>
        </div>
      ) : (
        <>
          <ul className="l-bag" role="list">
            {bag.lines.map((l, i) => {
              const p = productById(l.id)!
              const s = sizeOf(p, l.options.size)
              return (
                <li key={`${l.id}-${l.options.size}`}>
                  <a className="l-bag__ph" href={productHref(p)} tabIndex={-1} aria-hidden="true">
                    <Photo set={SET} name={p.photo} sizes="80px" focus={p.focus} />
                  </a>
                  <div>
                    <a href={productHref(p)} className="l-bag__name">
                      {p.name}
                    </a>
                    <small>{s.label}</small>
                    <div className="l-qty l-qty--sm">
                      <button type="button" onClick={() => bag.setQty(i, l.qty - 1)} aria-label={`One fewer ${p.name}`}>
                        −
                      </button>
                      <output aria-label="Quantity">{l.qty}</output>
                      <button type="button" onClick={() => bag.setQty(i, l.qty + 1)} aria-label={`One more ${p.name}`} disabled={l.qty >= 9}>
                        +
                      </button>
                      <button type="button" className="l-bag__rm" onClick={() => bag.setQty(i, 0)}>
                        Remove
                      </button>
                    </div>
                  </div>
                  <span className="l-bag__price">{euro(s.price * l.qty)}</span>
                </li>
              )
            })}
          </ul>
          <div className="l-bag__foot">
            <p className="l-bag__sum">
              <span>Subtotal</span>
              <b>{euro(total)}</b>
            </p>
            <p className="l-fine">{total >= 60 ? 'Free delivery on this order.' : `Add ${euro(Math.round((60 - total) * 100) / 100)} more for free delivery.`}</p>
            <a className="l-btn l-btn--wide" href={href('checkout')}>
              Checkout <i aria-hidden="true">→</i>
            </a>
            <p className="l-fine">A demo checkout: no payment is taken and nothing is ordered. The bag is kept only in this browser.</p>
          </div>
        </>
      )}
    </Dialog>
  )
}

function RitualDialog({ ritual, onClose, onBook }: { ritual: Ritual | null; onClose: () => void; onBook: (id: string) => void }) {
  const list = ritual ? treatments.filter((t) => t.discipline === ritual.discipline) : []
  return (
    <Dialog open={Boolean(ritual)} onClose={onClose} label={ritual ? `${ritual.title} treatments` : 'Treatments'} className="l-modal">
      {ritual && (
        <div className="l-ritual">
          <div className="l-ritual__ph">
            <Photo set={SET} name={ritual.photo} alt={ritual.alt} sizes="(max-width: 700px) 100vw, 380px" focus={ritual.focus} />
          </div>
          <div className="l-ritual__body">
            <CloseButton onClick={onClose} className="l-ritual__close" />
            <p className="l-kicker">Ritual {ritual.numeral}</p>
            <h2 className="l-serif">{ritual.title}</h2>
            <p className="l-ritual__intro">{ritual.intro}</p>
            <ul className="l-ritual__list" role="list">
              {list.map((t) => (
                <li key={t.id}>
                  <div>
                    <b>{t.name}</b>
                    <span>{t.detail}</span>
                    <small>
                      {t.minutes} min · {t.from ? 'from ' : ''}
                      {euro(t.price)}
                    </small>
                  </div>
                  <button type="button" className="l-btn l-btn--sm" onClick={() => onBook(t.id)} aria-label={`Book ${t.name}`}>
                    Book
                  </button>
                </li>
              ))}
            </ul>
            <p className="l-kicker l-ritual__exp">What to expect</p>
            <ul className="l-ritual__expect" role="list">
              {ritual.expect.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Dialog>
  )
}

const TABS: { id: 'all' | Discipline; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'hair', label: 'Hair' },
  { id: 'brows', label: 'Brows' },
  { id: 'lashes', label: 'Lashes' },
  { id: 'skin', label: 'Skin' },
]

function PriceMenu({ onBook }: { onBook: (id: string) => void }) {
  const [tab, setTab] = useState<'all' | Discipline>('all')
  const id = useId()
  const shown = treatments.filter((t) => tab === 'all' || t.discipline === tab)
  const groups = (['hair', 'brows', 'lashes', 'skin'] as Discipline[]).filter((d) => shown.some((t) => t.discipline === d))
  return (
    <section className="l-sec" id="prices" aria-labelledby="l-menu-title">
      <div className="l-wrap">
        <div className="l-menu-head">
          <div>
            <p className="l-kicker">Treatments &amp; prices</p>
            <h2 id="l-menu-title" className="l-serif">
              The <em>menu.</em>
            </h2>
          </div>
          <div className="l-tabs" role="tablist" aria-label="Filter treatments">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`${id}-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`${id}-panel`}
                className={tab === t.id ? 'is-on' : ''}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="l-menu" id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${tab}`}>
          {groups.map((d) => (
            <div key={d}>
              <h3>{disciplineLabel[d]}</h3>
              <ul role="list">
                {shown
                  .filter((t) => t.discipline === d)
                  .map((t) => (
                    <li key={t.id}>
                      <b>{t.name}</b>
                      <span className="l-menu__pr">
                        {t.from ? 'from ' : ''}
                        {euro(t.price)}
                      </span>
                      <span>{t.line}</span>
                      <span className="l-menu__t">{t.minutes} min</span>
                      <button type="button" className="l-menu__book" onClick={() => onBook(t.id)} aria-label={`Book ${t.name}`}>
                        Book →
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="l-menu-note">Sample prices. They include consultation and aftercare advice. A patch test is needed 48 hours before any tint.</p>
      </div>
    </section>
  )
}

function Lightbox({ index, onClose, onMove }: { index: number | null; onClose: () => void; onMove: (i: number) => void }) {
  const g = index === null ? null : gallery[index]
  const go = (d: number) => index !== null && onMove((index + d + gallery.length) % gallery.length)
  return (
    <Dialog open={index !== null} onClose={onClose} label="Gallery" className="l-lightbox">
      {g && (
        <figure
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') go(1)
            if (e.key === 'ArrowLeft') go(-1)
          }}
        >
          <Photo set={SET} name={g.photo} alt={g.alt} sizes="(max-width: 700px) 100vw, 70vw" focus={g.focus} />
          <figcaption>
            <span>
              {index! + 1} / {gallery.length} · {g.alt}
            </span>
            <span className="l-lightbox__nav">
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

function BookingPanel({ booking, setBooking }: { booking: Booking; setBooking: (b: Booking) => void }) {
  const [details, setDetails] = useState({ name: '', email: '', phone: '', note: '' })
  const [error, setError] = useState('')
  const t = byId(booking.treatment)
  const set = (patch: Partial<Booking>) => setBooking({ ...booking, ...patch })
  const week = WEEKS[booking.week]
  const steps = ['Treatment', 'Day & time', 'Details']

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!details.name.trim()) return setError('Please add your name.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) return setError('Please add a valid email address.')
    setError('')
    set({ step: 4 })
  }

  return (
    <div className="l-panel" tabIndex={-1} aria-live="polite">
      {booking.step < 4 && (
        <ol className="l-prog" aria-label="Booking steps">
          {steps.map((s, i) => {
            const n = (i + 1) as 1 | 2 | 3
            const done = booking.step > n
            return (
              <li key={s} className={done || booking.step === n ? 'is-done' : ''} aria-current={booking.step === n ? 'step' : undefined}>
                {done ? (
                  <button type="button" onClick={() => set({ step: n })}>
                    {n} · {s}
                  </button>
                ) : (
                  <span>
                    {n} · {s}
                  </span>
                )}
              </li>
            )
          })}
        </ol>
      )}

      {booking.step === 1 && (
        <fieldset className="l-pick">
          <legend className="l-lbl">Choose a treatment</legend>
          {(['hair', 'brows', 'lashes', 'skin'] as Discipline[]).map((d) => (
            <div key={d} className="l-pick__group">
              <p className="l-pick__d">{disciplineLabel[d]}</p>
              {treatments
                .filter((x) => x.discipline === d)
                .map((x) => (
                  <label key={x.id} className={booking.treatment === x.id ? 'is-on' : ''}>
                    <input type="radio" name="l-treatment" value={x.id} checked={booking.treatment === x.id} onChange={() => set({ treatment: x.id })} />
                    <span>{x.name}</span>
                    <small>
                      {x.minutes} min · {x.from ? 'from ' : ''}
                      {euro(x.price)}
                    </small>
                  </label>
                ))}
            </div>
          ))}
          <button type="button" className="l-btn l-btn--wide" disabled={!t} onClick={() => set({ step: 2 })}>
            {t ? `Continue with ${t.name}` : 'Choose a treatment to continue'} <i aria-hidden="true">→</i>
          </button>
        </fieldset>
      )}

      {booking.step === 2 && t && (
        <div>
          <div className="l-chosen">
            <div>
              <b>{t.name}</b>
              <span>{t.minutes} min · any specialist</span>
            </div>
            <span>
              {t.from ? 'from ' : ''}
              {euro(t.price)}
            </span>
          </div>
          <div className="l-lbl">
            <span>November 2026 · sample calendar</span>
            <span className="l-weeknav">
              <button type="button" aria-label="Previous week" disabled={booking.week === 0} onClick={() => set({ week: booking.week - 1, date: '', time: '' })}>
                ‹
              </button>
              <button type="button" aria-label="Next week" disabled={booking.week === WEEKS.length - 1} onClick={() => set({ week: booking.week + 1, date: '', time: '' })}>
                ›
              </button>
            </span>
          </div>
          <div className="l-days" role="group" aria-label="Day">
            {week.map((d) => (
              <button
                key={d}
                type="button"
                disabled={!isOpen(d)}
                aria-pressed={booking.date === d}
                className={booking.date === d ? 'is-on' : ''}
                onClick={() => set({ date: d, time: '' })}
                aria-label={`${longDate(d)}${isOpen(d) ? '' : ', closed'}`}
              >
                {dayName(d)}
                <b>{dayNum(d)}</b>
              </button>
            ))}
          </div>
          {booking.date ? (
            <>
              <p className="l-lbl">
                <span>Times on {longDate(booking.date)}</span>
                <span>{TIMES.filter((x) => isFree(booking.date, x, t.id)).length} free</span>
              </p>
              <div className="l-times" role="group" aria-label="Time">
                {TIMES.map((x) => {
                  const free = isFree(booking.date, x, t.id)
                  return (
                    <button
                      key={x}
                      type="button"
                      disabled={!free}
                      aria-pressed={booking.time === x}
                      className={booking.time === x ? 'is-on' : ''}
                      onClick={() => set({ time: x })}
                      aria-label={`${x}${free ? '' : ', taken'}`}
                    >
                      {x}
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <p className="l-hint">Choose a day to see its times. The atelier is closed on Sundays and Mondays.</p>
          )}
          <button type="button" className="l-btn l-btn--wide" disabled={!booking.time} onClick={() => set({ step: 3 })}>
            {booking.time ? `Continue — ${longDate(booking.date)}, ${booking.time}` : 'Choose a time'} <i aria-hidden="true">→</i>
          </button>
          <p className="l-fine">Free changes up to 24 hours before your visit.</p>
        </div>
      )}

      {booking.step === 3 && t && (
        <form className="l-form" onSubmit={submit} noValidate>
          <div className="l-chosen">
            <div>
              <b>{t.name}</b>
              <span>
                {longDate(booking.date)}, {booking.time} · {t.minutes} min
              </span>
            </div>
            <span>{euro(t.price)}</span>
          </div>
          <label>
            <span>Name</span>
            <input autoComplete="name" value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} required />
          </label>
          <label>
            <span>Email</span>
            <input type="email" autoComplete="email" value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })} required />
          </label>
          <label>
            <span>Phone (optional)</span>
            <input type="tel" autoComplete="tel" value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} />
          </label>
          <label>
            <span>Anything we should know? (optional)</span>
            <textarea rows={3} value={details.note} onChange={(e) => setDetails({ ...details, note: e.target.value })} />
          </label>
          {error && (
            <p className="l-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="l-btn l-btn--wide">
            Confirm booking <i aria-hidden="true">→</i>
          </button>
          <ConceptNotice className="l-fine">Concept website: confirming shows the next screen only — nothing is sent or booked.</ConceptNotice>
        </form>
      )}

      {booking.step === 4 && t && (
        <div className="l-done">
          <p className="l-kicker">Booking — concept preview</p>
          <h3 className="l-serif">
            See you on <em>{longDate(booking.date)}</em>, {details.name.split(' ')[0] || 'there'}.
          </h3>
          <dl>
            <div>
              <dt>Treatment</dt>
              <dd>{t.name}</dd>
            </div>
            <div>
              <dt>When</dt>
              <dd>
                {longDate(booking.date)} 2026, {booking.time} · {t.minutes} min
              </dd>
            </div>
            <div>
              <dt>Price</dt>
              <dd>{euro(t.price)}, paid at the atelier</dd>
            </div>
          </dl>
          <ConceptNotice>
            This is the confirmation screen of a concept website. No appointment was made and your details were not sent or stored — Lune Atelier is a fictional salon.
          </ConceptNotice>
          <button
            type="button"
            className="l-btn l-btn--line l-btn--wide"
            onClick={() => {
              setDetails({ name: '', email: '', phone: '', note: '' })
              setBooking({ step: 1, treatment: '', week: 0, date: '', time: '' })
            }}
          >
            Start again
          </button>
        </div>
      )}
    </div>
  )
}

function LuneFooter() {
  const [sent, setSent] = useState(false)
  return (
    <footer className="l-footer">
      <div className="l-wrap">
        <div className="l-ft">
          <div>
            <a className="l-logo l-logo--left" href={href()}>
              <b>Lune</b> <small>Atelier</small>
            </a>
            <p>Hair, brows, lashes and skin, by appointment, in a quiet room.</p>
          </div>
          <div>
            <h2 className="l-ft__h">Treatments</h2>
            <ul role="list">
              <li>
                <a href={href('', 'treatments')}>Hair</a>
              </li>
              <li>
                <a href={href('', 'treatments')}>Brows &amp; lashes</a>
              </li>
              <li>
                <a href={href('', 'treatments')}>Skin</a>
              </li>
              <li>
                <a href={href('', 'prices')}>Prices</a>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="l-ft__h">Atelier</h2>
            <ul role="list">
              <li>
                <a href={href('', 'about')}>Our way</a>
              </li>
              <li>
                <a href={href('', 'gallery')}>Gallery</a>
              </li>
              <li>
                <a href={href('shop')}>Shop</a>
              </li>
              <li>
                <a href={href('', 'visit')}>Opening hours</a>
              </li>
              <li>
                <a href={href('', 'book')}>Book</a>
              </li>
            </ul>
          </div>
          <div>
            <h2 className="l-ft__h">Letters from Lune</h2>
            {sent ? (
              <ConceptNotice>Thank you — in this concept nothing is sent, so no letter will arrive.</ConceptNotice>
            ) : (
              <form
                className="l-sub"
                onSubmit={(e) => {
                  e.preventDefault()
                  setSent(true)
                }}
              >
                <label htmlFor="l-sub-email">Seasonal care notes, once a month.</label>
                <div>
                  <input id="l-sub-email" type="email" placeholder="Your email" required />
                  <button type="submit">Subscribe</button>
                </div>
              </form>
            )}
          </div>
        </div>
        <div className="l-bigname" aria-hidden="true" />
        <div className="l-ft-bottom">
          <span>Lune Atelier is a fictional salon. Prices, times and reviews are sample content. Photographs: Unsplash.</span>
          <span>Concept website designed and built by P. DESIGN</span>
        </div>
      </div>
    </footer>
  )
}

export const concept: ConceptModule = {
  Site: Lune,
  paths: ['', 'shop', 'checkout', ...products.map((p) => `shop/${p.id}`)],
  title: (path) => (path === 'shop' ? 'The shop' : path === 'checkout' ? 'Checkout' : productById(path.replace('shop/', ''))?.name),
}

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useSolitaire } from '../../components/motion/lab/useSolitaire'
import { createCart, type CartLine } from '../shared/cart'
import { Checkout } from '../shared/Checkout'
import { ConceptNotice } from '../shared/ConceptNotice'
import { CloseButton, Dialog } from '../shared/Dialog'
import { conceptHref, euro } from '../shared/links'
import { Photo } from '../shared/Photo'
import type { ConceptModule, ConceptProps } from '../types'
import { CATEGORIES, inCategory, METALS, pieceById, pieces, type Metal, type Piece } from './data'
import './aurel.css'

const SET = 'aurel'
const SLUG = 'maison-aurel'
const href = (path = '', hash = '') => conceptHref(SLUG, path, hash)
const pieceHref = (p: Piece) => href(`pieces/${p.id}`)

/* ---- the bag: kept in this browser only (there is no shop behind it) ---- */

const useCart = createCart('maison-aurel-bag', (l) => {
  const p = pieceById(l.id)
  return !!p && (l.options.metal ?? 'yellow') in METALS
})

const lineMetal = (l: CartLine) => (l.options.metal ?? 'yellow') as Metal
const linePrice = (l: CartLine) => pieceById(l.id)!.price + METALS[lineMetal(l)].extra

function useBag() {
  const cart = useCart()
  return {
    ...cart,
    total: cart.lines.reduce((n, l) => n + linePrice(l) * l.qty, 0),
  }
}

type Bag = ReturnType<typeof useBag>

/**
 * Maison Aurel: a fine-jewellery website with a home page, the collection
 * (filtered by category) and a page for every piece — choose the gold and the
 * size, add it to the bag, or book an appointment to try it. The bag and the
 * appointment request work in the browser; nothing is bought or sent.
 */
function Aurel({ path }: ConceptProps) {
  const bag = useBag()
  const [bagOpen, setBagOpen] = useState(false)
  const piece = path.startsWith('pieces/') ? pieceById(path.slice(7)) : undefined

  return (
    <Shell bag={bag} bagOpen={bagOpen} setBagOpen={setBagOpen} current={path}>
      {path === '' && <Home />}
      {path === 'collection' && <Collection />}
      {path === 'checkout' && (
        <Checkout
          brand="Maison Aurel"
          refPrefix="MA"
          items={bag.lines.map((l, i) => {
            const p = pieceById(l.id)!
            return {
              key: `${i}-${l.id}`,
              name: p.name,
              detail: [METALS[lineMetal(l)].label, l.options.size].filter(Boolean).join(' · '),
              unit: linePrice(l),
              qty: l.qty,
              href: pieceHref(p),
              image: <Photo set={SET} name={p.photos[0].key} sizes="64px" focus={p.photos[0].focus} />,
            }
          })}
          delivery={[
            { id: 'insured', label: 'Insured delivery', detail: 'Signed for, in 3–5 working days', price: 0 },
            { id: 'express', label: 'Express, insured', detail: 'Next working day, ordered before 1 pm', price: 25 },
            { id: 'atelier', label: 'Collect from the atelier', detail: 'Fitted and polished by a jeweller when you collect', price: 0 },
          ]}
          payments={[
            { id: 'card', label: 'Card', detail: 'A real shop would open a secure payment page here. This demo asks for nothing.' },
            { id: 'atelier', label: 'Pay at the atelier', detail: 'Reserve the pieces and pay when you collect' },
          ]}
          extra={{ label: 'Gift wrapping and a handwritten card', detail: 'Complimentary; the receipt shows no prices' }}
          onEditCart={() => setBagOpen(true)}
          shopHref={href('collection')}
          shopLabel="Back to the collection"
          onPlaced={bag.clear}
        />
      )}
      {piece && (
        <PiecePage
          key={piece.id}
          piece={piece}
          onAdd={(item) => {
            bag.add(item.id, item.size ? { metal: item.metal, size: item.size } : { metal: item.metal })
            setBagOpen(true)
          }}
        />
      )}
    </Shell>
  )
}

/* ---- header, drawers, footer ---- */

const NAV = [
  { label: 'Rings', href: href('collection', 'rings') },
  { label: 'Necklaces', href: href('collection', 'necklaces') },
  { label: 'Earrings', href: href('collection', 'earrings') },
  { label: 'Bridal', href: href('collection', 'bridal') },
]

function Shell({ bag, bagOpen, setBagOpen, current, children }: { bag: Bag; bagOpen: boolean; setBagOpen: (b: boolean) => void; current: string; children: ReactNode }) {
  const [menu, setMenu] = useState(false)
  const [search, setSearch] = useState(false)
  return (
    <div className="a-root">
      <p className="a-announce">
        Handmade in 18k gold<span className="a-announce__more"> · Private appointments in the atelier</span>
      </p>
      <header className="a-header">
        <div className="a-wrap a-nav">
          <button type="button" className="a-menu-ic" aria-label="Open the menu" aria-haspopup="dialog" onClick={() => setMenu(true)}>
            <i />
            <i />
          </button>
          <ul className="a-nav__l">
            <li>
              <a href={href('collection')} aria-current={current === 'collection' ? 'page' : undefined}>
                Collection
              </a>
            </li>
            {NAV.map((n) => (
              <li key={n.label}>
                <a href={n.href}>{n.label}</a>
              </li>
            ))}
          </ul>
          <a className="a-brand" href={href()}>
            Maison Aurel <small>Fine jewellery</small>
          </a>
          <ul className="a-nav__r">
            <li className="a-hide-xs">
              <button type="button" onClick={() => setSearch(true)} aria-haspopup="dialog">
                Search
              </button>
            </li>
            <li className="a-hide-s">
              <a href={href('', 'appointment')}>Appointments</a>
            </li>
            <li>
              <button type="button" onClick={() => setBagOpen(true)} aria-haspopup="dialog" aria-label={`Bag, ${bag.count} ${bag.count === 1 ? 'piece' : 'pieces'}`}>
                Bag ({bag.count})
              </button>
            </li>
          </ul>
        </div>
      </header>

      <Dialog open={menu} onClose={() => setMenu(false)} label="Menu" className="a-drawer a-drawer--left">
        <div className="a-drawer__head">
          <span className="a-brand">
            Maison Aurel <small>Fine jewellery</small>
          </span>
          <CloseButton onClick={() => setMenu(false)} />
        </div>
        <ul className="a-drawer__links">
          <li>
            <a href={href('collection')}>All jewellery</a>
          </li>
          {[...NAV, { label: 'Bracelets', href: href('collection', 'bracelets') }].map((n) => (
            <li key={n.label}>
              <a href={n.href} onClick={() => setMenu(false)}>
                {n.label}
              </a>
            </li>
          ))}
          <li>
            <a href={href('', 'atelier')} onClick={() => setMenu(false)}>
              The atelier
            </a>
          </li>
          <li>
            <a href={href('', 'appointment')} onClick={() => setMenu(false)}>
              Book an appointment
            </a>
          </li>
        </ul>
        <button
          type="button"
          className="a-btn a-btn--wide"
          onClick={() => {
            setMenu(false)
            setSearch(true)
          }}
        >
          Search the collection
        </button>
      </Dialog>

      <SearchDialog open={search} onClose={() => setSearch(false)} />
      <BagDrawer bag={bag} open={bagOpen} onClose={() => setBagOpen(false)} />

      <main>{children}</main>

      <footer className="a-footer">
        <div className="a-wrap">
          <div className="a-foot">
            <div>
              <a className="a-brand a-brand--left" href={href()}>
                Maison Aurel <small>Fine jewellery</small>
              </a>
              <Newsletter />
            </div>
            <div>
              <h2 className="a-foot__h">Collection</h2>
              <ul role="list">
                <li>
                  <a href={href('collection', 'rings')}>Rings</a>
                </li>
                <li>
                  <a href={href('collection', 'necklaces')}>Necklaces</a>
                </li>
                <li>
                  <a href={href('collection', 'earrings')}>Earrings</a>
                </li>
                <li>
                  <a href={href('collection', 'bridal')}>Bridal</a>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="a-foot__h">Atelier</h2>
              <ul role="list">
                <li>
                  <a href={href('', 'atelier')}>Our process</a>
                </li>
                <li>
                  <a href={href('', 'appointment')}>Appointments</a>
                </li>
                <li>
                  <a href={href('', 'care')}>Care &amp; resizing</a>
                </li>
              </ul>
            </div>
            <div>
              <h2 className="a-foot__h">Help</h2>
              <ul role="list">
                <li>
                  <a href={href('pieces/ondine-stack', 'sizing')}>Ring sizing</a>
                </li>
                <li>
                  <a href={href('pieces/ondine-stack', 'delivery')}>Delivery &amp; returns</a>
                </li>
                <li>
                  <a href={href('', 'appointment')}>Contact a jeweller</a>
                </li>
              </ul>
            </div>
          </div>
          <div className="a-legal">
            <span>Maison Aurel is a fictional brand. Pieces, prices and materials are sample content. Photographs: Unsplash.</span>
            <span>Concept website designed and built by P. DESIGN</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Newsletter() {
  const [sent, setSent] = useState(false)
  if (sent) return <ConceptNotice className="a-news-done">Thank you. This is a concept, so no letter will be sent.</ConceptNotice>
  return (
    <form
      className="a-news"
      onSubmit={(e) => {
        e.preventDefault()
        setSent(true)
      }}
    >
      <label htmlFor="a-news">Join the atelier letter</label>
      <div>
        <input id="a-news" type="email" placeholder="Email address" required />
        <button type="submit" aria-label="Join">
          →
        </button>
      </div>
    </form>
  )
}

function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  const found = useMemo(() => {
    const t = q.trim().toLowerCase()
    if (!t) return pieces.slice(0, 4)
    return pieces.filter((p) => [p.name, p.collection, p.category, p.line, ...p.materials].join(' ').toLowerCase().includes(t))
  }, [q])
  return (
    <Dialog open={open} onClose={onClose} label="Search the collection" className="a-search">
      <div className="a-search__head">
        <label htmlFor="a-q" className="a-label">
          Search the collection
        </label>
        <CloseButton onClick={onClose} />
      </div>
      <input id="a-q" className="a-search__input" type="search" placeholder="Rings, pearls, Ondine…" value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
        }}
        autoFocus
      />
      <p className="a-search__count" aria-live="polite">
        {q.trim() ? `${found.length} ${found.length === 1 ? 'piece' : 'pieces'}` : 'Suggested'}
      </p>
      <ul className="a-search__list" role="list">
        {found.map((p) => (
          <li key={p.id}>
            <a href={pieceHref(p)}>
              <span className="a-search__ph">
                <Photo set={SET} name={p.photos[0].key} sizes="64px" focus={p.photos[0].focus} />
              </span>
              <span>
                <b>{p.name}</b>
                <small>{p.line}</small>
              </span>
              <span className="a-search__price">{euro(p.price)}</span>
            </a>
          </li>
        ))}
      </ul>
    </Dialog>
  )
}

function BagDrawer({ bag, open, onClose }: { bag: Bag; open: boolean; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      label="Your bag"
      className="a-drawer a-drawer--right"
    >
      <div className="a-drawer__head">
        <h2 className="a-serif a-bag__title">Your bag</h2>
        <CloseButton onClick={onClose} />
      </div>
      {bag.lines.length === 0 ? (
        <div className="a-bag__empty">
          <p>Your bag is empty.</p>
          <a className="a-btn" href={href('collection')}>
            Explore the collection
          </a>
        </div>
      ) : (
        <>
          <ul className="a-bag" role="list">
            {bag.lines.map((it, i) => {
              const p = pieceById(it.id)!
              return (
                <li key={`${it.id}-${it.options.metal}-${it.options.size}`}>
                  <a className="a-bag__ph" href={pieceHref(p)} tabIndex={-1} aria-hidden="true">
                    <Photo set={SET} name={p.photos[0].key} sizes="88px" focus={p.photos[0].focus} />
                  </a>
                  <div>
                    <a href={pieceHref(p)} className="a-bag__name">
                      {p.name}
                    </a>
                    <small>
                      {METALS[lineMetal(it)].label}
                      {it.options.size ? ` · ${it.options.size}` : ''}
                    </small>
                    <div className="a-qty">
                      <button type="button" onClick={() => bag.setQty(i, it.qty - 1)} aria-label={`One fewer ${p.name}`}>
                        −
                      </button>
                      <span aria-label="Quantity">{it.qty}</span>
                      <button type="button" onClick={() => bag.setQty(i, it.qty + 1)} aria-label={`One more ${p.name}`}>
                        +
                      </button>
                      <button type="button" className="a-qty__rm" onClick={() => bag.setQty(i, 0)}>
                        Remove
                      </button>
                    </div>
                  </div>
                  <span className="a-bag__price">{euro(linePrice(it) * it.qty)}</span>
                </li>
              )
            })}
          </ul>
          <div className="a-bag__foot">
            <p>
              <span>Subtotal</span>
              <b>{euro(bag.total)}</b>
            </p>
            <p className="a-bag__note">Complimentary delivery, insured and signed for. Engraving included.</p>
            <a className="a-btn a-btn--solid a-btn--wide" href={href('checkout')}>
              Checkout
            </a>
            <p className="a-bag__note">A demo checkout: no payment is taken and nothing is ordered. The bag is kept only in this browser.</p>
            <a className="a-btn a-btn--wide" href={href('', 'appointment')} onClick={onClose}>
              Try them in the atelier
            </a>
          </div>
        </>
      )}
    </Dialog>
  )
}

/* ---- pages ---- */

/** The Stella solitaire in real-time 3D: drag to turn it; it follows the chosen gold. */
function RingStage({ metal, label }: { metal: Metal; label: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const { state } = useSolitaire(canvas, metal)
  return (
    <div className="a-3d" data-state={state}>
      {/* a still of the same model (npm run render:stella) until the live one is drawn, and in its place where WebGL is missing */}
      <span className="a-3d__still" aria-hidden="true">
        <Photo set={SET} name="stella-render" sizes="(max-width: 1100px) 92vw, 52vw" />
      </span>
      <canvas ref={canvas} role="img" aria-label={label} />
      {state === 'failed' ? (
        <p className="a-3d__note">The 3D view needs WebGL, which this browser has turned off.</p>
      ) : (
        <p className="a-3d__hint" aria-hidden="true">
          Drag to turn
        </p>
      )}
    </div>
  )
}

function MetalSwatches({ piece, metal, onChange }: { piece: Piece; metal: Metal; onChange: (m: Metal) => void }) {
  return (
    <div className="a-sw" role="radiogroup" aria-label="Gold">
      {piece.metals.map((m) => (
        <button key={m} type="button" role="radio" aria-checked={metal === m} aria-label={METALS[m].label} className={metal === m ? 'is-on' : ''} style={{ background: METALS[m].swatch }} onClick={() => onChange(m)} />
      ))}
    </div>
  )
}

/** On the home page: the diamond solitaire, turning in the light, with its gold and price. */
function Solitaire() {
  const piece = pieceById('stella-solitaire')!
  const [metal, setMetal] = useState<Metal>('rose')
  return (
    <section className="a-sec a-feature" aria-labelledby="a-feature-title">
      <div className="a-wrap a-feature__in">
        <RingStage metal={metal} label="The Stella solitaire in real-time 3D: a round brilliant diamond on four claws, turning slowly." />
        <div className="a-feature__copy">
          <p className="a-label">New · Bridal</p>
          <h2 id="a-feature-title" className="a-serif">
            One brilliant, <em>in every light.</em>
          </h2>
          <p>{piece.description} Turn it to watch the light move through the stone.</p>
          <div className="a-opt">
            <p className="a-label">
              <span>Gold · {METALS[metal].label.replace('18k ', '')}</span>
              <span>{euro(piece.price + METALS[metal].extra)}</span>
            </p>
            <MetalSwatches piece={piece} metal={metal} onChange={setMetal} />
          </div>
          <div className="a-actions">
            <a className="a-btn a-btn--solid" href={pieceHref(piece)}>
              Choose your size
            </a>
            <a className="a-btn" href="#appointment">
              Try it in the atelier
            </a>
          </div>
          <p className="a-feature__fine">{piece.materials[1]} · Sample piece and price</p>
        </div>
      </div>
    </section>
  )
}

function ProductCard({ p, sizes = '(max-width: 700px) 46vw, 23vw' }: { p: Piece; sizes?: string }) {
  return (
    <article className="a-product">
      <a href={pieceHref(p)} className="a-product__link">
        <span className="a-product__ph">
          {p.tag && <span className="a-tag">{p.tag}</span>}
          <Photo set={SET} name={p.photos[0].key} alt={p.photos[0].alt} sizes={sizes} focus={p.photos[0].focus} />
        </span>
        <h3>
          {p.name} <span>{euro(p.price)}</span>
        </h3>
        <p>{p.line}</p>
      </a>
    </article>
  )
}

function Home() {
  const featured = pieceById('ondine-stack')!
  return (
    <>
      <section className="a-hero" aria-labelledby="a-hero-title">
        <div className="a-hero__copy">
          <p className="a-label">The Ondine collection</p>
          <h1 id="a-hero-title" className="a-serif">
            Gold, shaped <em>by hand.</em>
          </h1>
          <p>Rings, chains and heirlooms in 18k gold — made to be worn every day and kept for generations.</p>
          <div className="a-actions">
            <a className="a-btn a-btn--solid" href={pieceHref(featured)}>
              Discover Ondine
            </a>
            <a className="a-btn" href="#appointment">
              Book an appointment
            </a>
          </div>
          <div className="a-hero__meta">
            <div>
              <b>18k</b>recycled gold
            </div>
            <div>
              <b>By hand</b>in one workshop
            </div>
            <div>
              <b>For life</b>free resizing &amp; polishing
            </div>
          </div>
        </div>
        <a className="a-hero__art" href={pieceHref(featured)}>
          <Photo set={SET} name="rings-mirror" alt="" sizes="(max-width: 700px) 100vw, 54vw" focus="50% 55%" priority />
          <span className="a-hero__caption">
            <b>Ondine stack</b> Three rings · 18k gold · {euro(featured.price)}
          </span>
        </a>
      </section>

      <section className="a-sec" aria-labelledby="a-cats-title">
        <div className="a-wrap">
          <div className="a-shead">
            <div>
              <p className="a-label">Shop by piece</p>
              <h2 id="a-cats-title" className="a-serif">
                The <em>collection</em>
              </h2>
            </div>
            <a className="a-ulink" href={href('collection')}>
              View all {pieces.length} pieces
            </a>
          </div>
          <ul className="a-cats" role="list">
            {CATEGORIES.filter((c) => c.photo).map((c) => (
              <li key={c.id}>
                <a className="a-cat" href={href('collection', c.id)}>
                  <Photo set={SET} name={c.photo!} sizes="(max-width: 700px) 46vw, 30vw" focus={c.focus} />
                  <p>
                    <b>{c.label}</b>
                    <span>
                      {inCategory(c.id).length} {inCategory(c.id).length === 1 ? 'piece' : 'pieces'} →
                    </span>
                  </p>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <Solitaire />

      <section className="a-sec a-sec--flush" aria-labelledby="a-worn-title">
        <div className="a-wrap a-worn">
          <div className="a-worn__a">
            <Photo set={SET} name="layers-worn" alt="Fine gold chains layered over a white shirt." sizes="(max-width: 700px) 46vw, 30vw" focus="50% 40%" />
          </div>
          <div className="a-worn__b">
            <Photo set={SET} name="chain-worn" alt="The Riva herringbone chain, worn at the collarbone." sizes="(max-width: 700px) 46vw, 30vw" focus="50% 45%" />
          </div>
          <blockquote>
            <p className="a-label">Worn</p>
            <h2 id="a-worn-title" className="a-serif">
              Made for every day, kept for a lifetime.
            </h2>
            <p>Fine chains layer without tangling, clasps open with one hand, and every piece can be resized or polished in the atelier — always.</p>
            <a className="a-ulink" href={href('collection', 'necklaces')}>
              Shop necklaces
            </a>
          </blockquote>
        </div>
      </section>

      <section className="a-sec a-atelier" id="atelier" aria-labelledby="a-atelier-title">
        <div className="a-wrap">
          <div className="a-atelier__art">
            <div className="a-atelier__a">
              <Photo set={SET} name="bench" alt="A jeweller at the bench, setting a ring." sizes="(max-width: 700px) 54vw, 26vw" focus="45% 40%" />
            </div>
            <div className="a-atelier__b">
              <Photo set={SET} name="saw" alt="A jeweller working on a piece at a workshop bench." sizes="(max-width: 700px) 40vw, 20vw" />
            </div>
          </div>
          <div>
            <p className="a-label">The atelier</p>
            <h2 id="a-atelier-title" className="a-serif">
              Every piece passes <em>through four hands.</em>
            </h2>
            <p>A small workshop and a slow process. Visit by appointment to see pieces at the bench before they are finished.</p>
            <ol className="a-steps">
              {[
                ['i', 'Drawing', 'Every piece starts on paper.'],
                ['ii', 'Casting', 'Wax carved, then cast in gold.'],
                ['iii', 'Setting', 'Stones and pearls, set by eye.'],
                ['iv', 'Polishing', 'A soft, lasting finish.'],
              ].map(([n, t, d]) => (
                <li key={n}>
                  <b>{n}</b>
                  <span>
                    {t}
                    <small>{d}</small>
                  </span>
                </li>
              ))}
            </ol>
            <p className="a-care" id="care">
              <b>Care for life.</b> Resizing, polishing and re-stringing are free for as long as you own the piece.
            </p>
          </div>
        </div>
      </section>

      <section className="a-sec" aria-labelledby="a-new-title">
        <div className="a-wrap">
          <div className="a-shead">
            <div>
              <p className="a-label">Just finished</p>
              <h2 id="a-new-title" className="a-serif">
                New in the <em>atelier</em>
              </h2>
            </div>
            <a className="a-ulink" href={href('collection')}>
              View all pieces
            </a>
          </div>
          <div className="a-products">
            {['marea-bracelet', 'luna-pendant', 'riva-chain', 'tessera-bar'].map((id) => (
              <ProductCard key={id} p={pieceById(id)!} />
            ))}
          </div>
        </div>
      </section>

      <Appointment />
    </>
  )
}

const WAYS = [
  { id: 'visit', title: 'Visit the atelier', line: '60 minutes · try any piece', when: 'Tue – Sat' },
  { id: 'bespoke', title: 'Bespoke consultation', line: '90 minutes · sketches and stones', when: 'By request' },
  { id: 'video', title: 'Video appointment', line: '30 minutes · from anywhere', when: 'Daily' },
]
const SLOTS = ['Tue 17 Nov · 11:00', 'Wed 18 Nov · 14:30', 'Thu 19 Nov · 10:00', 'Fri 20 Nov · 16:00', 'Sat 21 Nov · 12:00']

function Appointment() {
  const [way, setWay] = useState('visit')
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [slot, setSlot] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const chosen = WAYS.find((w) => w.id === way)!
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Please add your name and a valid email address.')
    setError('')
    setStep(3)
  }
  return (
    <section className="a-appt" id="appointment" aria-labelledby="a-appt-title">
      <div className="a-appt__ph">
        <Photo set={SET} name="ring-black" alt="The Noctis solitaire on a black surface." sizes="(max-width: 700px) 100vw, 50vw" />
      </div>
      <div className="a-appt__body" aria-live="polite">
        <p className="a-label">Private appointments</p>
        <h2 id="a-appt-title" className="a-serif">
          See it in <em>the light.</em>
        </h2>
        {step === 1 && (
          <>
            <p className="a-lead">Try pieces in the atelier, plan a bespoke ring, or speak to a jeweller by video. Appointments are free and unhurried.</p>
            <fieldset className="a-ways">
              <legend className="a-sr">Kind of appointment</legend>
              {WAYS.map((w) => (
                <label key={w.id} className={way === w.id ? 'is-on' : ''}>
                  <input type="radio" name="a-way" checked={way === w.id} onChange={() => setWay(w.id)} />
                  <span>
                    <b>{w.title}</b>
                    <small>{w.line}</small>
                  </span>
                  <em>{w.when}</em>
                </label>
              ))}
            </fieldset>
            <p className="a-label a-slots__l">Next times — sample calendar</p>
            <div className="a-slots" role="group" aria-label="Time">
              {SLOTS.map((s) => (
                <button key={s} type="button" aria-pressed={slot === s} className={slot === s ? 'is-on' : ''} onClick={() => setSlot(s)}>
                  {s}
                </button>
              ))}
            </div>
            <button type="button" className="a-btn a-btn--solid" disabled={!slot} onClick={() => setStep(2)}>
              {slot ? `Continue — ${slot}` : 'Choose a time'}
            </button>
          </>
        )}
        {step === 2 && (
          <form className="a-form" onSubmit={submit} noValidate>
            <p className="a-lead">
              {chosen.title}, {slot}.{' '}
              <button type="button" className="a-textbtn" onClick={() => setStep(1)}>
                Change
              </button>
            </p>
            <label>
              <span>Name</span>
              <input autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              <span>Email</span>
              <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            {error && (
              <p className="a-error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="a-btn a-btn--solid">
              Request the appointment
            </button>
            <ConceptNotice>Concept website: the request is not sent anywhere.</ConceptNotice>
          </form>
        )}
        {step === 3 && (
          <div className="a-sent">
            <p className="a-lead">
              Thank you, {name.split(' ')[0]}. In a live site, a jeweller would now confirm your {chosen.title.toLowerCase()} on {slot}.
            </p>
            <ConceptNotice>This is a concept: no appointment was requested and your details were not sent or stored.</ConceptNotice>
            <button
              type="button"
              className="a-btn"
              onClick={() => {
                setStep(1)
                setSlot('')
              }}
            >
              Choose another time
            </button>
          </div>
        )}
      </div>
    </section>
  )
}

type Sort = 'featured' | 'low' | 'high'

function Collection() {
  const [cat, setCat] = useState('all')
  const [sort, setSort] = useState<Sort>('featured')
  useEffect(() => {
    const read = () => {
      const h = location.hash.slice(1)
      setCat(CATEGORIES.some((c) => c.id === h) ? h : 'all')
    }
    read()
    window.addEventListener('hashchange', read)
    return () => window.removeEventListener('hashchange', read)
  }, [])
  const choose = (id: string) => {
    setCat(id)
    history.replaceState(null, '', id === 'all' ? location.pathname : `#${id}`)
  }
  const list = inCategory(cat).slice()
  if (sort === 'low') list.sort((a, b) => a.price - b.price)
  if (sort === 'high') list.sort((a, b) => b.price - a.price)
  const label = CATEGORIES.find((c) => c.id === cat)!.label

  return (
    <section className="a-sec a-collection" aria-labelledby="a-col-title">
      <div className="a-wrap">
        <nav className="a-crumbs" aria-label="Breadcrumb">
          <a href={href()}>Maison Aurel</a> <span aria-hidden="true">/</span> <span aria-current="page">{label}</span>
        </nav>
        <h1 id="a-col-title" className="a-serif a-col__title">
          {cat === 'all' ? (
            <>
              The <em>collection</em>
            </>
          ) : (
            label
          )}
        </h1>
        <div className="a-filters">
          <div className="a-chips" role="group" aria-label="Category">
            {CATEGORIES.map((c) => (
              <button key={c.id} type="button" aria-pressed={cat === c.id} className={cat === c.id ? 'is-on' : ''} onClick={() => choose(c.id)}>
                {c.label} <small>{inCategory(c.id).length}</small>
              </button>
            ))}
          </div>
          <label className="a-sort">
            <span>Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="featured">Featured</option>
              <option value="low">Price, low to high</option>
              <option value="high">Price, high to low</option>
            </select>
          </label>
        </div>
        <p className="a-col__count" aria-live="polite">
          {list.length} {list.length === 1 ? 'piece' : 'pieces'}
        </p>
        <div className="a-products a-products--grid">
          {list.map((p) => (
            <ProductCard key={p.id} p={p} sizes="(max-width: 700px) 46vw, 30vw" />
          ))}
        </div>
      </div>
    </section>
  )
}

function PiecePage({ piece, onAdd }: { piece: Piece; onAdd: (item: { id: string; metal: Metal; size?: string }) => void }) {
  const [view, setView] = useState(0)
  const [metal, setMetal] = useState<Metal>(piece.metals[0])
  const [size, setSize] = useState('')
  const [warn, setWarn] = useState(false)
  // a piece with a model has one more view after its photos: the ring in real-time 3D
  const in3d = !!piece.model && view === piece.photos.length
  const photo = piece.photos[Math.min(view, piece.photos.length - 1)]
  const views = piece.photos.length + (piece.model ? 1 : 0)
  const chooseMetal = (m: Metal) => {
    setMetal(m)
    if (piece.model) setView(piece.photos.length) // show the chosen gold on the turning ring
  }
  const price = piece.price + METALS[metal].extra
  const related = pieces.filter((p) => p.id !== piece.id && (p.category === piece.category || p.collection === piece.collection)).slice(0, 4)
  const more = related.length < 4 ? [...related, ...pieces.filter((p) => p.id !== piece.id && !related.includes(p))].slice(0, 4) : related
  const cat = CATEGORIES.find((c) => c.id === piece.category)!

  const add = () => {
    if (piece.sizes && !size) return setWarn(true)
    setWarn(false)
    onAdd({ id: piece.id, metal, size: size || undefined })
  }

  return (
    <>
      <section className="a-sec a-pdp-sec" aria-labelledby="a-pdp-title">
        <div className="a-wrap">
          <nav className="a-crumbs" aria-label="Breadcrumb">
            <a href={href()}>Maison Aurel</a> <span aria-hidden="true">/</span> <a href={href('collection', cat.id)}>{cat.label}</a> <span aria-hidden="true">/</span>{' '}
            <span aria-current="page">{piece.name}</span>
          </nav>
          <div className={`a-pdp${views > 1 ? '' : ' a-pdp--single'}`}>
            {views > 1 && (
              <div className="a-pdp__thumbs" role="group" aria-label="Views">
                {piece.photos.map((ph, i) => (
                  <button key={ph.key} type="button" aria-pressed={view === i} className={view === i ? 'is-on' : ''} onClick={() => setView(i)} aria-label={`View ${i + 1}: ${ph.alt}`}>
                    <Photo set={SET} name={ph.key} sizes="96px" focus={ph.focus} />
                  </button>
                ))}
                {piece.model && (
                  <button type="button" aria-pressed={in3d} className={`a-pdp__3d${in3d ? ' is-on' : ''}`} onClick={() => setView(piece.photos.length)} aria-label="View in 3D: turn the ring yourself">
                    <span aria-hidden="true">3D</span>
                  </button>
                )}
              </div>
            )}
            <div className="a-pdp__main">
              {in3d ? (
                <RingStage metal={metal} label={`The ${piece.name} in real-time 3D, in ${METALS[metal].label}. Drag to turn it.`} />
              ) : (
                <>
                  <Photo key={photo.key} set={SET} name={photo.key} alt={photo.alt} sizes="(max-width: 700px) 100vw, 46vw" focus={photo.focus} priority />
                  {piece.model && (
                    <button type="button" className="a-pdp__try3d" onClick={() => setView(piece.photos.length)}>
                      View in 3D
                    </button>
                  )}
                </>
              )}
            </div>
            <div className="a-pdp__info">
              <p className="a-pdp__col">
                {cat.label} · {piece.collection}
              </p>
              <h1 id="a-pdp-title" className="a-serif">
                {piece.name}
              </h1>
              <p className="a-pdp__price">{euro(price)}</p>
              <p className="a-pdp__desc">{piece.description}</p>

              <div className="a-opt">
                <p className="a-label">
                  <span>Gold · {METALS[metal].label.replace('18k ', '')}</span>
                  {METALS[metal].extra > 0 && <span>+{euro(METALS[metal].extra)}</span>}
                </p>
                <MetalSwatches piece={piece} metal={metal} onChange={chooseMetal} />
              </div>

              {piece.sizes && (
                <div className="a-opt" id="sizing">
                  <p className="a-label">
                    <span>
                      {piece.sizes.label}
                      {size ? ` · ${size}` : ''}
                    </span>
                    {piece.category === 'rings' && <span>Free resizing for life</span>}
                  </p>
                  <div className="a-sizes" role="radiogroup" aria-label={piece.sizes.label}>
                    {piece.sizes.options.map((o) => {
                      const off = piece.sizes!.unavailable?.includes(o)
                      return (
                        <button key={o} type="button" role="radio" aria-checked={size === o} disabled={off} className={size === o ? 'is-on' : ''} onClick={() => setSize(o)} aria-label={`${o}${off ? ', made to order only' : ''}`}>
                          {o}
                        </button>
                      )
                    })}
                  </div>
                  {warn && (
                    <p className="a-error" role="alert">
                      Choose a {piece.sizes.label.toLowerCase()} first.
                    </p>
                  )}
                </div>
              )}

              <div className="a-buy">
                <button type="button" className="a-btn a-btn--solid" onClick={add}>
                  Add to bag — {euro(price)}
                </button>
                <a className="a-btn" href={href('', 'appointment')}>
                  Try it in the atelier
                </a>
              </div>
              <div className="a-perks">
                <div>{piece.making}</div>
                <div>Engraving included</div>
                <div>Free resizing &amp; polishing</div>
              </div>
              <div className="a-acc">
                <details open>
                  <summary>Materials</summary>
                  <ul role="list">
                    {piece.materials.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                </details>
                <details>
                  <summary>Care</summary>
                  <p>Store each piece in its pouch, away from perfume and chlorine. Polish with the cloth provided; bring it to the atelier once a year for a free clean and check.</p>
                </details>
                <details id="delivery">
                  <summary>Delivery &amp; returns</summary>
                  <p>Complimentary insured delivery, signed for. Returns within 30 days for pieces that are not engraved or made to order.</p>
                </details>
              </div>
              <ConceptNotice className="a-pdp__notice">Sample piece and price — Maison Aurel is a fictional brand.</ConceptNotice>
            </div>
          </div>
        </div>
      </section>

      <section className="a-sec a-sec--flush" aria-labelledby="a-more-title">
        <div className="a-wrap">
          <div className="a-shead">
            <h2 id="a-more-title" className="a-serif">
              You may <em>also like</em>
            </h2>
            <a className="a-ulink" href={href('collection')}>
              The full collection
            </a>
          </div>
          <div className="a-products">
            {more.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

export const concept: ConceptModule = {
  Site: Aurel,
  paths: ['', 'collection', 'checkout', ...pieces.map((p) => `pieces/${p.id}`)],
  title: (path) => (path === 'collection' ? 'The collection' : path === 'checkout' ? 'Checkout' : pieceById(path.replace('pieces/', ''))?.name),
}

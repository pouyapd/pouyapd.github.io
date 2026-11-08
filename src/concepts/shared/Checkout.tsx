import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { euro } from './links'
import './checkout.css'

/**
 * The demo checkout shared by the shop concepts (Maison Aurel, Lune Atelier):
 * contact and address → delivery → review and a demo payment choice → an
 * honest confirmation. It validates like a real checkout, but it collects no
 * card details, sends nothing and stores nothing: "placing" the order only
 * empties the cart in this browser. Each concept styles it through the
 * --co-* custom properties on its own root (see checkout.css).
 */
export interface CheckoutItem {
  key: string
  name: string
  detail?: string
  unit: number
  qty: number
  image?: ReactNode
  href?: string
}

export interface CheckoutChoice {
  id: string
  label: string
  detail: string
  price?: number
}

interface Props {
  brand: string
  /** Prefix of the demo order reference, e.g. 'MA'. */
  refPrefix: string
  items: CheckoutItem[]
  delivery: CheckoutChoice[]
  payments: CheckoutChoice[]
  /** An optional extra, e.g. gift wrapping. */
  extra?: { label: string; detail: string }
  /** Opens the concept's bag (a drawer) to change what is in it. */
  onEditCart: () => void
  shopHref: string
  shopLabel: string
  onPlaced: () => void
}

const STEPS = ['Details', 'Delivery', 'Review & pay'] as const
const COUNTRIES = ['Austria', 'Belgium', 'France', 'Germany', 'Ireland', 'Italy', 'Netherlands', 'Portugal', 'Spain', 'United Kingdom', 'Other']

type Fields = Record<'email' | 'first' | 'last' | 'address' | 'city' | 'postcode' | 'country' | 'phone', string>
const EMPTY: Fields = { email: '', first: '', last: '', address: '', city: '', postcode: '', country: '', phone: '' }

function check(f: Fields) {
  const e: Partial<Record<keyof Fields, string>> = {}
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Enter an email address, like name@example.com.'
  if (!f.first.trim()) e.first = 'Enter your first name.'
  if (!f.last.trim()) e.last = 'Enter your last name.'
  if (f.address.trim().length < 4) e.address = 'Enter the street and number.'
  if (!f.city.trim()) e.city = 'Enter the town or city.'
  if (f.postcode.trim().length < 3) e.postcode = 'Enter the postcode.'
  if (!f.country) e.country = 'Choose a country.'
  return e
}

export function Checkout({ brand, refPrefix, items, delivery, payments, extra, onEditCart, shopHref, shopLabel, onPlaced }: Props) {
  const [step, setStep] = useState(0)
  const [fields, setFields] = useState<Fields>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({})
  const [ship, setShip] = useState(delivery[0].id)
  const [pay, setPay] = useState(payments[0].id)
  const [withExtra, setWithExtra] = useState(false)
  const [placed, setPlaced] = useState<null | { ref: string; items: CheckoutItem[]; total: number; ship: CheckoutChoice }>(null)
  const top = useRef<HTMLHeadingElement>(null)

  const shipping = delivery.find((d) => d.id === ship)!
  const subtotal = items.reduce((n, i) => n + i.unit * i.qty, 0)
  const total = subtotal + (shipping.price ?? 0)

  const go = (n: number) => {
    setStep(n)
    requestAnimationFrame(() => top.current?.focus())
  }

  if (placed) {
    return (
      <div className="cx-co cx-co--done">
        <h1 className="cx-co__title" tabIndex={-1} ref={top}>
          Thank you, {fields.first.trim()}.
        </h1>
        <p className="cx-co__ref">
          Demo order <b>{placed.ref}</b>
        </p>
        <p className="cx-co__honest" role="note">
          <span aria-hidden="true" className="cx-co__dot" />
          This is a concept website. Nothing has been charged and no order was placed. Your details were used only on this page and were not sent or saved anywhere.
        </p>
        <div className="cx-co__receipt">
          <h2 className="cx-co__h">What a real {brand} order would confirm</h2>
          <ul role="list" className="cx-co__lines">
            {placed.items.map((i) => (
              <li key={i.key}>
                <span>
                  {i.qty} × {i.name}
                  {i.detail && <small>{i.detail}</small>}
                </span>
                <span>{euro(i.unit * i.qty)}</span>
              </li>
            ))}
            <li>
              <span>{placed.ship.label}</span>
              <span>{placed.ship.price ? euro(placed.ship.price) : 'Free'}</span>
            </li>
          </ul>
          <p className="cx-co__total">
            <span>Total</span>
            <b>{euro(placed.total)}</b>
          </p>
          <p className="cx-co__muted">
            To {fields.first} {fields.last}, {fields.address}, {fields.postcode} {fields.city}, {fields.country}. A confirmation would go to {fields.email}.
          </p>
        </div>
        <a className="cx-co__btn" href={shopHref}>
          {shopLabel}
        </a>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="cx-co cx-co--empty">
        <h1 className="cx-co__title">Your bag is empty</h1>
        <p className="cx-co__muted">Add something first; the checkout then walks through details, delivery and a demo payment.</p>
        <a className="cx-co__btn" href={shopHref}>
          {shopLabel}
        </a>
      </div>
    )
  }

  const set = (k: keyof Fields) => (e: { target: { value: string } }) => {
    setFields((f) => ({ ...f, [k]: e.target.value }))
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }))
  }

  const submitDetails = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const found = check(fields)
    setErrors(found)
    const first = Object.keys(found)[0]
    if (first) {
      e.currentTarget.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }
    go(1)
  }

  const field = (k: keyof Fields, label: string, props: Record<string, unknown> = {}, wide = false) => (
    <div className={`cx-co__field${wide ? ' cx-co__field--wide' : ''}`}>
      <label htmlFor={`co-${k}`}>{label}</label>
      <input
        id={`co-${k}`}
        name={k}
        value={fields[k]}
        onChange={set(k)}
        aria-invalid={errors[k] ? true : undefined}
        aria-describedby={errors[k] ? `co-${k}-err` : undefined}
        {...props}
      />
      {errors[k] && (
        <span className="cx-co__err" id={`co-${k}-err`}>
          {errors[k]}
        </span>
      )}
    </div>
  )

  return (
    <div className="cx-co">
      <div className="cx-co__main">
        <button type="button" className="cx-co__back" onClick={onEditCart}>
          ← Back to the bag
        </button>
        <h1 className="cx-co__title" tabIndex={-1} ref={top}>
          Checkout
        </h1>
        <p className="cx-co__honest" role="note">
          <span aria-hidden="true" className="cx-co__dot" />
          Demo checkout: it works like the real thing, but no payment is taken, no card details are asked for and nothing is sent.
        </p>
        <ol className="cx-co__steps" aria-label="Checkout steps">
          {STEPS.map((s, n) => (
            <li key={s} aria-current={n === step ? 'step' : undefined} data-done={n < step || undefined}>
              {n < step ? (
                <button type="button" onClick={() => go(n)}>
                  <span>{n + 1}</span> {s}
                </button>
              ) : (
                <span>
                  <span>{n + 1}</span> {s}
                </span>
              )}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <form className="cx-co__form" noValidate onSubmit={submitDetails}>
            <fieldset>
              <legend className="cx-co__h">Contact</legend>
              {field('email', 'Email', { type: 'email', autoComplete: 'email', inputMode: 'email' }, true)}
            </fieldset>
            <fieldset>
              <legend className="cx-co__h">Delivery address</legend>
              <div className="cx-co__grid">
                {field('first', 'First name', { autoComplete: 'given-name' })}
                {field('last', 'Last name', { autoComplete: 'family-name' })}
                {field('address', 'Street and number', { autoComplete: 'street-address' }, true)}
                {field('postcode', 'Postcode', { autoComplete: 'postal-code' })}
                {field('city', 'Town or city', { autoComplete: 'address-level2' })}
                <div className="cx-co__field">
                  <label htmlFor="co-country">Country</label>
                  <select
                    id="co-country"
                    name="country"
                    value={fields.country}
                    onChange={set('country')}
                    aria-invalid={errors.country ? true : undefined}
                    aria-describedby={errors.country ? 'co-country-err' : undefined}
                  >
                    <option value="">Choose…</option>
                    {COUNTRIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  {errors.country && (
                    <span className="cx-co__err" id="co-country-err">
                      {errors.country}
                    </span>
                  )}
                </div>
                {field('phone', 'Phone (optional)', { type: 'tel', autoComplete: 'tel' })}
              </div>
            </fieldset>
            <button type="submit" className="cx-co__btn">
              Continue to delivery
            </button>
          </form>
        )}

        {step === 1 && (
          <form
            className="cx-co__form"
            onSubmit={(e) => {
              e.preventDefault()
              go(2)
            }}
          >
            <fieldset>
              <legend className="cx-co__h">Delivery</legend>
              <div className="cx-co__choices">
                {delivery.map((d) => (
                  <label key={d.id} className="cx-co__choice">
                    <input type="radio" name="ship" value={d.id} checked={ship === d.id} onChange={() => setShip(d.id)} />
                    <span>
                      <b>{d.label}</b>
                      <small>{d.detail}</small>
                    </span>
                    <span className="cx-co__price">{d.price ? euro(d.price) : 'Free'}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {extra && (
              <label className="cx-co__check">
                <input type="checkbox" checked={withExtra} onChange={(e) => setWithExtra(e.target.checked)} />
                <span>
                  <b>{extra.label}</b>
                  <small>{extra.detail}</small>
                </span>
              </label>
            )}
            <p className="cx-co__muted">
              Delivering to {fields.first} {fields.last}, {fields.address}, {fields.postcode} {fields.city}, {fields.country}.{' '}
              <button type="button" className="cx-co__link" onClick={() => go(0)}>
                Change
              </button>
            </p>
            <button type="submit" className="cx-co__btn">
              Continue to review
            </button>
          </form>
        )}

        {step === 2 && (
          <form
            className="cx-co__form"
            onSubmit={(e) => {
              e.preventDefault()
              const ref = `${refPrefix}-${String(Math.floor(1000 + Math.random() * 9000))}`
              setPlaced({ ref, items, total, ship: shipping })
              onPlaced()
              requestAnimationFrame(() => top.current?.focus())
              scrollTo({ top: 0 })
            }}
          >
            <fieldset>
              <legend className="cx-co__h">Payment</legend>
              <div className="cx-co__choices">
                {payments.map((p) => (
                  <label key={p.id} className="cx-co__choice">
                    <input type="radio" name="pay" value={p.id} checked={pay === p.id} onChange={() => setPay(p.id)} />
                    <span>
                      <b>{p.label}</b>
                      <small>{p.detail}</small>
                    </span>
                  </label>
                ))}
              </div>
              <p className="cx-co__muted">A real shop would hand over to a secure payment provider here. This concept asks for no card details.</p>
            </fieldset>
            <dl className="cx-co__review">
              <div>
                <dt>Contact</dt>
                <dd>{fields.email}</dd>
              </div>
              <div>
                <dt>Deliver to</dt>
                <dd>
                  {fields.first} {fields.last}, {fields.address}, {fields.postcode} {fields.city}, {fields.country}
                </dd>
              </div>
              <div>
                <dt>Delivery</dt>
                <dd>
                  {shipping.label}
                  {withExtra && extra ? ` · ${extra.label}` : ''}
                </dd>
              </div>
            </dl>
            <button type="submit" className="cx-co__btn">
              Place demo order · {euro(total)}
            </button>
            <p className="cx-co__muted">Nothing is charged. The order is not real and your bag simply empties.</p>
          </form>
        )}
      </div>

      <aside className="cx-co__summary" aria-label="Order summary">
        <details open>
          <summary>
            <span>Order summary</span>
            <b>{euro(total)}</b>
          </summary>
          <ul role="list" className="cx-co__items">
            {items.map((i) => (
              <li key={i.key}>
                {i.image && <span className="cx-co__thumb">{i.image}</span>}
                <span className="cx-co__item">
                  {i.href ? <a href={i.href}>{i.name}</a> : i.name}
                  {i.detail && <small>{i.detail}</small>}
                  <small>Qty {i.qty}</small>
                </span>
                <span>{euro(i.unit * i.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="cx-co__sums">
            <div>
              <dt>Subtotal</dt>
              <dd>{euro(subtotal)}</dd>
            </div>
            <div>
              <dt>{step >= 1 ? shipping.label : 'Delivery'}</dt>
              <dd>{step >= 1 ? (shipping.price ? euro(shipping.price) : 'Free') : 'Next step'}</dd>
            </div>
            <div className="cx-co__grand">
              <dt>Total</dt>
              <dd>{euro(total)}</dd>
            </div>
          </dl>
          <button type="button" className="cx-co__link" onClick={onEditCart}>
            Edit the bag
          </button>
        </details>
      </aside>
    </div>
  )
}

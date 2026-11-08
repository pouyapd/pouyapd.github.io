import { useEffect, useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { vars } from '../../app/style'
import { BrowserFrame } from '../ui/DeviceFrames'
import './atlas-app.css'

/**
 * Digital products & web applications: Atlas Ledger, a concept analytics app.
 * It works: switch views, change the range, explore the chart (pointer or
 * arrow keys), filter invoices and mark one as paid. Every figure is generated
 * sample data, labelled as such in the app and in the caption.
 */

type View = 'overview' | 'invoices' | 'customers'
type Status = 'paid' | 'pending' | 'overdue'
type Filter = 'all' | Status

// --- deterministic sample data ---------------------------------------------
const WEEKS = 52
const SERIES = Array.from({ length: WEEKS }, (_, i) => {
  const trend = 30 + i * 0.55
  const season = 6 * Math.sin(i / 4.2) + 3 * Math.sin(i / 1.7 + 1)
  const noise = ((Math.sin(i * 12.9898) * 43758.5453) % 1) * 4
  return Math.round((trend + season + noise) * 10) / 10 // thousands
})
const RANGES = [
  { weeks: 4, label: '4 weeks' },
  { weeks: 12, label: '12 weeks' },
  { weeks: 26, label: '26 weeks' },
] as const
const INVOICES: { id: number; customer: string; amount: number; status: Status; due: string }[] = [
  { id: 1052, customer: 'Orchard & Co.', amount: 2140, status: 'paid', due: '12 Oct' },
  { id: 1051, customer: 'Blue Harbour', amount: 860.5, status: 'pending', due: '24 Oct' },
  { id: 1050, customer: 'Tala Ceramics', amount: 1312, status: 'overdue', due: '03 Oct' },
  { id: 1049, customer: 'Northlight Studio', amount: 3480, status: 'paid', due: '30 Sep' },
  { id: 1048, customer: 'Kiln & Clay', amount: 540, status: 'pending', due: '28 Oct' },
  { id: 1047, customer: 'Fern Botanics', amount: 1975.4, status: 'paid', due: '21 Sep' },
  { id: 1046, customer: 'Atelier Rue', amount: 720, status: 'overdue', due: '19 Sep' },
]
const CUSTOMERS = [
  { name: 'Orchard & Co.', plan: 'Studio', orders: 38, since: '2024' },
  { name: 'Northlight Studio', plan: 'Studio', orders: 27, since: '2023' },
  { name: 'Blue Harbour', plan: 'Starter', orders: 14, since: '2025' },
  { name: 'Tala Ceramics', plan: 'Starter', orders: 11, since: '2025' },
  { name: 'Fern Botanics', plan: 'Studio', orders: 22, since: '2024' },
  { name: 'Kiln & Clay', plan: 'Starter', orders: 6, since: '2026' },
]
const fmt = (n: number, d = 0) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })

function chartPath(values: number[], w: number, h: number) {
  const min = Math.min(...values) * 0.9
  const max = Math.max(...values) * 1.04
  const step = w / Math.max(1, values.length - 1)
  const pts = values.map((v, i) => [i * step, h - ((v - min) / (max - min)) * h] as const)
  let d = `M${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    d += `C${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]} ${p2[1]}`
  }
  return { line: d, area: `${d}L${w} ${h}L0 ${h}Z`, pts }
}

function Delta({ now, before }: { now: number; before: number }) {
  const pct = before ? ((now - before) / before) * 100 : 0
  return <em className={pct >= 0 ? 'up' : 'down'}>{`${pct >= 0 ? '+' : '−'}${fmt(Math.abs(pct), 1)}%`}</em>
}

export function AtlasApp() {
  const [view, setView] = useState<View>('overview')
  const [range, setRange] = useState(1)
  const [filter, setFilter] = useState<Filter>('all')
  const [invoices, setInvoices] = useState(INVOICES)
  const [toast, setToast] = useState<string | null>(null)
  const weeks = RANGES[range].weeks
  const [point, setPoint] = useState<number | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(t)
  }, [toast])

  const data = useMemo(() => {
    const cur = SERIES.slice(WEEKS - weeks)
    const prev = SERIES.slice(WEEKS - 2 * weeks, WEEKS - weeks)
    const sum = (a: number[]) => a.reduce((s, v) => s + v, 0)
    const revenue = sum(cur) * 1000
    const revenueBefore = sum(prev) * 1000
    const orders = Math.round(revenue / 41.3)
    const ordersBefore = Math.round(revenueBefore / 42.1)
    return { cur, revenue, revenueBefore, orders, ordersBefore, chart: chartPath(cur, 600, 180) }
  }, [weeks])

  const open = invoices.filter((i) => i.status !== 'paid')
  const shown = invoices.filter((i) => filter === 'all' || i.status === filter)
  const active = point ?? data.cur.length - 1

  const onChartMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    setPoint(Math.round(((e.clientX - r.left) / r.width) * (data.cur.length - 1)))
  }
  const onChartKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    setPoint(Math.max(0, Math.min(data.cur.length - 1, active + (e.key === 'ArrowLeft' ? -1 : 1))))
  }
  const markPaid = (id: number) => {
    setInvoices((list) => list.map((i) => (i.id === id ? { ...i, status: 'paid' } : i)))
    setToast(`Invoice #${id} marked as paid`)
  }

  const [px, py] = data.chart.pts[Math.min(active, data.chart.pts.length - 1)]
  const nav: [View, string][] = [
    ['overview', 'Overview'],
    ['invoices', 'Invoices'],
    ['customers', 'Customers'],
  ]

  return (
    <div className="sv-app">
      <BrowserFrame url={`app.atlas-ledger.concept/${view}`} className="sv-app__browser">
        <div className="app" role="region" aria-label="Atlas Ledger: a concept analytics app with sample data">
          <nav className="app__side" aria-label="Atlas Ledger">
            <span className="app__logo">
              <i />
              Atlas
            </span>
            {nav.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`app__nav${view === id ? ' app__nav--on' : ''}`}
                aria-current={view === id ? 'page' : undefined}
                onClick={() => setView(id)}
              >
                {label}
                {id === 'invoices' && open.length > 0 && <span className="app__badge">{open.length}</span>}
              </button>
            ))}
          </nav>
          <div className="app__main">
            <div className="app__top">
              <h4 className="app__h">{nav.find(([id]) => id === view)?.[1]}</h4>
              <span className="app__chip">Sample data</span>
              {view === 'overview' && (
                <span className="app__seg" role="radiogroup" aria-label="Range">
                  {RANGES.map((r, i) => (
                    <button key={r.weeks} type="button" role="radio" aria-checked={range === i} onClick={() => {
                        setRange(i)
                        setPoint(null)
                      }}>
                      {r.label}
                    </button>
                  ))}
                </span>
              )}
            </div>

            {view === 'overview' && (
              <div className="app__view app__view--overview">
                <div className="app__kpis">
                  <span className="kpi">
                    <small>Revenue</small>
                    <b>{fmt(data.revenue)}</b>
                    <Delta now={data.revenue} before={data.revenueBefore} />
                  </span>
                  <span className="kpi">
                    <small>Orders</small>
                    <b>{fmt(data.orders)}</b>
                    <Delta now={data.orders} before={data.ordersBefore} />
                  </span>
                  <span className="kpi">
                    <small>Average order</small>
                    <b>{fmt(data.revenue / data.orders, 2)}</b>
                    <Delta now={data.revenue / data.orders} before={data.revenueBefore / data.ordersBefore} />
                  </span>
                  <span className="kpi">
                    <small>Open invoices</small>
                    <b>{open.length}</b>
                    <em>{fmt(open.reduce((s, i) => s + i.amount, 0))} due</em>
                  </span>
                </div>
                <div className="app__grid">
                  <div className="card card--chart">
                    <span className="card__h">
                      Revenue <small>weekly, in thousands</small>
                    </span>
                    <div
                      className="chart"
                      tabIndex={0}
                      role="img"
                      aria-label={`Weekly revenue chart. Week ${active + 1} of ${data.cur.length}: ${fmt(data.cur[active] * 1000)}. Use the arrow keys to move along the weeks.`}
                      onPointerMove={onChartMove}
                      onPointerLeave={() => setPoint(null)}
                      onKeyDown={onChartKey}
                    >
                      <svg viewBox="0 0 600 180" preserveAspectRatio="none" aria-hidden="true">
                        <defs>
                          <linearGradient id="app-area" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0" stopColor="#c5f05c" stopOpacity="0.28" />
                            <stop offset="1" stopColor="#c5f05c" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {[0.25, 0.5, 0.75].map((g) => (
                          <line key={g} x1="0" x2="600" y1={180 * g} y2={180 * g} className="chart__grid" />
                        ))}
                        <path d={data.chart.area} fill="url(#app-area)" />
                        <path d={data.chart.line} className="chart__line" />
                      </svg>
                      <span
                        className={`chart__cursor${px / 600 > 0.85 ? ' chart__cursor--end' : px / 600 < 0.15 ? ' chart__cursor--start' : ''}`}
                        style={{ ...vars({ '--y': `${(py / 180) * 100}%` }), left: `${(px / 600) * 100}%` }} aria-hidden="true">
                        <i className="chart__dot" />
                        <span className="chart__tip">
                          W{active + 1} · {fmt(data.cur[active] * 1000)}
                        </span>
                      </span>
                    </div>
                    <span className="chart__axis" aria-hidden="true">
                      <span>W1</span>
                      <span>W{Math.ceil(data.cur.length / 2)}</span>
                      <span>W{data.cur.length}</span>
                    </span>
                  </div>
                  <div className="card card--donut">
                    <span className="card__h">Channels</span>
                    <svg viewBox="0 0 120 120" className="donut" aria-hidden="true">
                      <circle cx="60" cy="60" r="44" className="donut__track" />
                      <circle cx="60" cy="60" r="44" className="donut__seg donut__seg--a" pathLength={100} />
                      <circle cx="60" cy="60" r="44" className="donut__seg donut__seg--b" pathLength={100} />
                      <circle cx="60" cy="60" r="44" className="donut__seg donut__seg--c" pathLength={100} />
                    </svg>
                    <span className="legend">
                      <span>
                        <i className="a" />
                        Online <b>54%</b>
                      </span>
                      <span>
                        <i className="b" />
                        Retail <b>31%</b>
                      </span>
                      <span>
                        <i className="c" />
                        Wholesale <b>15%</b>
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {view === 'invoices' && (
              <div className="app__view">
                <span className="app__seg app__seg--filter" role="radiogroup" aria-label="Show invoices">
                  {(['all', 'paid', 'pending', 'overdue'] as Filter[]).map((f) => (
                    <button key={f} type="button" role="radio" aria-checked={filter === f} onClick={() => setFilter(f)}>
                      {f[0].toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </span>
                <table className="app__table">
                  <thead>
                    <tr>
                      <th scope="col">Invoice</th>
                      <th scope="col">Customer</th>
                      <th scope="col">Due</th>
                      <th scope="col" className="num">
                        Amount
                      </th>
                      <th scope="col">Status</th>
                      <th scope="col">
                        <span className="visually-hidden">Action</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((i) => (
                      <tr key={i.id}>
                        <td>#{i.id}</td>
                        <td>{i.customer}</td>
                        <td>{i.due}</td>
                        <td className="num">{fmt(i.amount, 2)}</td>
                        <td>
                          <span className={`st st--${i.status}`}>{i.status[0].toUpperCase() + i.status.slice(1)}</span>
                        </td>
                        <td>
                          {i.status !== 'paid' && (
                            <button type="button" className="app__action" onClick={() => markPaid(i.id)}>
                              Mark paid
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {view === 'customers' && (
              <div className="app__view">
                <table className="app__table">
                  <thead>
                    <tr>
                      <th scope="col">Customer</th>
                      <th scope="col">Plan</th>
                      <th scope="col" className="num">
                        Orders
                      </th>
                      <th scope="col">Since</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CUSTOMERS.map((c) => (
                      <tr key={c.name}>
                        <td>
                          <span className="app__who">
                            <i aria-hidden="true">{c.name[0]}</i>
                            {c.name}
                          </span>
                        </td>
                        <td>{c.plan}</td>
                        <td className="num">{c.orders}</td>
                        <td>{c.since}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <span className="app__toast" role="status" aria-live="polite">
            {toast && (
              <>
                <i aria-hidden="true" />
                <span>
                  <b>{toast}</b>
                  Sample data · nothing is sent
                </span>
              </>
            )}
          </span>
        </div>
      </BrowserFrame>
    </div>
  )
}

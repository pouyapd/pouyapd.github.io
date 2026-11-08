import { useMemo, useState } from 'react'
import { asset } from '../../app/paths'
import { ButtonLink } from '../../components/ui/Button'
import { ResponsiveImage } from '../../components/ui/ResponsiveImage'
import type { ConceptModule } from '../types'
import mark from './mark.json'
import './pdesign.css'

/* The studio's identity, measured: mark.json is written by tools/brand/make_logo.py (the logo files' own numbers); colours as src/styles/tokens.css. */
const { R, stroke: T, asc: ASC, desc: DESC, gap: GAP, centre: C } = mark

const COLOURS = [
  { name: 'Charcoal', token: '--c-charcoal', hex: '#101315', role: 'Background. Most of every page.' },
  { name: 'Ivory', token: '--c-ivory', hex: '#F2F0E9', role: 'Text, and the p of the mark on dark.' },
  { name: 'Stone', token: '--c-stone', hex: '#BDB8AF', role: 'Labels and fine lines.' },
  { name: 'Mist', token: '--c-mist', hex: '#A6ADB3', role: 'Secondary text.' },
  { name: 'Midnight', token: '--c-midnight', hex: '#202831', role: 'Raised surfaces.' },
  { name: 'Lime', token: '--c-lime', hex: '#C5F05C', role: 'The one accent: actions, focus and the d of the mark.' },
]

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const lin = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
}
const ratio = (a: string, b: string) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

const PAIRS: [string, string, string][] = [
  ['Ivory', 'Charcoal', 'Body text'],
  ['Mist', 'Charcoal', 'Secondary text'],
  ['Stone', 'Charcoal', 'Labels'],
  ['Charcoal', 'Lime', 'Text on the primary button'],
  ['Lime', 'Charcoal', 'Lime text: large sizes and focus rings only'],
  ['Charcoal', 'Ivory', 'The ink mark on light grounds'],
]

/** The mark's two colours on each ground (the files in public/brand; on lime it is one colour). */
const LETTERS = mark.letters
const MARK_INK = {
  dark: { p: LETTERS.colours.p, d: LETTERS.colours.d },
  light: { p: LETTERS.colours.pInk, d: LETTERS.colours.dInk },
  lime: { p: LETTERS.colours.pInk, d: LETTERS.colours.pInk },
}

/** The pd mark inline, from the logo files' own outlines: the d first, the p over it. */
function Mark({ height, ink = 'dark', label }: { height: number; ink?: keyof typeof MARK_INK; label: string }) {
  const [x, y, w, h] = mark.view
  return (
    <svg viewBox={`${x} ${y} ${w} ${h}`} role="img" aria-label={label} style={{ height, width: 'auto', display: 'block' }}>
      <path d={LETTERS.d} fill={MARK_INK[ink].d} />
      <path d={LETTERS.p} fill={MARK_INK[ink].p} />
    </svg>
  )
}

const SECTIONS = [
  ['mark', 'The mark'],
  ['colour', 'Colour'],
  ['type', 'Typography'],
  ['lime', 'Using lime'],
  ['components', 'Components'],
  ['imagery', 'Imagery & motion'],
  ['voice', 'Voice'],
  ['files', 'Files'],
] as const

/** The pd monogram drawn inline from the logo's own outline, optionally with its construction: the bowls' circles, the guide lines, the waist. */
function Construction({ guides }: { guides: boolean }) {
  return (
    <svg className="pd-construct" viewBox="-70 -76 140 142" role="img" aria-label="The pd monogram with its construction lines">
      {guides && (
        <g className="pd-construct__guides" fill="none">
          {[-ASC, -R, 0, R, DESC].map((y) => (
            <line key={y} x1="-70" x2="70" y1={y} y2={y} />
          ))}
          <line x1="0" x2="0" y1="-76" y2="66" />
          {[-C, C].flatMap((cx) => [R, R - T].map((r) => <circle key={`${cx} ${r}`} cx={cx} cy="0" r={r} />))}
        </g>
      )}
      <path d={LETTERS.d} fill={LETTERS.colours.d} />
      <path d={LETTERS.p} fill="currentColor" />
      {guides && (
        <g className="pd-construct__notes">
          <text x="-69" y={-ASC - 1.6}>ascender</text>
          <text x="-69" y={-R - 1.6}>x-height</text>
          <text x="-69" y={R - 1.6}>baseline</text>
          <text x="-69" y={DESC + 4.8}>descender</text>
          <text x="2" y="-70">one stroke where the bowls meet</text>
          <text x="4.5" y="1.3">the colour changes here</text>
        </g>
      )}
    </svg>
  )
}

function MarkTester() {
  const [size, setSize] = useState(64)
  const [ground, setGround] = useState<'charcoal' | 'ivory' | 'lime' | 'photo'>('charcoal')
  return (
    <div className="pd-tester">
      <div className={`pd-tester__stage pd-tester__stage--${ground}`}>
        {ground === 'photo' && (
          <div className="pd-tester__photo" aria-hidden="true">
            <ResponsiveImage group="hero" name="portal" alt="" sizes="(max-width: 900px) 92vw, 60vw" />
          </div>
        )}
        <Mark height={size} ink={ground === 'ivory' ? 'light' : ground === 'lime' ? 'lime' : 'dark'} label={`The pd mark at ${size} pixels high`} />
      </div>
      <div className="pd-tester__controls">
        <label className="pd-range">
          <span>
            Height <output>{size} px</output>
          </span>
          <input type="range" min={16} max={320} step={1} value={size} onChange={(e) => setSize(Number(e.target.value))} />
        </label>
        <div className="pd-seg" role="group" aria-label="Background">
          {(['charcoal', 'ivory', 'lime', 'photo'] as const).map((g) => (
            <button key={g} type="button" aria-pressed={ground === g} onClick={() => setGround(g)}>
              {g === 'photo' ? 'On the hero' : g[0].toUpperCase() + g.slice(1)}
            </button>
          ))}
        </div>
        <p className="pd-note">{size < 22 ? 'Below 22 px, use the favicon cut: a heavier stroke, shorter stems and no gaps, on the lime tile.' : size < 32 ? 'Smallest size for the full mark: 22 px high. Below about 32 px the gaps close and it reads as one solid form, as intended.' : ground === 'lime' ? 'On lime the mark is one colour, charcoal: a lime d would disappear.' : 'Clear space on every side: one stroke width × 2.'}</p>
      </div>
    </div>
  )
}

function Swatches() {
  const [copied, setCopied] = useState('')
  const copy = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex)
      setCopied(hex)
    } catch {
      setCopied(`select:${hex}`)
    }
  }
  return (
    <>
      <ul className="pd-swatches" role="list">
        {COLOURS.map((c) => (
          <li key={c.hex}>
            <button type="button" className="pd-swatch" style={{ background: c.hex, color: ratio(c.hex, '#101315') > 7 ? '#101315' : '#F2F0E9' }} onClick={() => copy(c.hex)} aria-label={`${c.name}, ${c.hex}: copy the hex value`}>
              <span className="pd-swatch__name">{c.name}</span>
              <code>{c.hex}</code>
            </button>
            <p>
              <code>{c.token}</code> — {c.role}
            </p>
          </li>
        ))}
      </ul>
      <p className="pd-copied" aria-live="polite">
        {copied.startsWith('select:') ? `Copy not available here: the value is ${copied.slice(7)}.` : copied ? `Copied ${copied}.` : ''}
      </p>
    </>
  )
}

function ContrastTable() {
  const rows = useMemo(
    () =>
      PAIRS.map(([fg, bg, use]) => {
        const a = COLOURS.find((c) => c.name === fg)!.hex
        const b = COLOURS.find((c) => c.name === bg)!.hex
        return { fg, bg, a, b, use, r: ratio(a, b) }
      }),
    [],
  )
  return (
    <div className="pd-table-wrap" role="region" aria-label="Contrast table" tabIndex={0}>
      <table className="pd-table">
        <caption className="visually-hidden">Contrast of the palette's text pairs (WCAG 2.1)</caption>
        <thead>
          <tr>
            <th scope="col">Pair</th>
            <th scope="col">Ratio</th>
            <th scope="col">WCAG</th>
            <th scope="col">Use</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.fg + r.bg}>
              <th scope="row">
                <span className="pd-pair" style={{ background: r.b, color: r.a }}>
                  Aa
                </span>
                {r.fg} on {r.bg}
              </th>
              <td>{r.r.toFixed(2)} : 1</td>
              <td>{r.r >= 7 ? 'AAA' : r.r >= 4.5 ? 'AA' : r.r >= 3 ? 'AA large' : 'Fails'}</td>
              <td>{r.use}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TypeTester() {
  const [text, setText] = useState('Digital experiences, beyond the ordinary.')
  const [face, setFace] = useState<'sans' | 'serif'>('sans')
  const [size, setSize] = useState(56)
  return (
    <div className="pd-type-tester">
      <div className="pd-type-tester__controls">
        <label className="pd-field">
          <span>Your text</span>
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={90} />
        </label>
        <div className="pd-seg" role="group" aria-label="Typeface">
          <button type="button" aria-pressed={face === 'sans'} onClick={() => setFace('sans')}>
            Geist
          </button>
          <button type="button" aria-pressed={face === 'serif'} onClick={() => setFace('serif')}>
            Instrument Serif
          </button>
        </div>
        <label className="pd-range">
          <span>
            Size <output>{size} px</output>
          </span>
          <input type="range" min={14} max={120} value={size} onChange={(e) => setSize(Number(e.target.value))} />
        </label>
      </div>
      <p className={`pd-type-tester__out pd-type-tester__out--${face}`} style={{ fontSize: `${size}px` }}>
        {text || ' '}
      </p>
    </div>
  )
}

function PDesign() {
  const [guides, setGuides] = useState(true)
  return (
    <div className="pd-root">
      <header className="pd-top">
        <div className="pd-wrap pd-top__in">
          <a className="pd-top__home" href={asset('')}>
            <img src={asset('brand/logo.svg')} alt="P. DESIGN" width={104} height={118} />
          </a>
          <p className="pd-top__title">Brand guidelines</p>
          <ButtonLink href={`${asset('')}#contact`} size="s" className="pd-top__cta">
            Start a project
          </ButtonLink>
        </div>
      </header>

      <div className="pd-wrap pd-layout">
        <nav className="pd-toc" aria-label="Guidelines">
          <ol role="list">
            {SECTIONS.map(([id, label], i) => (
              <li key={id}>
                <a href={`#${id}`}>
                  <span>{String(i + 1).padStart(2, '0')}</span> {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <main className="pd-main">
          <section className="pd-intro" aria-labelledby="pd-title">
            <p className="pd-kicker">P. DESIGN · identity</p>
            <h1 id="pd-title" className="pd-display">
              One mark, one accent, <em>and room to work.</em>
            </h1>
            <p className="pd-lead">
              The studio's identity is deliberately quiet: a charcoal ground, ivory type, a single monogram and one colour that only ever means “act here”. These pages set out how each part is built and when it is used — the same rules this website follows.
            </p>
          </section>

          <section className="pd-sec" id="mark" aria-labelledby="pd-mark">
            <p className="pd-num">01</p>
            <h2 id="pd-mark" className="pd-h2">
              The mark
            </h2>
            <p className="pd-text">
              A lowercase <b>p</b> and <b>d</b> drawn as one ribbon: up the p's stem, over its bowl, through the waist, round the d and up its stem. The other two arcs pass under it — in flat colour, a gap of {GAP / T} of a stroke. Two circular bowls, one stroke wide where they meet; stems flush with their edges, cut at the same slant, the ascender a little taller than the descender. One weight, no font, two flat colours: the p in ivory, the d in the lime of the primary button, changing at the waist where the bowls meet.
            </p>
            <figure className="pd-figure">
              <div className="pd-construct-wrap">
                <Construction guides={guides} />
              </div>
              <figcaption>
                <label className="pd-check">
                  <input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} />
                  <span>Show construction</span>
                </label>
                <span>
                  Bowl radius {R} · stroke {T} · gap {GAP} · ascender {ASC} and descender {DESC} from the centre line · {mark.view[2]} × {mark.view[3]} units
                </span>
              </figcaption>
            </figure>
            <h3 className="pd-h3">Try it at any size</h3>
            <MarkTester />
            <div className="pd-ladder" aria-label="The favicon and the mark at fixed sizes">
              {[16, 24, 32, 48].map((s) => (
                <figure key={s}>
                  <img src={asset('favicon.svg')} alt="" width={s} height={s} />
                  <figcaption>{s} px favicon</figcaption>
                </figure>
              ))}
              {[22, 40, 96].map((s) => (
                <figure key={`m${s}`} className="pd-ladder__dark">
                  <img src={asset('brand/logo.svg')} alt="" style={{ height: s, width: 'auto' }} />
                  <figcaption>{s} px mark</figcaption>
                </figure>
              ))}
            </div>
            <ul className="pd-dodont" role="list">
              <li className="is-do">
                <b>Do</b> use the mark alone: ivory and lime on dark, charcoal and deep lime ({LETTERS.colours.dInk}) on light, all charcoal on lime. The studio's name is its accessible name.
              </li>
              <li className="is-dont">
                <b>Don't</b> swap the colours, set the p in lime, outline it, add gradients, glows, shadows or a metal finish, animate it, or stretch it. Where the name is needed beside it, set it as real text.
              </li>
            </ul>
          </section>

          <section className="pd-sec" id="colour" aria-labelledby="pd-colour">
            <p className="pd-num">02</p>
            <h2 id="pd-colour" className="pd-h2">
              Colour
            </h2>
            <p className="pd-text">Five neutrals do the work; lime is kept back. Select a swatch to copy its value. Every text pair below is measured, not eyeballed.</p>
            <Swatches />
            <ContrastTable />
          </section>

          <section className="pd-sec" id="type" aria-labelledby="pd-type">
            <p className="pd-num">03</p>
            <h2 id="pd-type" className="pd-h2">
              Typography
            </h2>
            <p className="pd-text">
              <b>Geist</b> for everything that has to be read: headings, text, buttons, labels. <b>Instrument Serif</b>, italic, for a single word of emphasis in a headline — never a whole sentence, never in body text.
            </p>
            <div className="pd-specimen">
              <p className="pd-specimen__sans">Aa Bb Gg 0123</p>
              <p className="pd-specimen__serif">
                <em>beyond the ordinary.</em>
              </p>
            </div>
            <TypeTester />
          </section>

          <section className="pd-sec" id="lime" aria-labelledby="pd-lime">
            <p className="pd-num">04</p>
            <h2 id="pd-lime" className="pd-h2">
              Using lime
            </h2>
            <p className="pd-text">Lime means one thing: this is where you act. If everything is lime, nothing is.</p>
            <ul className="pd-rules" role="list">
              <li className="is-do">
                <b>The primary action</b> on a screen — “Start a project” — and only one per view.
              </li>
              <li className="is-do">
                <b>Focus rings</b>, so keyboard users can always see where they are.
              </li>
              <li className="is-do">
                <b>The favicon tile</b>, so the studio is easy to find among open tabs.
              </li>
              <li className="is-dont">
                <b>The d of the mark</b> — the one place lime is part of the identity rather than an action.
              </li>
              <li className="is-dont">
                <b>Not</b> for headlines, backgrounds, icons, decorative lines or body links.
              </li>
            </ul>
            <div className="pd-lime-demo">
              <div className="pd-mini">
                <p className="pd-mini__h">Have a project in mind?</p>
                <span className="pd-mini__btn">Start a project</span>
                <span className="pd-mini__link">See the work</span>
                <p className="pd-mini__cap">Right: one lime action, everything else neutral.</p>
              </div>
              <div className="pd-mini pd-mini--wrong">
                <p className="pd-mini__h">Have a project in mind?</p>
                <span className="pd-mini__btn">Start a project</span>
                <span className="pd-mini__btn">See the work</span>
                <p className="pd-mini__cap">Wrong: lime headline, two lime buttons — no hierarchy.</p>
              </div>
            </div>
          </section>

          <section className="pd-sec" id="components" aria-labelledby="pd-components">
            <p className="pd-num">05</p>
            <h2 id="pd-components" className="pd-h2">
              Components
            </h2>
            <p className="pd-text">The live components from this website. Tab through them to see the focus ring.</p>
            <div className="pd-components">
              <ButtonLink href={`${asset('')}#contact`}>Start a project</ButtonLink>
              <ButtonLink href={`${asset('')}#work`} variant="ghost">
                Explore the work
              </ButtonLink>
              <a className="pd-textlink" href={asset('work/p-design/case-study/')}>
                A text link
              </a>
            </div>
            <dl className="pd-specs">
              <div>
                <dt>Radius</dt>
                <dd>Pills for actions; square corners for images and panels.</dd>
              </div>
              <div>
                <dt>Spacing</dt>
                <dd>A fluid scale from 4 to 160 px; sections breathe at 80–160 px.</dd>
              </div>
              <div>
                <dt>Grid</dt>
                <dd>12 columns, 1440 px maximum, gutters from 20 to 72 px.</dd>
              </div>
            </dl>
          </section>

          <section className="pd-sec" id="imagery" aria-labelledby="pd-imagery">
            <p className="pd-num">06</p>
            <h2 id="pd-imagery" className="pd-h2">
              Imagery &amp; motion
            </h2>
            <figure className="pd-still">
              <ResponsiveImage group="hero" name="portal" alt="The studio's hero image: a monumental stone gateway stands in still water at sunset, the sun low in its arch; a small figure on a long walkway looks towards it." sizes="(max-width: 900px) 92vw, 64vw" />
              <figcaption>The hero: one image, used as supplied, with the words on its dark left side. Its only motion is a slow settle into the frame as the page opens.</figcaption>
            </figure>
            <ul className="pd-principles" role="list">
              <li>
                <b>One image, not a collage.</b> A single, composed scene with a quiet side for the words.
              </li>
              <li>
                <b>Motion explains or calms.</b> A slow settle of the hero image, a reveal as content arrives. Never motion for its own sake.
              </li>
              <li>
                <b>Reduced motion is a real version.</b> With the system setting on, every animation stops and stills take their place.
              </li>
            </ul>
          </section>

          <section className="pd-sec" id="voice" aria-labelledby="pd-voice">
            <p className="pd-num">07</p>
            <h2 id="pd-voice" className="pd-h2">
              Voice
            </h2>
            <ul className="pd-voice" role="list">
              <li>
                <b>Plain over clever.</b>
                <span className="pd-voice__no">“We craft bespoke digital journeys.”</span>
                <span className="pd-voice__yes">“We design and build websites.”</span>
              </li>
              <li>
                <b>Honest about status.</b>
                <span className="pd-voice__no">“Trusted by leading brands.”</span>
                <span className="pd-voice__yes">“Self-initiated concept studies for fictional brands.”</span>
              </li>
              <li>
                <b>Specific over general.</b>
                <span className="pd-voice__no">“Lightning-fast performance.”</span>
                <span className="pd-voice__yes">“Every page is checked at phone, tablet and desktop sizes.”</span>
              </li>
            </ul>
          </section>

          <section className="pd-sec" id="files" aria-labelledby="pd-files">
            <p className="pd-num">08</p>
            <h2 id="pd-files" className="pd-h2">
              Files
            </h2>
            <p className="pd-text">The logo files are plain, editable SVG generated from one set of measurements.</p>
            <ul className="pd-files" role="list">
              {[
                ['brand/logo.svg', 'The mark, ivory and lime', 'For dark backgrounds'],
                ['brand/logo-ink.svg', 'The mark, charcoal and deep lime', 'For light backgrounds'],
                ['favicon.svg', 'Favicon', 'The heavier cut on the lime tile'],
                ['brand/pd-icon.svg', 'App and profile icon', 'The mark on a charcoal tile'],
              ].map(([file, name, use]) => (
                <li key={file}>
                  <a href={asset(file)} download>
                    <b>{name}</b>
                    <span>{use}</span>
                    <code>{file.split('/').pop()}</code>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </main>
      </div>

      <footer className="pd-foot">
        <div className="pd-wrap">
          <p>
            P. DESIGN — independent design and development studio. <a href={asset('')}>Back to the studio</a> · <a href={asset('work/p-design/case-study/')}>How the identity was made</a>
          </p>
        </div>
      </footer>
    </div>
  )
}

export const concept: ConceptModule = { Site: PDesign, paths: [''] }

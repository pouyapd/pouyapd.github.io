/**
 * Lune Atelier — a fictional hair, brow, lash and skin atelier. All
 * treatments, prices, times and guest notes are sample content for the
 * concept; photographs are from Unsplash (credits on the case-study page).
 */

export type Discipline = 'hair' | 'brows' | 'lashes' | 'skin'

export interface Treatment {
  id: string
  discipline: Discipline
  name: string
  line: string
  minutes: number
  price: number
  from?: boolean
  detail: string
}

export const treatments: Treatment[] = [
  { id: 'cut', discipline: 'hair', name: 'Precision cut & finish', line: 'Consultation, wash, cut and a soft blow-dry', minutes: 75, price: 85, detail: 'A cut planned around how your hair grows and how you wear it: we look at the fall and density first, cut dry where it helps, and finish with a blow-dry you can repeat at home.' },
  { id: 'colour', discipline: 'hair', name: 'Colour & gloss', line: 'Root colour or all-over, with a shine gloss', minutes: 120, price: 140, detail: 'Permanent or demi-permanent colour matched to your skin tone, sealed with an acidic gloss for shine that lasts four to six weeks.' },
  { id: 'balayage', discipline: 'hair', name: 'Balayage', line: 'Hand-painted lightness, toned to your skin', minutes: 180, price: 220, from: true, detail: 'Lightness painted freehand where the sun would naturally catch it, then toned. Grows out softly, with no harsh line, for three to four months.' },
  { id: 'scalp', discipline: 'hair', name: 'Scalp ritual', line: 'Warm oil, steam and a slow massage', minutes: 45, price: 60, detail: 'A clarifying cleanse, warm botanical oil under steam and a twenty-minute pressure-point massage. Booked alone or added to any hair appointment.' },
  { id: 'brow-sculpt', discipline: 'brows', name: 'Brow sculpt', line: 'Mapping, shaping and tidy', minutes: 45, price: 45, detail: 'We map the arch to your bone structure with thread and calipers, then shape with wax and tweezers — never a stencil.' },
  { id: 'brow-lam', discipline: 'brows', name: 'Brow lamination & tint', line: 'Set, nourished and softly coloured', minutes: 50, price: 65, detail: 'Hairs are set in place for six to eight weeks, nourished and tinted one shade from your natural colour for a full, brushed-up look.' },
  { id: 'lash-lift', discipline: 'lashes', name: 'Lash lift & tint', line: 'A natural curl for six to eight weeks', minutes: 60, price: 70, detail: 'Your own lashes, lifted from the root on a silicone shield and tinted dark. No extensions and no daily curling.' },
  { id: 'lash-ext', discipline: 'lashes', name: 'Classic extensions', line: 'One extension per lash, set by hand', minutes: 110, price: 120, detail: 'Light, single extensions applied one by one for a natural line. Infills every three weeks are €55.' },
  { id: 'facial', discipline: 'skin', name: 'Signature facial', line: 'Cleanse, exfoliate, mask and massage', minutes: 60, price: 110, detail: 'Built around your skin on the day: a double cleanse, enzyme exfoliation, a treatment mask and a slow lymphatic facial massage.' },
  { id: 'glow', discipline: 'skin', name: 'Glow facial', line: 'Brightening peel and hydrating infusion', minutes: 75, price: 135, detail: 'A gentle lactic peel followed by a hyaluronic infusion and cooling stones — for dull, tired skin before an event.' },
  { id: 'edit', discipline: 'brows', name: 'The brow & lash edit', line: 'Brow lamination and lash lift in one sitting', minutes: 90, price: 135, detail: 'Our most-requested pairing: brows mapped and laminated, lashes lifted and tinted, in one calm sitting.' },
]

export const byId = (id: string) => treatments.find((t) => t.id === id)

export interface Ritual {
  discipline: Discipline
  numeral: string
  title: string
  line: string
  photo: string
  focus: string
  alt: string
  intro: string
  expect: string[]
}

export const rituals: Ritual[] = [
  {
    discipline: 'hair',
    numeral: 'i',
    title: 'Hair',
    line: 'Cut, colour, gloss and soft styling — shape that grows out gracefully.',
    photo: 'portrait-updo',
    focus: '50% 30%',
    alt: 'Sleek blonde hair drawn back into a low twist, against a pale wall.',
    intro: 'Cut and colour planned together, so the shape and the light in your hair grow out as one.',
    expect: ['A ten-minute consultation before anything is cut', 'Products chosen for your hair, never a hard sell', 'A finish you can repeat at home'],
  },
  {
    discipline: 'brows',
    numeral: 'ii',
    title: 'Brows',
    line: 'Mapping, shaping, tint and lamination, measured to your face.',
    photo: 'portrait-brows',
    focus: '50% 30%',
    alt: 'Full, softly shaped brows, freckles and glowing skin.',
    intro: 'Brows measured to your bone structure and grown into their best shape over a few visits.',
    expect: ['Mapping with thread and calipers', 'A patch test 48 hours before any tint', 'Aftercare notes sent after your visit'],
  },
  {
    discipline: 'lashes',
    numeral: 'iii',
    title: 'Lashes',
    line: 'Lift and tint, or light extensions set one by one for a natural line.',
    photo: 'lash-treatment',
    focus: '45% 45%',
    alt: 'Lash extensions being placed one by one with fine tweezers.',
    intro: 'Your own lashes lifted and tinted, or light extensions for a soft, natural line.',
    expect: ['Eyes closed and comfortable throughout', 'No mascara needed for weeks', 'Patch test 48 hours before'],
  },
  {
    discipline: 'skin',
    numeral: 'iv',
    title: 'Skin',
    line: 'Facials built around your skin that day — cleanse, treat, massage.',
    photo: 'portrait-profile',
    focus: '58% 38%',
    alt: 'A profile portrait with glowing, even skin.',
    intro: 'Facials that start from how your skin is today, with a slow massage at their heart.',
    expect: ['A skin reading before every facial', 'Fragrance-free products on request', 'A short home routine to take away'],
  },
]

export const disciplineLabel: Record<Discipline, string> = { hair: 'Hair', brows: 'Brows', lashes: 'Lashes', skin: 'Skin' }

export const gallery = [
  { photo: 'portrait-linen', alt: 'A woman in a white shirt touching her ear, in warm studio light.', focus: '50% 30%' },
  { photo: 'hair-curl', alt: 'Long brunette hair being curled into soft waves.', focus: '50% 45%' },
  { photo: 'brow-glow', alt: 'A close portrait with glowing skin and full, brushed-up brows.', focus: '50% 35%' },
  { photo: 'hair-waves-back', alt: 'Long, glossy blonde waves seen from behind.', focus: '50% 40%' },
  { photo: 'skin-massage', alt: 'A slow facial massage.', focus: '50% 40%' },
  { photo: 'portrait-sunlight', alt: 'A woman with dark hair in warm evening light, leaf shadows across her face.', focus: '50% 30%' },
]

/** A sample calendar for the booking concept: three weeks of November 2026. */
export const WEEKS = [
  ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15'],
  ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22'],
  ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29'],
]
export const TIMES = ['9:00', '10:30', '11:45', '13:00', '14:30', '16:00', '17:15', '18:30']

const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const dayName = (iso: string) => DAY[new Date(`${iso}T12:00:00Z`).getUTCDay()]
export const dayNum = (iso: string) => Number(iso.slice(8, 10))
export const longDate = (iso: string) => `${dayName(iso)} ${dayNum(iso)} Nov`

/** Closed on Sundays and Mondays; Saturday closes at 17:00. */
export function isOpen(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`).getUTCDay()
  return d !== 0 && d !== 1
}

/** Deterministic sample availability, so the calendar looks the same on every visit. */
export function isFree(iso: string, time: string, treatment: string) {
  if (!isOpen(iso)) return false
  if (iso === NEXT_FREE.date && time === NEXT_FREE.time) return true
  const sat = new Date(`${iso}T12:00:00Z`).getUTCDay() === 6
  if (sat && TIMES.indexOf(time) > 5) return false
  let h = 7
  for (const c of iso + time + treatment) h = (h * 31 + c.charCodeAt(0)) % 9973
  return h % 5 > 1
}

export const NEXT_FREE = { date: '2026-11-12', time: '10:30', treatment: 'brow-sculpt' }

/* ---- the shop: the products used in the treatment rooms (sample range, sample prices) ---- */

export type ShopCategory = 'skin' | 'hair' | 'brows-lashes' | 'body'

export const shopCategories: { id: ShopCategory; label: string }[] = [
  { id: 'skin', label: 'Skin' },
  { id: 'hair', label: 'Hair' },
  { id: 'brows-lashes', label: 'Brows & lashes' },
  { id: 'body', label: 'Body & hands' },
]

export interface Product {
  id: string
  name: string
  category: ShopCategory
  line: string
  /** Sizes with their price; the first is the default. */
  sizes: { label: string; price: number }[]
  photo: string
  focus?: string
  alt: string
  detail: string
  use: string
  ingredients: string[]
  /** The treatment it is used in, for "used in the atelier". */
  treatment: string
  tag?: string
}

export const products: Product[] = [
  {
    id: 'water-serum',
    name: 'Water Serum',
    category: 'skin',
    line: 'Hyaluronic serum for skin that feels tight',
    sizes: [{ label: '30 ml', price: 48 }, { label: '50 ml', price: 68 }],
    photo: 'product-amber',
    focus: '50% 55%',
    alt: 'An amber glass dropper bottle casting a long shadow on a pale surface.',
    detail: 'Three weights of hyaluronic acid with panthenol: the serum we press into the skin after every facial. Light enough for morning and evening, under oil or cream.',
    use: 'Three drops on damp skin, morning and evening, before oil or cream.',
    ingredients: ['Hyaluronic acid, three weights', 'Panthenol (provitamin B5)', 'Glycerin from coconut'],
    treatment: 'facial',
    tag: 'Most loved',
  },
  {
    id: 'night-oil',
    name: 'Night Facial Oil',
    category: 'skin',
    line: 'Squalane and rosehip for a slow overnight repair',
    sizes: [{ label: '30 ml', price: 56 }],
    photo: 'product-dark-dropper',
    focus: '50% 55%',
    alt: 'A dark glass dropper bottle with a gold collar, on a small dish.',
    detail: 'A dry-touch oil of squalane, rosehip and a little bakuchiol, used at the end of the glow facial. It sinks in within a minute and leaves no film on the pillow.',
    use: 'Warm two drops between the palms and press onto clean skin at night.',
    ingredients: ['Squalane from olives', 'Cold-pressed rosehip oil', 'Bakuchiol'],
    treatment: 'glow',
  },
  {
    id: 'cleansing-balm',
    name: 'Cleansing Balm',
    category: 'skin',
    line: 'Melts make-up and sunscreen, rinses clean',
    sizes: [{ label: '100 ml', price: 38 }],
    photo: 'product-balm-jar',
    focus: '50% 50%',
    alt: 'An open amber jar of soft white balm on linen, seen from above.',
    detail: 'The first step of every facial in the atelier. A soft balm that turns to milk with water, so even long-wear make-up comes away without rubbing.',
    use: 'Massage a small scoop onto dry skin for a minute, add water, rinse.',
    ingredients: ['Sunflower and jojoba oils', 'Oat lipids', 'A mild plant emulsifier'],
    treatment: 'facial',
  },
  {
    id: 'gloss-oil',
    name: 'Gloss Hair Oil',
    category: 'hair',
    line: 'A weightless finish for shine after colour',
    sizes: [{ label: '50 ml', price: 34 }, { label: '100 ml', price: 52 }],
    photo: 'product-oil-grass',
    focus: '50% 62%',
    alt: 'An amber bottle of oil with a white dropper, beside dried grass.',
    detail: 'The finishing oil from our colour room: a light blend that adds shine and smooths the ends without weighing down fine hair or dulling a fresh gloss.',
    use: 'One or two drops through the lengths, on damp or dry hair.',
    ingredients: ['Camellia oil', 'Argan oil', 'Vitamin E'],
    treatment: 'colour',
  },
  {
    id: 'brow-serum',
    name: 'Brow & Lash Serum',
    category: 'brows-lashes',
    line: 'Conditions brows and lashes between visits',
    sizes: [{ label: '6 ml', price: 32 }],
    photo: 'product-drop-white',
    focus: '48% 55%',
    alt: 'A white dropper bottle with a gold collar standing on marble.',
    detail: 'A peptide serum we recommend after lamination or a lash lift, to keep the hairs supple while they settle and grow.',
    use: 'A thin line along the brows and the lash roots each night.',
    ingredients: ['Biotinoyl tripeptide', 'Panthenol', 'Castor oil'],
    treatment: 'brow-lam',
  },
  {
    id: 'body-butter',
    name: 'Body Butter',
    category: 'body',
    line: 'Shea and oat for dry skin in winter',
    sizes: [{ label: '200 ml', price: 42 }],
    photo: 'product-butter',
    focus: '46% 50%',
    alt: 'A white jar with a dark lid on a wooden board, beside dried grasses.',
    detail: 'A thick, unscented butter for elbows, shins and hands that crack in the cold. It melts on contact and is fully absorbed in a few minutes.',
    use: 'Warm a little between the hands and smooth over damp skin after a bath.',
    ingredients: ['Shea butter', 'Colloidal oat', 'Sweet almond oil'],
    treatment: 'facial',
  },
  {
    id: 'hand-duo',
    name: 'Hand Cream & Lip Tin',
    category: 'body',
    line: 'The pair we keep at every station',
    sizes: [{ label: 'Duo', price: 29 }],
    photo: 'product-tube',
    focus: '50% 55%',
    alt: 'A kraft-paper tube and a small round tin on a white plinth.',
    detail: 'A fast-absorbing hand cream in a paper tube and a small tin of lip balm, both lightly scented with neroli. Made to live in a bag.',
    use: 'As often as you like.',
    ingredients: ['Shea butter', 'Beeswax (lip tin)', 'Neroli oil'],
    treatment: 'scalp',
  },
  {
    id: 'oat-bar',
    name: 'Oat Cleansing Bar',
    category: 'body',
    line: 'A gentle bar for face and body, no packaging',
    sizes: [{ label: '120 g', price: 18 }],
    photo: 'product-bar',
    focus: '50% 52%',
    alt: 'A smooth ivory cleansing bar on a pale surface.',
    detail: 'A soap-free bar with colloidal oat that cleans without the tight feeling. Wrapped in paper only.',
    use: 'Lather with warm water; let it dry between uses.',
    ingredients: ['Colloidal oat', 'Coconut-derived cleansers', 'Kaolin clay'],
    treatment: 'facial',
  },
]

export const productById = (id: string) => products.find((p) => p.id === id)

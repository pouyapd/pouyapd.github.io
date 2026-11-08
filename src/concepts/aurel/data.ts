/**
 * Maison Aurel — a fictional fine-jewellery house. Pieces, prices and
 * materials are sample content for the concept; photographs are from
 * Unsplash (credits on the case-study page). The Stella solitaire is shown in
 * real-time 3D and in stills from the same renderer (npm run render:stella).
 */

export type Category = 'rings' | 'necklaces' | 'earrings' | 'bracelets'

export interface Piece {
  id: string
  name: string
  collection: string
  category: Category
  price: number
  line: string
  photos: { key: string; focus?: string; alt: string }[]
  description: string
  materials: string[]
  /** ring sizes, or chain lengths in cm */
  sizes?: { label: string; options: string[]; unavailable?: string[] }
  metals: Metal[]
  tag?: string
  bridal?: boolean
  making: string
  /** Shown in real-time 3D as well (src/components/motion/lab/solitaire.ts); its photos are renders. */
  model?: 'solitaire'
}

export type Metal = 'yellow' | 'rose' | 'white'

export const METALS: Record<Metal, { label: string; swatch: string; extra: number }> = {
  yellow: { label: '18k yellow gold', swatch: 'linear-gradient(135deg,#e9c97f,#b88a3c)', extra: 0 },
  rose: { label: '18k rose gold', swatch: 'linear-gradient(135deg,#efd3c2,#c18c78)', extra: 0 },
  white: { label: '18k white gold', swatch: 'linear-gradient(135deg,#efefea,#b9b8b1)', extra: 60 },
}

const RING_SIZES = { label: 'Size', options: ['48', '50', '52', '54', '56', '58'], unavailable: ['56'] }

export const pieces: Piece[] = [
  {
    id: 'ondine-stack',
    name: 'Ondine stack',
    collection: 'Ondine',
    category: 'rings',
    price: 1480,
    line: 'Three softly irregular bands',
    tag: 'Signature',
    photos: [
      { key: 'rings-mirror', alt: 'Three wide, softly irregular gold bands stacked on a mirror.' },
      { key: 'rings-dark', focus: '50% 60%', alt: 'Two slim gold rings standing on dark glass.' },
    ],
    description: 'Three softly irregular bands, each carved in wax by hand and cast in recycled gold, so no two stacks are alike. Worn together, they read as one sculpted ring; apart, as three quiet bands.',
    materials: ['18k recycled gold', 'Bands 2.4 mm wide each', 'High polish, softened edges'],
    sizes: RING_SIZES,
    metals: ['yellow', 'rose', 'white'],
    making: 'Made to order in 3–4 weeks',
  },
  {
    id: 'stella-solitaire',
    name: 'Stella solitaire',
    collection: 'Stella',
    category: 'rings',
    price: 3450,
    line: 'A round brilliant on four claws',
    tag: 'New',
    bridal: true,
    model: 'solitaire',
    photos: [
      { key: 'stella-render', alt: 'The Stella solitaire: a round brilliant diamond held by four claws above a rose-gold band that parts around it.' },
      { key: 'stella-render-front', alt: 'The Stella solitaire from the front: the stone above the open band.' },
    ],
    description: 'A one-carat round brilliant, cut with 57 facets, held high on four slim claws above a band that parts around the stone. The claws are kept fine, so light reaches the diamond from every side.',
    materials: ['18k gold', '1.00 ct lab-grown diamond, round brilliant, F colour, VS1', 'Split band, 2.4 mm', 'Four claws'],
    sizes: RING_SIZES,
    metals: ['rose', 'yellow', 'white'],
    making: 'Made to order in 4–6 weeks',
  },
  {
    id: 'noctis-solitaire',
    name: 'Noctis solitaire',
    collection: 'Noctis',
    category: 'rings',
    price: 2650,
    line: 'A square-set diamond on a split band',
    bridal: true,
    photos: [{ key: 'ring-black', alt: 'A rose-gold ring with a square-set stone on a black surface.' }],
    description: 'A single brilliant held in a square, four-claw setting that sits low on the hand, on a band that parts around it. Designed to be worn every day, including beside a wedding band.',
    materials: ['18k gold', '0.30 ct lab-grown diamond, F colour, VS1', 'Band 2.2 mm'],
    sizes: RING_SIZES,
    metals: ['rose', 'yellow', 'white'],
    making: 'Made to order in 4–6 weeks',
  },
  {
    id: 'lumen-bands',
    name: 'Lumen bands',
    collection: 'Lumen',
    category: 'rings',
    price: 1290,
    line: 'A pair of classic wedding bands',
    bridal: true,
    tag: 'Engravable',
    photos: [{ key: 'bands', alt: 'Two polished gold wedding bands resting together on blush fabric.' }],
    description: 'Two bands, comfort-fit and court-shaped, polished by hand. The price is for the pair; engraving inside each band is included.',
    materials: ['18k gold', 'Widths 3 mm and 4 mm', 'Comfort-fit profile'],
    sizes: RING_SIZES,
    metals: ['yellow', 'rose', 'white'],
    making: 'Made to order in 3 weeks',
  },
  {
    id: 'riva-chain',
    name: 'Riva herringbone',
    collection: 'Riva',
    category: 'necklaces',
    price: 1120,
    line: 'A liquid, flat-woven collar',
    photos: [{ key: 'chain-worn', focus: '50% 45%', alt: 'A flat gold herringbone chain worn at the collarbone with a black jacket.' }],
    description: 'A flat herringbone chain that lies like a ribbon of light at the collarbone. Woven from fine links so it moves with you and never kinks.',
    materials: ['18k gold', '4 mm wide', 'Lobster clasp, one-hand opening'],
    sizes: { label: 'Length', options: ['40 cm', '42 cm', '45 cm'] },
    metals: ['yellow', 'white'],
    making: 'In stock — ships in 2 days',
  },
  {
    id: 'luna-pendant',
    name: 'Luna pendant',
    collection: 'Luna',
    category: 'necklaces',
    price: 760,
    line: 'A baroque pearl in a fine orbit',
    tag: 'New',
    photos: [{ key: 'pearl-pendant', alt: 'A white pearl pendant circled by a fine pavé ring, on a thin chain.' }],
    description: 'A single round freshwater pearl, chosen by eye for its lustre, held inside a fine orbit of gold on a delicate snake chain.',
    materials: ['18k gold', 'Freshwater pearl, 9–10 mm', 'Chain 42 cm, adjustable to 40'],
    metals: ['white', 'yellow'],
    making: 'In stock — ships in 2 days',
  },
  {
    id: 'ovale-pendant',
    name: 'Ovale pendant',
    collection: 'Ondine',
    category: 'necklaces',
    price: 890,
    line: 'An open oval on a snake chain',
    photos: [{ key: 'pendant-oval', focus: '50% 72%', alt: 'An open gold oval pendant on a snake chain, lying on sand.' }],
    description: 'An open oval, hollow-formed so it looks substantial but weighs almost nothing, on a smooth snake chain that catches the light.',
    materials: ['18k gold', 'Oval 26 × 20 mm', 'Snake chain 45 cm'],
    sizes: { label: 'Length', options: ['42 cm', '45 cm', '50 cm'] },
    metals: ['yellow', 'rose'],
    making: 'Made to order in 2–3 weeks',
  },
  {
    id: 'tessera-bar',
    name: 'Tessera bar',
    collection: 'Tessera',
    category: 'necklaces',
    price: 640,
    line: 'A slim bar, engraved by hand',
    tag: 'Engravable',
    photos: [{ key: 'pendant-box', alt: 'A slim vertical gold bar pendant displayed on a dark green box.' }],
    description: 'A slim vertical bar on a fine box chain. Up to eight characters can be engraved by hand on the back — initials, a date, coordinates.',
    materials: ['18k gold', 'Bar 2 cm × 2 mm', 'Box chain 45 cm'],
    metals: ['yellow', 'rose', 'white'],
    making: 'Engraved and shipped in 7 days',
  },
  {
    id: 'perla-strand',
    name: 'Perla strand',
    collection: 'Luna',
    category: 'necklaces',
    price: 1350,
    line: 'A hand-knotted pearl strand',
    bridal: true,
    photos: [{ key: 'pearls', alt: 'A strand of round white pearls on a dark green surface.' }],
    description: 'Round freshwater pearls, matched for size and lustre and knotted on silk between each pearl, finished with a gold box clasp.',
    materials: ['Freshwater pearls, 7–7.5 mm', 'Silk, hand-knotted', '18k gold clasp'],
    sizes: { label: 'Length', options: ['42 cm', '45 cm'] },
    metals: ['yellow', 'white'],
    making: 'Knotted to order in 2 weeks',
  },
  {
    id: 'halo-hoops',
    name: 'Halo hoops',
    collection: 'Halo',
    category: 'earrings',
    price: 980,
    line: 'Twisted rope hoops',
    tag: 'New',
    photos: [{ key: 'hoops', alt: 'A pair of twisted gold hoop earrings beside a pebble, in sharp light.' }],
    description: 'Chunky hoops twisted like rope, hollow so they are light enough to wear all day, with a hinged clasp that clicks shut.',
    materials: ['18k gold', '18 mm diameter, 4 mm thick', 'Hinged clasp'],
    metals: ['yellow', 'rose'],
    making: 'In stock — ships in 2 days',
  },
  {
    id: 'marea-bracelet',
    name: 'Marea bracelet',
    collection: 'Marea',
    category: 'bracelets',
    price: 980,
    line: 'An oval-link chain bracelet',
    photos: [{ key: 'bracelet', alt: 'A gold oval-link chain bracelet resting on the pages of an open magazine.' }],
    description: 'Oval links, each one formed and soldered by hand, with a toggle clasp that is easy to close on your own.',
    materials: ['18k gold', 'Links 9 mm', 'Toggle clasp'],
    sizes: { label: 'Length', options: ['16 cm', '17.5 cm', '19 cm'] },
    metals: ['yellow'],
    making: 'Made to order in 3 weeks',
  },
]

export const pieceById = (id: string) => pieces.find((p) => p.id === id)

export const CATEGORIES: { id: Category | 'all' | 'bridal'; label: string; photo?: string; focus?: string }[] = [
  { id: 'all', label: 'All jewellery' },
  { id: 'rings', label: 'Rings', photo: 'rings-dark', focus: '50% 60%' },
  { id: 'necklaces', label: 'Necklaces', photo: 'pendant-oval', focus: '50% 55%' },
  { id: 'earrings', label: 'Earrings', photo: 'hoops', focus: '40% 50%' },
  { id: 'bracelets', label: 'Bracelets', photo: 'bracelet', focus: '50% 50%' },
  { id: 'bridal', label: 'Bridal', photo: 'bands', focus: '50% 50%' },
]

export const inCategory = (c: string) => pieces.filter((p) => c === 'all' || (c === 'bridal' ? p.bridal : p.category === c))

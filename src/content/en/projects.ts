import type { ConceptSite } from '../types'

/**
 * Selected Work: four self-initiated concept websites for fictional
 * businesses (none is client work). The studio's own identity follows them,
 * not featured on the home page — it is linked from the Studio section.
 * Each has a working website at /work/<slug>/ (src/concepts/<name>/) and a
 * case study at /work/<slug>/case-study/. To add one:
 *   1. build the website in src/concepts/<name>/ and register it in src/concepts/load.ts,
 *   2. put its licensed photographs in tools/photos/<set>/ (sources.tsv lists
 *      each file's photographer and page) and run `python tools/photos/prepare.py <set>`,
 *   3. add its pages and sections to scripts/captures.mjs and run it against a
 *      preview build, then `npm run assets -- sites/ shots/ photos/<set>`,
 *   4. add its wordmark to tools/brand/wordmarks.py and run it,
 *   5. add an entry here with `preview: 'live-<slug>'`.
 *
 * Everything below describes what the websites actually contain. Photographs
 * inside the concepts are from Unsplash (Unsplash License); credits are
 * generated from the sources.tsv files and shown on each case study.
 */
export const sites: ConceptSite[] = [
  {
    slug: 'maison-aurel',
    title: 'Maison Aurel',
    sector: 'Fine jewellery · E-commerce',
    kind: 'Concept study',
    year: 2026,
    summary: 'An online boutique for a gold jeweller: a collection to filter, gold and size on every piece, a diamond ring to turn in 3D, a bag and a demo checkout.',
    intro: 'Gold, shaped by hand — an online atelier where the pieces carry the light, from the collection to a complete checkout.',
    tagline: 'Fine jewellery · 18k gold',
    showcase: { style: 'ring' },
    stage: '#0c0b09',
    ink: '#f3eee5',
    accent: '#c6a15b',
    palette: [
      { name: 'Ink', hex: '#0c0b09' },
      { name: 'Ivory', hex: '#f3eee5' },
      { name: 'Gold', hex: '#c6a15b' },
      { name: 'Pale gold', hex: '#e2c48a' },
      { name: 'Stone', hex: '#9a9184' },
    ],
    typefaces: [
      { name: 'Bodoni Moda', role: 'Display', sample: 'Gold, shaped by hand.' },
      { name: 'Jost', role: 'Text and interface', sample: 'Size 52 · Add to bag · 18k yellow gold' },
    ],
    preview: 'live-maison-aurel',
    previewAlt: 'The Maison Aurel concept website: stacked gold rings on a mirror beside the headline “Gold, shaped by hand.”',
    url: 'maison-aurel.concept',
    photoSet: 'aurel',
    cover: { key: 'rings-dark', alt: 'Two slim gold rings standing on a dark surface in a band of warm light.', focus: '50% 64%' },
    details: {
      brief:
        'A small jewellery house sells 18k gold pieces online and by private appointment. The website should feel as considered as the work, and make buying — or booking a visit — feel safe and personal on any screen.',
      direction:
        'A dark gallery: near-black pages, one warm light on the gold, and a high-contrast Didone serif with wide tracking for the house name. Gold is used for actions and fine rules only, so the pieces stay the brightest thing on the page.',
      scope: ['Art direction and identity', 'Collection, product pages and search', 'Bag and checkout', 'Appointment booking'],
      status:
        'Concept study for a fictional brand — not a client commission. Photographs are licensed from Unsplash (credits below); the Stella solitaire is a real-time 3D model, and its two stills are renders from it. Pieces, prices and materials are sample content. The website works: browse, filter, choose gold and size, turn the solitaire in 3D, use the bag and go through checkout — but there is no shop, stock or payment behind it, and the checkout says so.',
    },
    journeys: [
      { title: 'Buy a piece', steps: ['Open a category from the menu', 'Filter and sort the collection', 'Choose gold and size on the piece', 'Add to the bag and adjust it', 'Checkout: details, delivery, review', 'An honest demo confirmation'] },
      { title: 'Find something specific', steps: ['Search from the header', 'Results while typing', 'Straight to the piece'] },
      { title: 'Try it in person', steps: ['“Try in the atelier” from any piece', 'Choose the kind of visit', 'A day and a time', 'A sample request, nothing sent'] },
    ],
    decisions: [
      {
        title: 'Typography',
        text: 'Bodoni Moda for names and headlines, tracked wide in capitals for the brand; Jost for prices, sizes and navigation, so practical details stay quiet and legible.',
      },
      {
        title: 'Colour',
        text: 'Near-black ink and warm ivory, with gold only for actions and details — never as decoration. The checkout keeps the same palette, so the last step still feels like the house.',
      },
      {
        title: 'Imagery',
        text: 'Gold photographed close on dark or mirrored surfaces, a few pieces shown worn, and the bench itself — so the craft is as visible as the product.',
      },
      {
        title: 'Checkout',
        text: 'Three short steps with the order summary always in view; errors are explained next to the field; delivery options include collecting from the atelier. No card fields: a real shop would hand over to its payment provider.',
      },
    ],
    features: [
      { title: 'Home', text: 'The Ondine collection beside a full-height photograph, categories, the Stella solitaire in 3D, pieces worn, the atelier and new pieces.' },
      { title: 'Collection', text: 'Every piece with category filters kept in the address, and sorting by price.' },
      { title: 'A page for every piece', text: 'Photographs, gold and size options with prices, sizing help, delivery and returns, related pieces.' },
      { title: 'A diamond in 3D', text: 'The Stella solitaire turns in real-time 3D, ray traced in the browser: drag it, and it follows the gold you choose.' },
      { title: 'Bag and checkout', text: 'A bag that remembers its contents in the browser, quantities and removal, and a three-step demo checkout with an order summary.' },
      { title: 'Search and appointments', text: 'Search across the collection, and a request flow for visits in the atelier, bespoke work or video.' },
    ],
    responsive: [
      'On a phone the photograph leads, the headline follows, and actions become full-width buttons.',
      'The product page stacks image, options and details; the bag becomes a full-height drawer.',
      'In checkout the order summary folds into one line at the top, and the fields stack in a single column.',
    ],
    spotlights: [
      { shot: 'hero', title: 'A gallery, not a shop window', text: 'Half the first screen is the piece itself, lit like a vitrine; the copy is short and the promises are concrete.' },
      { shot: 'collection', title: 'Browse by piece', text: 'Categories as quiet chips above an even grid; the filter lives in the address, so a link to “rings” opens rings.' },
      { shot: 'product', title: 'Material first', text: 'Gold and size before anything else, with the price updating as you choose; the atelier appointment sits beside the bag.' },
      { shot: 'bag', title: 'A bag you can trust', text: 'The drawer repeats the gold and size of each piece, lets you change quantities, and is honest that nothing is ordered yet.' },
      { shot: 'checkout', title: 'Checkout without surprises', text: 'Details, delivery, review: the summary stays beside the form, and every choice is repeated before the final button.' },
    ],
    phones: [
      { shot: 'hero', caption: 'Opening screen' },
      { shot: 'product', caption: 'A piece' },
      { shot: 'checkout', caption: 'Checkout' },
    ],
    imagery: {
      text: 'Gold close and warm on dark, mirrored or textured surfaces; pieces worn on skin and fabric; the workshop bench. Never a busy background.',
      photos: [
        { key: 'rings-dark', alt: 'Two gold rings on a dark reflective surface.', focus: '50% 55%' },
        { key: 'pendant-oval', alt: 'A gold oval pendant on a textured surface.', focus: '50% 50%' },
        { key: 'layers-worn', alt: 'Layered fine gold necklaces worn with an open white shirt.', focus: '50% 38%' },
        { key: 'bench', alt: 'A jeweller working at a bench.', focus: '45% 40%' },
        { key: 'pearl-pendant', alt: 'A pearl pendant on a black surface.', focus: '50% 55%' },
      ],
    },
    implementation: {
      done: ['Art direction and identity', 'Home, collection (filter and sort) and a page for every piece', 'Gold and size options, search, and a bag kept in the browser', 'A three-step demo checkout with validation and an order summary', 'An appointment request flow'],
      next: ['A real payment provider, stock and order e-mails', 'Customer accounts and order history', 'Product photography from a real atelier'],
    },
    liveUrl: null,
  },
  {
    slug: 'lune',
    title: 'Lune Atelier',
    sector: 'Beauty salon · Booking and shop',
    kind: 'Concept study',
    year: 2026,
    summary: 'A hair, brow, lash and skin salon: treatments with prices, booking in three calm steps, and a shop for the products used in the treatment rooms.',
    intro: 'The art of quiet beauty — an editorial salon website where every page leads gently to an appointment, or to the shelf.',
    tagline: 'Hair · Brows · Lashes · Skin',
    showcase: {
      style: 'orbit',
      // how to choose a card is said once, under the ring (Orbit.tsx)
      note: 'Six parts of the website, as they appear on a phone, on a ring that turns faster as you scroll.',
      sections: [
        { shot: 'hero', label: 'Home', text: 'A beauty portrait, the next free slot and the four crafts.', path: '' },
        { shot: 'treatments', label: 'Treatments', text: 'Hair, brows, lashes and skin, each with its own specialist.', path: '#treatments' },
        { shot: 'signature', label: 'Signature treatment', text: 'The brow and lash edit: mapping, lamination and a lash lift in one sitting.', path: '#signature' },
        { shot: 'gallery', label: 'From the atelier', text: 'Colour work, brow maps and skin, from the treatment rooms.', path: '#gallery' },
        { shot: 'booking', label: 'Booking', text: 'A treatment, a free time and your details: three calm steps.', path: '#book' },
        { shot: 'shop', label: 'Shop', text: 'The products used in the treatment rooms, to take home.', path: 'shop/' },
      ],
    },
    stage: '#f6f0e9',
    ink: '#2a1d18',
    accent: '#9a5a48',
    palette: [
      { name: 'Porcelain', hex: '#f6f0e9' },
      { name: 'Sand', hex: '#ebe0d4' },
      { name: 'Rosewood', hex: '#9a5a48' },
      { name: 'Champagne', hex: '#cdb08a' },
      { name: 'Cocoa', hex: '#2a1d18' },
    ],
    typefaces: [
      { name: 'Cormorant Garamond', role: 'Display', sample: 'The art of quiet beauty.' },
      { name: 'Manrope', role: 'Text and interface', sample: 'Brow lamination & tint · 50 min · €65' },
    ],
    preview: 'live-lune',
    previewAlt: 'The Lune Atelier concept website: a beauty portrait of a woman with long dark hair in an arched frame beside the headline “The art of quiet beauty.”',
    url: 'lune-atelier.concept',
    photoSet: 'lune',
    cover: { key: 'portrait-hand', alt: 'A woman with long, glossy dark hair, her hand resting lightly against her face, in soft warm light.', focus: '46% 30%' },
    details: {
      brief:
        'A premium atelier offers hair, brows, lashes and skin treatments, and sells the products it uses. The website should feel calm and expert, show the actual craft, and turn browsing into a booked appointment or an order without the noise of typical beauty sites.',
      direction:
        'Editorial, like a beauty magazine printed on warm paper: a light, high-contrast serif at large sizes, generous white space, arch-shaped frames that echo a salon doorway, and photography of natural skin and real texture. Rosewood is the only strong colour, kept for emphasis.',
      scope: ['Brand identity and art direction', 'Treatments, prices and booking', 'Shop, product pages and checkout', 'Desktop and mobile layouts'],
      status:
        'Concept study for a fictional salon — not a client commission. Photographs are licensed from Unsplash (credits below); treatments, products, prices, times and guest notes are sample content. The website works — every treatment can be booked and every product bought — but nothing is sent, booked or charged, and every confirmation says so.',
    },
    journeys: [
      { title: 'Book a treatment', steps: ['Open one of the four crafts', 'Read the treatments and prices', 'Book from the treatment', 'Choose a day and a free time', 'Leave your details', 'A sample confirmation'] },
      { title: 'Buy a product', steps: ['Open the shop', 'Filter by skin, hair, brows or body', 'Choose a size and quantity', 'Review the bag', 'Checkout: details, delivery, review', 'A demo order, nothing charged'] },
      { title: 'The next free slot', steps: ['“Next available” in the first screen', 'Straight to your details'] },
    ],
    decisions: [
      {
        title: 'Typography',
        text: 'Cormorant Garamond, light and very large, gives the atelier an editorial voice; one word in each headline is set in italic. Manrope keeps prices, durations and buttons crisp at small sizes.',
      },
      {
        title: 'Colour',
        text: 'Porcelain and sand like skin in daylight, cocoa for text and actions, champagne for fine details. Rosewood appears only where something matters.',
      },
      {
        title: 'Imagery',
        text: 'Beauty portraits with natural skin, freckles and real texture, in soft warm light on warm backdrops; products photographed on sand, linen and stone with no labels to read. One warm grade makes photographs from different shoots read as one series.',
      },
      {
        title: 'Two ways to buy',
        text: 'Booking and the shop share the same calm patterns: the choice is always repeated on the button, and the bag and the booking panel both say plainly what will happen next.',
      },
    ],
    features: [
      { title: 'Editorial home', text: 'A beauty portrait in an arched frame, the next free slot, the four crafts, the signature treatment and the menu.' },
      { title: 'Treatments and prices', text: 'Each craft opens with its treatments, durations and prices; the menu filters by discipline.' },
      { title: 'Booking', text: 'Treatment, a sample calendar with free and taken times, details with validation, and a confirmation.' },
      { title: 'The shop', text: 'Eight products from the treatment rooms, filtered by category and sorted by price, each with its own page.' },
      { title: 'Bag and checkout', text: 'Sizes and quantities, free-delivery progress, and the three-step demo checkout.' },
    ],
    responsive: [
      'The portrait comes first on a phone; both actions become full-width buttons and “Book now” moves into the menu.',
      'The shop becomes two columns of arched product cards; the product page stacks photograph, sizes and details.',
      'The booking panel shows the week as one row of days and times three to a row, sized for thumbs.',
    ],
    spotlights: [
      { shot: 'hero', title: 'An opening that shows the craft', text: 'One beauty portrait carries skin, brows and hair at once; the first screen already answers “when can I come?”.' },
      { shot: 'treatments', title: 'Four crafts, one rhythm', text: 'Arched image cards give each discipline its own photograph and a single line of facts: what it is, how long, from what price.' },
      { shot: 'booking', title: 'Booking in three calm steps', text: 'Progress at the top, the chosen treatment repeated, unavailable times disabled, and the full choice on the final button.' },
      { shot: 'shop', title: 'A short shelf', text: 'Eight products, not eighty: category chips, a sort, and arched cards that match the treatment pages.' },
      { shot: 'product', title: 'Used in the room', text: 'Each product page links back to the treatment it is used in, so the shop and the salon support each other.' },
    ],
    phones: [
      { shot: 'hero', caption: 'Opening screen' },
      { shot: 'booking', caption: 'Booking' },
      { shot: 'product', caption: 'A product' },
    ],
    imagery: {
      text: 'Natural skin and real texture over polish: freckles, brows and hair in soft daylight, and products on sand, linen and stone.',
      photos: [
        { key: 'portrait-auburn', alt: 'A woman with auburn hair and freckles against a warm beige wall.', focus: '50% 30%' },
        { key: 'portrait-sunlight', alt: 'A woman with dark hair in warm evening light and leaf shadows.', focus: '50% 30%' },
        { key: 'portrait-brows', alt: 'Full, softly shaped brows, freckles and glowing skin.', focus: '50% 30%' },
        { key: 'hair-braid', alt: 'A loose, textured braid seen from behind.', focus: '50% 45%' },
        { key: 'product-balm-jar', alt: 'An open amber jar of balm on linen, from above.', focus: '50% 50%' },
      ],
    },
    implementation: {
      done: ['Brand identity and art direction', 'Home, treatments with prices, a filterable menu and a gallery', 'A three-step booking flow with a sample calendar', 'A shop with category filter, sort and a page for every product', 'A bag kept in the browser and a demo checkout'],
      next: ['Connection to a real booking calendar and reminders', 'A real payment provider and stock', 'Gift cards, and photography from a real salon'],
    },
    liveUrl: null,
  },
  {
    slug: 'anar',
    title: 'Anar Dining Room',
    sector: 'Restaurant · Reservations',
    kind: 'Concept study',
    year: 2026,
    summary: 'A Persian dining room by candlelight: a menu read course by course, and a reservation that answers the only question that matters — is there a table tonight?',
    intro: 'A table set for slow evenings — candlelight, saffron and a reservation in three taps.',
    tagline: 'Persian kitchen · Wood fire · Saffron',
    showcase: {
      style: 'assemble',
      note: 'The home page, the menu and the reservation, on a desktop and a phone.',
      sections: [
        { shot: 'hero', label: 'Home', text: 'The room by candlelight.', path: '' },
        { shot: 'menu', label: 'Menu', text: 'Course by course, with dietary filters.', path: 'menu/' },
        { shot: 'reserve', label: 'Reservations', text: 'Free times first, then seating.', path: '#reserve' },
      ],
    },
    stage: '#3b0e15',
    ink: '#f4ead8',
    accent: '#e0a532',
    palette: [
      { name: 'Pomegranate', hex: '#4a1019' },
      { name: 'Cream', hex: '#f4ead8' },
      { name: 'Saffron', hex: '#e0a532' },
      { name: 'Olive', hex: '#3f4a34' },
      { name: 'Ember', hex: '#24140f' },
    ],
    typefaces: [
      { name: 'Fraunces', role: 'Display', sample: 'A table set for slow evenings.' },
      { name: 'Inter', role: 'Text and interface', sample: 'Friday, 14 Nov · 2 people · 19:15' },
    ],
    preview: 'live-anar',
    previewAlt: 'The Anar concept website: a dining room under warm hanging lights with the headline “A table set for slow evenings.”',
    url: 'anar-dining.concept',
    photoSet: 'anar',
    cover: { key: 'tahdig', alt: 'Tahdig, the golden rice crust, with barberries and pistachio on a Persian tablecloth.', focus: '50% 50%' },
    details: {
      brief: 'Bring the atmosphere of an evening restaurant online and make booking effortless on a phone, for guests who decide where to eat the same day.',
      direction:
        'A soft serif with Persian warmth, a pomegranate and saffron palette, and photography that is all candlelight, copper and patterned cloth. The menu is set course by course like a short story; reservations show available times instead of a long form.',
      scope: ['Art direction', 'Home page and menu', 'Reservation interface', 'Mobile-first layouts'],
      status:
        'Concept study for a fictional restaurant — not a client commission. Photographs are licensed from Unsplash (credits below); dishes, prices and times are sample content. The website works: every dish opens, and the reservation flow works — but no table is held.',
    },
    journeys: [
      { title: 'Reserve a table', steps: ['“Reserve” from the top bar', 'Date and guests', 'An available time', 'Seating and details', 'A sample confirmation'] },
      { title: 'Read the menu', steps: ['Courses as anchors', 'Filter by diet', 'Open a dish for its story'] },
    ],
    decisions: [
      { title: 'Typography', text: 'Fraunces, a warm serif with soft curves, sets the headlines and dish names; italics carry the emphasis. Inter keeps times, prices and opening hours clear.' },
      { title: 'Colour', text: 'Deep pomegranate and cream, with saffron reserved for “Reserve” and tonight’s highlights. The darkest sections feel like the room after sunset.' },
      { title: 'Imagery', text: 'Tahdig, saffron rice, herbs and tea from the samovar, shot on patterned cloth and copper; the room appears by candlelight.' },
      { title: 'Reservations', text: 'Date, guests and occasion as three fields, then available times as buttons and seating as cards — one tap to “Reserve 19:15 for two”.' },
    ],
    features: [
      { title: 'Evening home', text: 'The room under warm lights, the kitchen, the menu, reservations, tea, the private room and a gallery.' },
      { title: 'The full menu', text: 'Every course with dietary filters and a view of every dish.' },
      { title: 'Reservations', text: 'Times, seating choices, details and a clear cancellation line.' },
    ],
    responsive: [
      'A “Reserve” button stays in the top bar on a phone, so booking is one tap from anywhere.',
      'The menu becomes a single column with each course clearly separated.',
      'Fields stack, times wrap three to a row and seating options become full-width cards.',
    ],
    spotlights: [
      { shot: 'hero', title: 'The room first', text: 'A full-bleed photograph of the room at night sets the mood before a word is read.' },
      { shot: 'menu', title: 'A menu read like a story', text: 'Each course with its own heading, dish names in Fraunces, prices in saffron, and filters for diet.' },
      { shot: 'reserve', title: 'Is there a table tonight?', text: 'Times as buttons, taken ones disabled; seating as cards; the full choice on the final button.' },
    ],
    phones: [
      { shot: 'hero', caption: 'Opening screen' },
      { shot: 'menu', caption: 'The menu' },
      { shot: 'reserve', caption: 'Reservation' },
    ],
    imagery: {
      text: 'Candlelight, copper and patterned cloth: dishes shot close and from above, tea in glass, and the room only in low, warm light.',
      photos: [
        { key: 'saffron-plate', alt: 'Saffron rice with chicken and side dishes on a copper plate.', focus: '50% 50%' },
        { key: 'samovar', alt: 'A brass samovar with a teapot and dried fruit.', focus: '40% 50%' },
        { key: 'spread-2', alt: 'A spread of Persian dishes on a patterned tablecloth.', focus: '50% 50%' },
        { key: 'tea-pour', alt: 'Tea poured from a silver pot into a glass.', focus: '50% 40%' },
        { key: 'room-candle', alt: 'A candle on a table in a dark dining room.', focus: '50% 60%' },
      ],
    },
    implementation: {
      done: ['Art direction and identity', 'Home page and the full menu, with dietary filters and a view of every dish', 'A reservation flow and a private-dining enquiry'],
      next: ['Connection to a real reservation system', 'Gift cards and online ordering', 'Photography from the real kitchen and room'],
    },
    liveUrl: null,
  },
  {
    slug: 'tensile',
    title: 'Tensile Athletic Club',
    sector: 'Fitness club · Memberships and classes',
    kind: 'Concept study',
    year: 2026,
    summary: 'A strength and conditioning club: memberships side by side, the week’s classes by day and coach, the coaches, and a free trial in four steps.',
    intro: 'Strength, coached — a club website built around three questions: what does it cost, when can I train, and who will coach me?',
    tagline: 'Strength · Conditioning · Mobility',
    showcase: {
      style: 'technique',
      // works on every device: no hover (phones cannot), and only the controls the module has
      note: 'The website in a browser and on a phone, and below it one part of it working live: the technique library. Choose a lift, drag to turn the figure, pause it or move it through the lift.',
      sections: [
        { shot: 'timetable', label: 'Timetable', text: 'The week by day, filtered by discipline and coach.', path: 'classes/' },
        { shot: 'compare', label: 'Memberships', text: 'Three plans side by side, monthly or yearly.', path: 'memberships/' },
        { shot: 'trial', label: 'Free trial', text: 'Goal, first session and details, in four steps.', path: 'trial/' },
      ],
    },
    stage: '#0e0f10',
    ink: '#f3f2ee',
    accent: '#ff5b1f',
    palette: [
      { name: 'Graphite', hex: '#0e0f10' },
      { name: 'Steel', hex: '#24272b' },
      { name: 'Chalk', hex: '#f3f2ee' },
      { name: 'Bone', hex: '#d8d5ce' },
      { name: 'Signal', hex: '#ff5b1f' },
    ],
    typefaces: [
      { name: 'Archivo Condensed', role: 'Display (Archivo at 62% width)', sample: 'STRENGTH, COACHED.' },
      { name: 'Archivo', role: 'Text and interface', sample: 'Barbell Club · Wed 17:30 · 4 places left' },
    ],
    preview: 'live-tensile',
    previewAlt: 'The Tensile Athletic Club concept website: an athlete setting up a deadlift under a single light, with the headline “Strength, coached.”',
    url: 'tensile.concept',
    photoSet: 'tensile',
    cover: { key: 'squat', alt: 'An athlete in a barbell back squat, in warm light on the training floor.', focus: '50% 40%' },
    details: {
      brief:
        'A strength and conditioning club with small, coached classes wants a website that converts curious visitors into trial members and keeps members coming back to the timetable. Prices and the schedule have to be readable on a phone, between sets.',
      direction:
        'Graphite and chalk with one signal orange, like paint on a gym floor; Archivo condensed to 62% for loud, compact headlines and at normal width for everything that has to be read. Photography is dark and spot-lit, so the effort reads before the words.',
      scope: ['Brand identity and art direction', 'Memberships and comparison', 'Timetable, classes and coaches', 'Free-trial and class booking flows'],
      status:
        'Concept study for a fictional club — not a client commission. Photographs are licensed from Unsplash (credits below); the coaches are fictional profiles shown with those photographs, and plans, prices and the timetable are sample content. Every booking, join and trial request works on the page and ends in a notice that nothing was sent.',
    },
    journeys: [
      { title: 'Try the club', steps: ['“Start a free trial” from any page', 'Choose a goal', 'A first class this week, or a 1:1 intro', 'Details and the health note', 'A sample confirmation'] },
      { title: 'Choose a membership', steps: ['Monthly or yearly prices', 'Compare every plan side by side', 'Join: a start date and details', 'A sample welcome, nothing charged'] },
      { title: 'Book a class', steps: ['Pick a day on the timetable', 'Filter by discipline or coach', 'Open the class: what to expect', 'Hold a place, or join the waitlist'] },
    ],
    decisions: [
      {
        title: 'Typography',
        text: 'One family, two widths: Archivo condensed for headlines, prices and class times — big without taking the whole screen on a phone — and at normal width for text and controls.',
      },
      {
        title: 'Colour',
        text: 'Graphite and chalk carry the page; signal orange marks the trial, the current day and how hard a class is. It never decorates.',
      },
      {
        title: 'Imagery',
        text: 'Dark, spot-lit training photographs with deep shadows and calmed blues, so twelve photographers read as one club. Coaches appear in black and white until you hover or focus them.',
      },
      {
        title: 'The timetable',
        text: 'One day at a time, with times as large numbers, places left in words and intensity as a five-step bar. Filters change the list in place; opening a class never leaves the page.',
      },
    ],
    features: [
      { title: 'Home', text: 'The promise, three disciplines, this week’s classes, plans, coaches and the trial in one scroll.' },
      { title: 'Memberships', text: 'Three plans with a monthly or yearly price, a comparison table, questions, and a join flow.' },
      { title: 'Timetable and classes', text: 'The week by day with discipline and coach filters, every class in detail, and holding a place.' },
      { title: 'Coaches', text: 'Four fictional coach profiles with what they teach, when, and a free intro to book.' },
      { title: 'Free trial', text: 'A four-step request: goal, first session, details, confirmation — preselected when you arrive from a class or a coach.' },
    ],
    responsive: [
      'The navigation folds into a full-height menu with the trial as the last, largest action.',
      'Each timetable row becomes time, class and places in two lines, with the details button always within thumb reach.',
      'The comparison table keeps all three plans in view at 390 px, with the features as the first column.',
    ],
    spotlights: [
      { shot: 'hero', title: 'The promise, in two words', text: 'A spot-lit deadlift and a condensed headline carry the first screen; the facts below it answer the first three questions a newcomer has.' },
      { shot: 'timetable', title: 'A timetable for thumbs', text: 'Days as large tabs, filters in place, and every class with its time, coach, intensity and places left in one row.' },
      { shot: 'class', title: 'What to expect', text: 'A class opens over the timetable with its photograph, the structure of the hour, what to bring — and a place to hold.' },
      { shot: 'compare', title: 'Plans side by side', text: 'Three plans, nine rows, no small print: the most chosen plan is outlined in signal orange, and yearly billing updates every price.' },
      { shot: 'trial', title: 'A trial in four steps', text: 'Goal, first session, details, done. Arriving from a class or a coach fills in the first choice.' },
    ],
    phones: [
      { shot: 'hero', caption: 'Opening screen' },
      { shot: 'timetable', caption: 'Timetable' },
      { shot: 'compare', caption: 'Memberships' },
    ],
    imagery: {
      text: 'Dark, spot-lit and close: chalk, grips, bars and breath, with deep shadows and calmed blues. Effort before polish.',
      photos: [
        { key: 'grip', alt: 'Hands gripping a barbell, close up.', focus: '45% 40%' },
        { key: 'kettlebell-chalk', alt: 'A chalked hand gripping a kettlebell.', focus: '50% 50%' },
        { key: 'chalk-barbell', alt: 'A woman chalking her hands beside a loaded barbell.', focus: '55% 35%' },
        { key: 'racks-window', alt: 'Squat racks beside tall windows.', focus: '50% 40%' },
        { key: 'mobility', alt: 'A woman in a back bend on a mat in a wood-panelled room.', focus: '50% 60%' },
      ],
    },
    implementation: {
      done: ['Brand identity and art direction', 'Home, memberships with a comparison table, timetable, classes and coaches', 'Day, discipline and coach filters; class details and holding a place', 'Join and free-trial flows with validation and honest confirmations'],
      next: ['Connection to a real booking and membership system', 'Payments and member accounts', 'Real coaches, photography and timetable'],
    },
    liveUrl: null,
  },
  {
    slug: 'p-design',
    own: true,
    featured: false,
    title: 'P. DESIGN',
    sector: 'Studio identity · Website',
    kind: 'Studio brand',
    year: 2026,
    summary: 'The studio’s own identity and this website: a redrawn pd monogram, a quiet palette with one accent, a single composed hero image, and brand guidelines you can use.',
    intro: 'One mark, one accent, and room to work — the studio’s identity, and the website it lives on.',
    tagline: 'Identity · Website · Guidelines',
    stage: '#101315',
    ink: '#f2f0e9',
    accent: '#c5f05c',
    palette: [
      { name: 'Charcoal', hex: '#101315' },
      { name: 'Midnight', hex: '#202831' },
      { name: 'Ivory', hex: '#f2f0e9' },
      { name: 'Stone', hex: '#bdb8af' },
      { name: 'Lime', hex: '#c5f05c' },
    ],
    typefaces: [
      { name: 'Geist', role: 'Text, headings and interface', sample: 'Digital experiences, beyond the ordinary.' },
      { name: 'Instrument Serif', role: 'One word of emphasis', sample: 'beyond the ordinary.' },
    ],
    preview: 'live-p-design',
    previewAlt: 'The P. DESIGN brand guidelines: the pd monogram with its construction lines on charcoal.',
    url: 'pouyapd.github.io/work/p-design',
    photoSet: 'pdesign',
    cover: { group: 'hero', key: 'portal', alt: 'The studio’s hero image: a monumental stone gateway in still water at sunset, the sun low in its arch, a small figure on a long walkway.', focus: '66% 50%' },
    details: {
      brief:
        'An independent studio for brand-led websites needed an identity that works from a 16-pixel browser tab to a full screen, and a website that shows both visual direction and the ability to build working products — without turning into a gallery of effects.',
      direction:
        'Quiet and exact. A charcoal ground, ivory type and a single monogram; lime kept for the one thing to do on each screen. The hero is one composed image with the words on its dark side and almost no motion. The work is shown as websites you can actually use.',
      scope: ['Monogram and favicon', 'Palette, type and usage rules', 'Hero art direction and layout', 'Studio website and brand guidelines'],
      status:
        'The studio’s own brand and website: real, not a concept for a client. The hero image is used as the studio supplied it, without retouching or added elements. The four projects in Selected Work are clearly labelled; three of them are fictional brands.',
    },
    journeys: [
      { title: 'A visitor with a project', steps: ['The hero: what the studio does', 'Selected Work: four projects', 'Open a website and use it', 'Read how it was designed', '“Start a project” — a pre-filled e-mail'] },
      { title: 'Someone checking the brand', steps: ['The guidelines from the case study', 'Test the mark at any size', 'Copy a colour, check its contrast', 'Download the logo files'] },
    ],
    decisions: [
      {
        title: 'The monogram',
        text: 'The monogram is redrawn as flat vector geometry from the studio’s reference design: one ribbon through two round bowls, the other two arcs passing under it. Stroke, bowl size, stem lengths and the slant of the stem ends are measured from the reference. The p is ivory and the d takes the lime of the primary button, changing colour at the waist; a heavier one-colour cut without the gaps keeps it legible as a 16 px favicon.',
      },
      {
        title: 'One accent',
        text: 'Lime marks the primary action, focus rings, the favicon tile and the d of the monogram, and nothing else. Five neutrals carry the rest, and every text pair is measured for contrast.',
      },
      {
        title: 'The hero image',
        text: 'One composed image rather than a scene built from parts: the gateway and the sun on the right, the open, dark sky on the left for the words. Phones get a crop of the same image that keeps the figure, the arch and the sun. The only motion is a slow settle on arrival; with reduced motion there is none.',
      },
      {
        title: 'Work you can use',
        text: 'Instead of screenshots, each project is a working website with its own identity, flows and honest notices, plus a case study that explains the decisions.',
      },
    ],
    features: [
      { title: 'The home page', text: 'Hero, Selected Work, services, approach, the studio and contact, in that order and nothing more.' },
      { title: 'Brand guidelines', text: 'The mark and its construction, a live size tester, colours you can copy, measured contrast, type and usage rules.' },
      { title: 'Logo files', text: 'Plain SVG generated from one set of measurements, with the favicon and app icons rasterised from them.' },
      { title: 'Four projects', text: 'Three concept websites and this one, each with a case study.' },
    ],
    responsive: [
      'On a phone the hero uses a crop of the same image — the figure, the arch and the sun — with the headline and the enquiry below it, over the water.',
      'The guidelines’ contents become a wrapping row of links; testers stack their controls under the preview.',
      'Project cards keep both actions visible without scrolling inside the card.',
    ],
    spotlights: [
      { shot: 'hero', title: 'One image, one action', text: 'The gateway on the right, the headline on the dark left, and a single lime button: start a project.' },
      { shot: 'work', title: 'Work first', text: 'Selected Work follows the hero directly: four projects, each with its identity, its category and two clear ways in.' },
      { shot: 'mark', title: 'The mark, measured', text: 'The guidelines show the construction — two circular bowls, one stroke at the waist, the stems — and let you test the mark at any size and on any ground.' },
      { shot: 'colour', title: 'Colour you can check', text: 'Swatches copy their value; the contrast of every text pair is calculated on the page, not claimed.' },
      { shot: 'lime', title: 'Lime has one job', text: 'Right and wrong side by side: one lime action and everything else neutral, against a page where lime has lost its meaning.' },
    ],
    phones: [
      { shot: 'hero', caption: 'Opening screen' },
      { shot: 'work', caption: 'Selected Work' },
      { shot: 'mark', caption: 'Brand guidelines' },
    ],
    imagery: {
      text: 'One composed image instead of a collage: a monumental gateway, the sun in its arch and a small figure for scale.',
      photos: [],
    },
    implementation: {
      done: ['A redrawn monogram, favicon and app icons', 'The studio website: home page, four projects and their case studies', 'A hero built around one image, with a phone crop and a still version for reduced motion', 'Brand guidelines with live testers and the logo files'],
      next: ['Client projects in Selected Work as they launch', 'A Persian version of the website', 'A custom domain'],
    },
    liveUrl: null,
  },
]

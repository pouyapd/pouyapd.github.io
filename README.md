# P. DESIGN — studio website

The website of P. DESIGN, an independent studio that designs and builds premium websites: brand-led marketing sites, e-commerce, and websites for service businesses, with motion and 3D where they help.

Home page order: **Header → Hero → Selected Work → Services → Approach → Studio → Contact → Footer.** The header links to each of the five sections, plus **Start a project** (Contact). Each project in Selected Work is a working website at `/work/<slug>/`, with a case study at `/work/<slug>/case-study/`.

It is a static site built with **React 19, TypeScript and Vite 8**. Every page is **prerendered to HTML at build time** and then hydrated, so it can be crawled, loads fast, and still works with JavaScript turned off. It needs no server and is set up for **GitHub Pages**.

**Imagery.** The hero image is the studio's own, supplied by the owner and used as supplied (`tools/hero/sunset-portal.png`, see `tools/hero/README.md`): a monumental stone gateway in still water at sunset, a small figure on the walkway. The photography inside the concept websites (jewellery, beauty, fitness, restaurant) is from **Unsplash, under the Unsplash License** — every file, photographer and page is listed in `tools/photos/<set>/sources.tsv` and credited on each case study; see `tools/photos/README.md`. Photos posted by brand accounts are not used.

Everything else is original and made for this project: the websites themselves (`src/concepts/`), the logo files (`tools/brand/make_logo.py`, redrawn from the owner's monogram reference `tools/brand/reference-monogram.png`) and the wordmarks (`tools/brand/wordmarks.py`).

## Before you deploy

1. Contact details are set in `src/config/site.ts`: `contact.email` and `site.social` (GitHub, LinkedIn). Change them there only; the contact section, footer, mailto links and JSON-LD all read from it.
2. Run `npm run check`. It fails the build if the email or a social link is missing from the page, if a social link lacks `target`/`rel`, or if developer text ever reaches the public HTML.

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173 (client-rendered dev server)
npm run build      # production build in dist/ (typecheck → build → SSR prerender)
npm run preview    # serve dist/ at http://localhost:4173
npm run check      # lint + build + dist verification (what CI runs)
```

Node 20.19+ (or 22+) is required.

| Script | What it does |
| --- | --- |
| `npm run lint` | ESLint (TypeScript + React hooks rules) |
| `npm run typecheck` | `tsc -b` for app and config |
| `npm run check` | lint, build, then `scripts/check-dist.mjs`. It checks every local `src`/`href`/`srcset`/CSS `url()` under the base path, in-page anchors, metadata, sitemap, one `<h1>`, image `alt`s, honest labels on every project page, and that key content is in the static HTML |
| `npm run test:e2e` | browser tests of the **built** site in your installed Chrome (`tests/e2e/`, run `npm run build` first; starts `vite preview` itself): navigation and the mobile menu, contact actions, the four project presentations (Lune ring, Anar assembly, Aurel ring, Tensile lifts and controls), every page at 320/390/1440 px, the home page at eleven sizes, search metadata, and axe-core WCAG 2.2 A/AA checks |
| `npm run render:gateway` | the earlier Blender scene (`tools/scene/`), no longer used on the site; kept for reference (needs Blender on the PATH) |
| `npm run photos` | grade the licensed photographs (`tools/photos/prepare.py [set]`) → `tools/photos/<set>/out/` |
| `npm run brand` | regenerate the logo SVGs and favicon (`make_logo.py`) and the wordmarks (`wordmarks.py`) |
| `npm run render:stella` | the two product stills of Maison Aurel's Stella solitaire, rendered by the same real-time shader the site runs → `tools/photos/aurel/out/stella-*.jpg` (uses your installed Chrome with its GPU; then `npm run assets`) |
| `npm run captures` | capture the **built** websites (whole pages and case-study sections) → `tools/captures/out/` (run after `npm run build`; uses your installed Chrome) |
| `npm run render:lifts` | a still of each lift from Tensile's technique module, rendered by the same shader → `public/media/lifts/<lift>-<width>.webp`. The module shows it until the live figure is drawn (the shader can take seconds to compile on a first visit). Uses your installed Chrome with its GPU |
| `npm run og` | render the social cards: the studio's `tools/og/og-card.png`, and one per featured project, `tools/og/og-<slug>.png` (its colours, name, captures and the label "Concept website by P. DESIGN"; used by that project's website pages and case study). Uses your installed Chrome; then `npm run assets -- og/` writes `public/og-image.jpg` and `public/og/<slug>.jpg` without touching the other media |
| `npm run assets` | convert the hero image, captures and photos to responsive AVIF/WebP; icons, the social avatar and `og-image.jpg`. `npm run assets -- hero/ sites/live` rebuilds only those outputs |

---

## Where things live

```
src/
  config/
    site.ts           ← name, description, CONTACT EMAIL, GitHub/LinkedIn, brand file paths
    deployment.ts     ← how SITE_URL becomes the base path (read by vite.config.ts)
  content/
    en/index.ts       ← all page copy (hero, work, services, approach, studio, contact, footer…)
    en/projects.ts    ← Selected Work: the projects (cards, case studies, journeys; data only)
    generated/media.json  ← written by `npm run assets` (sizes, blur placeholders)
    generated/wordmarks.json ← written by tools/brand/wordmarks.py (project names as outlines)
    types.ts          ← the content shape every locale must follow
  styles/
    tokens.css        ← COLOURS, type scale, spacing, motion, radii, z-layers
    base.css          ← reset, utilities, scroll-reveal states
  components/
    layout/           ← SiteHeader, SiteFooter
    navigation/       ← MobileMenu (<dialog>), active-section tracking
    sections/         ← Hero, Work, Services, Studio.tsx (Approach + Studio), Contact
      work/           ← the four project presentations: Classic, Orbit, Assemble, TechniqueCase (+ parts.tsx)
    project/          ← ProjectPage: the case study, /work/<slug>/case-study/
    motion/           ← reveal-on-scroll, in-view, pointer tilt, reduced-motion helpers
      lab/            ← the real-time 3D: gl.ts (one shader, a loop that runs only on screen),
                        solitaire.ts (Maison Aurel's ray-traced diamond ring), lifts.ts (Tensile's
                        lift demonstrations), useSolitaire.ts / useLifts.ts (load them when near)
      useScrollProgress.ts ← scroll-linked compositions (writes transforms; never takes over scrolling)
    ui/               ← Button, Logo, Wordmark, Icon, SectionHeader, ResponsiveImage, DeviceFrames, PagePreview
  concepts/           ← the WEBSITES themselves, each its own chunk and identity:
    aurel/  lune/  tensile/  pdesign/  anar/   ← <Name>.tsx (pages + interactions), data.ts, <name>.css (scoped)
    shared/            ← cart.ts (the bag, in localStorage), Checkout (the demo checkout), Dialog, Photo, links, the "nothing is sent" notice
    ConceptFrame.tsx   ← the slim P. DESIGN bar above every project page (back to the portfolio, honest label)
  app/App.tsx + routes.ts (home, work/<slug>/…, work/<slug>/case-study, 404), main.tsx (loads a project's chunk, hydrates), entry-server.tsx (prerender + <head> per route)
public/
  brand/              ← logo.svg / logo-ink.svg (the pd mark), pd-mark*.svg (same), pd-icon.svg, pd-avatar-1024.png (generated)
  media/              ← optimised hero, photographs and captures (generated, committed)
tools/hero/           ← sunset-portal.png, the hero image as supplied (the source for media/hero/)
  favicon.svg, icons, og-image.jpg
scripts/              ← prerender, dist check, asset pipeline, captures, OG card
tools/scene/          ← gateway.py, grade.mjs: the earlier Blender hero (no longer used), sky/ (its HDRI, not committed)
tools/captures/       ← captures of the built websites (scripts/captures.mjs; out/ is not committed)
tools/photos/         ← licensed photographs (Unsplash), sources.tsv credits, prepare.py
tools/brand/          ← make_logo.py (the identity), reference-monogram.png (the owner's reference), wordmarks.py, legacy/ (earlier logo files)
tools/legacy/         ← retired pieces (the WebGL hero, the screens stage, the service demos, the Blender hero media and its water shader), kept for reference, not built
tools/mockups/        ← the original static mockups of the first three concepts
.github/workflows/deploy.yml
```

Content, presentation and motion are kept apart: copy lives in `src/content`, design decisions in `src/styles/tokens.css`, and animation in CSS, three small hooks (`reveal.ts`, `useInView`, `useTilt`) and the hero's motion layer. No animation or 3-D library is used.

---

## Common changes

**Contact email.** `contact.email` in `src/config/site.ts`. It is shown in the contact section and the footer. The email link opens the visitor's mail app with a subject line and a short brief template (`contact.emailBody` in `content/en/index.ts`). The "Copy address" button is for visitors without a mail app.

**Social links.** `site.social` holds `{ label, href, icon }` items (`icon` is `'github'` or `'linkedin'`; add more glyphs in `components/ui/Icon.tsx`). They appear in the contact section and footer, open in a new tab with `rel="noopener noreferrer"`, and their accessible name says so. They are also the JSON-LD `sameAs`. Only add profiles that exist.

**Copy.** Edit `src/content/en/index.ts`.

**Selected Work.** The four commercial concept websites, each in its own colours and typeface, with the same two actions — **Explore the website** and **View case study** — but each presented in its own way (`showcase` in `projects.ts`; components in `src/components/sections/work/`):

- **Maison Aurel — ring.** The website leads: a large browser and a phone. The Stella solitaire, the same real-time model as on its product page, is the accent beside them — smaller, standing in the card's own light with no frame round it, turning slowly while its metal moves between warm yellow, champagne and pale gold (`tones` in `motion/lab/solitaire.ts`). No price is shown.
- **Lune Atelier — orbit.** Six parts of the website — home, treatments, the signature brow and lash treatment, the gallery, booking and the shop — each a complete phone capture (cards have the capture's own 390 × 844 proportions), turn slowly round one axis. Scrolling adds to the speed, eased, within a limit; the ring settles back when the scroll stops. Clicking, tapping or pressing Enter on a card brings it to the front, moderately larger, with the others behind; when the page scrolls on, the card eases back into the ring and the ring turns again (Escape does the same). The section's name, a line and **Open this page** sit below, with plain links to all six.
- **Anar Dining Room — assemble.** The composition is held on screen (`position: sticky`) for about three screens of scroll: the scattered desktop and phone captures of the home page, the menu and the reservation stay still to be looked at, then slide together one after another into the screens of a browser and a phone, the screens appear, and the finished picture holds. Progress follows the scroll both ways, eased (`useScrollProgress` with `ease`). Positions are container units (`cqw`), one set for wide screens and one for phones.
- **Tensile Athletic Club — technique.** The website itself — the home page in a browser (hover to glide through it), the timetable on a phone, and the timetable, memberships and free-trial pages — and, below, its technique module live in a browser frame with the 3D lifts and their controls. The module, its code and its typeface load only when it comes near the screen.

With reduced motion the Lune ring does not turn on its own (a chosen card still comes forward), the Anar assembly is shown finished and not held, the ring holds one frame, and the lifts hold still until Play. Without JavaScript the Lune cards are a grid and the Anar assembly is shown finished. `featured` in `projects.ts` decides what is shown, the array order decides where.

- **Maison Aurel** — fine-jewellery e-commerce (`/work/maison-aurel/`, `/collection/`, `/pieces/<id>/`, `/checkout/`): collection with category filter and sort, a page per piece (gold and size options with prices, sizing, delivery), search, a bag kept in the browser, a three-step demo checkout, and an appointment request. The Stella solitaire (a diamond ring) also turns in real-time 3D, on the home page and on its own page, in the gold you choose.
- **Lune Atelier** — beauty salon and shop (`/work/lune/`, `/shop/`, `/shop/<id>/`, `/checkout/`): treatments for hair, brows, lashes and skin with prices, a filterable menu, a three-step booking on a sample calendar, and a shop of eight products with filter, sort, product pages, bag and demo checkout.
- **Anar Dining Room** — restaurant (`/work/anar/`, `/menu/`): an evening home page (the room, the kitchen, tea, the private room, a gallery), the full menu by course with dietary filters and a view of every dish, and a reservation flow with free times and seating.
- **Tensile Athletic Club** — fitness club (`/work/tensile/`, `/classes/`, `/memberships/`, `/coaches/`, `/trial/`): memberships with monthly or yearly prices and a comparison table, the timetable by day with discipline and coach filters, class details and holding a place, coach profiles (fictional, labelled), joining, and a four-step free-trial request. A **technique library** on the home page (`/work/tensile/#technique`, `src/concepts/tensile/Technique.tsx`) shows the back squat, the bench press and the deadlift on a 3D demonstration figure: choose a lift, drag to walk round it, pause it or move it through its range, with the coaching cues beside it. The movement is computed from adult segment lengths and the rules a coach checks (bar over the middle of the foot, depth, bar path), with inverse kinematics for knees and elbows — `components/motion/lab/lifts.ts`, one ray-marched shader, no model files or library. It is labelled as a simplified figure.
**P. DESIGN** — the studio's own identity (`/work/p-design/`, with a case study) is not one of the commercial projects, so it is not in Selected Work: the Studio section links to it. It holds interactive brand guidelines (the monogram and its construction, a size tester, colours that copy, measured contrast, type tester, lime rules, components, files).

Every form ends in an honest confirmation: nothing is sent, booked, ordered or charged; checkouts ask for no card details. Every project page carries the P. DESIGN bar (back to the portfolio, an honest label, the case study). Each website's CSS and fonts load only on its own pages (`scripts/prerender.mjs` links them from Vite's manifest).

The case study is driven by `src/content/en/projects.ts` → `sites`: kind, sector, summary, colours, palette, typefaces, brief, direction, **key journeys**, decisions, section shots and phone screens (from `npm run captures`), photography and an honest status. To add a project: build it in `src/concepts/<name>/` (export `concept` with its `paths`), register it in `src/concepts/load.ts`, add its photos to `tools/photos/<set>/`, its pages and sections to `scripts/captures.mjs`, its wordmark to `tools/brand/wordmarks.py`, and an entry in `sites`.

**Services.** Four services in `content/en/index.ts` → `services.items`. Those with an `image` (a capture from `media.json → shots`) are cards side by side, under a real page from the project that does it; the others (websites for service businesses, motion and 3D) follow as text entries, so Selected Work's pictures are not repeated. Each has two lines on what it is for, what it `includes`, and links to the `examples`.

**Motion and 3D** is presented as a service, not as a demo gallery on the home page. The live work sits where it belongs: Maison Aurel's Stella solitaire turns in real-time 3D on its home page, its own page and its portfolio presentation (ray traced in WebGL — a 57-facet brilliant with refraction, internal reflections and dispersion; drag, hover, three golds; `components/motion/lab/`, no library, loaded only when near, drawn only while on screen), on Lune Atelier's product pages the price rolls to the size you choose, and Tensile's technique library turns its lifts in 3D (shown live in the portfolio, too).

**Colours.** Edit the palette at the top of `src/styles/tokens.css` (`--c-charcoal`, `--c-ivory`, `--c-stone`, `--c-lime` …). The studio uses one accent, lime, only where it means "act here": the primary call to action, the contact email, the skip link, focus rings and the favicon tile — and, as part of the identity, the d of the monogram. Never for headlines, icons or decoration. Components only use the semantic tokens below it.

**Typography.** The site's fonts are bundled from npm (`@fontsource-variable/geist`, `@fontsource/instrument-serif`) and imported in `src/styles/index.css`. Each website's typefaces (Bodoni Moda and Jost; Cormorant Garamond and Manrope; Archivo, condensed through its width axis; Fraunces and Inter) are imported in its own CSS and load only on its pages. They are served from your own domain, never a font CDN. The type scale is `--step-*` in `tokens.css`.

**Logo and favicon.** The identity is the owner's **pd monogram** (reference: `tools/brand/reference-monogram.png`), redrawn as flat vector geometry measured from the reference: one ribbon up the p's stem, over its bowl, through the waist and round the d to its stem, with the other two arcs passing under it (a gap of 0.3 stroke). Two circular bowls one stroke wide where they meet, stems flush with their outer edges and cut at the same slant, the ascender taller than the descender. Each letter is one outline of arcs and lines in flat colour: the p ivory and the d lime (`#C5F05C`, the primary button's colour) on dark; the p charcoal and the d a deeper lime (`#6E8F1A`, 3.3:1 on ivory) on light. The colour changes at the waist, where the bowls meet on the centre line; the d reaches 0.5 unit under the p there so no seam shows. No gradients, glows, shadows or metal finish; the reference's dark ground and "P. DESIGN" lettering are presentation, not part of the mark. The favicon is a heavier cut with shorter stems and no gaps on the lime tile, for 16–32 px. Earlier marks are kept in `tools/brand/legacy/`. All files come from `tools/brand/make_logo.py` (one set of measurements; edit it and run `npm run brand`; it also writes `src/concepts/pdesign/mark.json` for the brand guidelines page):

| File | Use |
| --- | --- |
| `brand/logo.svg` · `brand/logo-ink.svg` | the mark, on dark (ivory + lime) · on light backgrounds (charcoal + deep lime) |
| `brand/pd-mark.svg` · `brand/pd-mark-ink.svg` | the same mark under its earlier file names |
| `brand/pd-icon.svg` | app / social profile icon (charcoal tile, safe for a circular crop) |
| `favicon.svg` | small-size cut on the lime tile, one colour (charcoal) |
| `brand/pd-avatar-1024.png` | generated by `npm run assets`; upload it as the GitHub / LinkedIn picture |

After changing the logo, run `npm run assets` (PNG icons) and `npm run og` (social card).

---

## The hero

One image, used as supplied (`tools/hero/sunset-portal.png`, 1672 × 941): a monumental stone gateway in still water at sunset, the sun in the arch, a small figure on a long walkway. The gateway stays on the right; the headline, the supporting line and the two actions sit on the dark sky on the left, with only a light shade behind them (`hero.css`).

`npm run assets -- hero/` makes the web versions: the whole image at 960, 1280 and 1672 px (never enlarged), and for phones held upright a crop of the same image (x 740–1420 px: the figure, the arch, the sun) at 480 and 680 px, so phones download only that part. `src/components/sections/Hero.tsx` serves them through `<picture>` with a blurred inline copy as placeholder, and the server preloads the one that matches the screen. On landscape screens and tablets the image fills the hero (`object-fit: cover`, framing set per aspect ratio so the figure stays clear of the copy); on phones it is a band at the top with the copy below it, over the water.

Motion: the image settles once, very slowly (scale 1.035 → 1 over 22 s, transform only), then stays still; with reduced motion nothing moves. On screens wider than about 1700 px (or high-density screens) the browser scales the 1672 px image up; a larger original can replace the file under the same name — then add widths in `scripts/build-assets.mjs`.

---

## Deploying to GitHub Pages

1. Create a GitHub repository and push this project to its `main` branch.
2. In the repository: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main` (or run the workflow from the **Actions** tab). The workflow (`.github/workflows/deploy.yml`) runs `npm ci` and `npm run check`, then publishes `dist/`.

The site will be at `https://USERNAME.github.io/REPOSITORY/`.

**How the URL is handled.** Everything URL-related comes from one value, `SITE_URL`: base path, asset URLs, canonical, Open Graph URLs, sitemap, robots.txt, and the manifest's `start_url`. In CI it is filled in from `actions/configure-pages`, so the repository URL works without any edits. Locally it defaults to `http://localhost:4173/`. To build for a specific address:

```bash
SITE_URL=https://USERNAME.github.io/REPOSITORY/ npm run build   # → base "/REPOSITORY/"
SITE_URL=https://www.example.com/ npm run build                 # → base "/"
```

(On Windows PowerShell: `$env:SITE_URL="https://…/"; npm run build`.)

**A deployment build cannot publish `localhost`.** In CI (`CI` is set by GitHub Actions), or locally with `PRODUCTION=1`, `npm run check` fails if the canonical URL is still `localhost`, so canonical, Open Graph, sitemap and manifest can never go out pointing at a local address.

**Routes on GitHub Pages.** Every page is prerendered to its own `…/index.html`, so direct visits and reloads of nested pages (`/REPOSITORY/work/anar/menu/`) are plain static files: no server rewrites or SPA fallback are needed. Pages redirects a folder without its trailing slash to the slash, and serves `404.html` (with a 404 status) for anything else; the 404 page uses absolute, base-path URLs, so it renders correctly at any depth. The `.nojekyll` file keeps Pages from running Jekyll over the output.

### This site: `https://pouyapd.github.io/`

It is deployed as the GitHub **user site** (repository `pouyapd/pouyapd.github.io`, branch `main`, Pages source: GitHub Actions), so it lives at the root: base path `/`, `SITE_URL` `https://pouyapd.github.io/` (filled in by the workflow). Project sites of the same account keep their own paths (`https://pouyapd.github.io/GroundedAI/`); a project repository named like one of this site's folders (`work`, `media`, `assets`, `brand`, `og`) would take that path over, so don't create one.

### Moving to a custom domain (planned: `pdesign.studio`)

Nothing below has been done; it needs the domain to be bought first.

1. **Verify the domain for the account first** (GitHub → Settings → Pages → *Add a domain*, a TXT record), so no one else can claim it on GitHub.
2. **DNS** at the registrar — apex `pdesign.studio`: `A` records `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (and `AAAA` `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`); `www`: `CNAME` to `pouyapd.github.io`. Remove any other A/ALIAS records for the apex.
3. **Repository → Settings → Pages → Custom domain:** `pdesign.studio`. With the GitHub Actions source no `CNAME` file is needed (GitHub ignores it); the setting lives in the repository. Wait for the DNS check, then tick **Enforce HTTPS** once the certificate is issued (can take up to a day).
4. **Re-run the workflow.** `configure-pages` then reports the custom domain, so canonical, Open Graph, sitemap, robots.txt and manifest all switch to `https://pdesign.studio/` — no code changes. (Or pin it with the repository variable `SITE_URL=https://pdesign.studio/`.)
5. **Redirects:** GitHub redirects `pouyapd.github.io/...` to the custom domain, path kept. Note that a custom domain on a *user* site also moves the account's project sites without their own domain: GroundedAI would be served at `https://pdesign.studio/GroundedAI/`.
6. **Search Console:** add `pdesign.studio` as a Domain property (DNS verification), submit `https://pdesign.studio/sitemap.xml`, and keep the old property; the redirects carry existing links over.


1. Buy the domain and add the DNS records GitHub documents for Pages (an `A`/`AAAA` set for an apex domain, or a `CNAME` to `USERNAME.github.io` for `www`).
2. **Settings → Pages → Custom domain:** enter the domain, wait for the DNS check, and tick **Enforce HTTPS**.
3. Re-run the workflow. `configure-pages` now reports the custom domain, so the base path becomes `/` and canonical/OG URLs use the domain. **No code changes are needed.** To pin the URL explicitly, add a repository variable `SITE_URL` (Settings → Secrets and variables → Actions → Variables), e.g. `https://www.example.com/`. It overrides the detected value.

**robots.txt on a project site.** Crawlers only read `robots.txt` at the root of a host. On `https://USERNAME.github.io/REPOSITORY/` the generated `/REPOSITORY/robots.txt` is ignored; the host's root `robots.txt` belongs to the `USERNAME.github.io` repository (if you have one), not to this project. Nothing here needs blocking, so no rule is required: crawlers find the pages through their links. To make the sitemap known, submit `https://USERNAME.github.io/REPOSITORY/sitemap.xml` in Google Search Console (a URL-prefix property for the project URL), or add a `Sitemap:` line to the root `robots.txt` of your `USERNAME.github.io` repository. With a custom domain the generated `robots.txt` sits at the root and counts on its own.

### Other static hosts (Netlify, Cloudflare Pages, Vercel, any web server)

Build command `npm run build`, output directory `dist`, environment variable `SITE_URL=https://your-domain/`. The site uses no server features. `404.html` is generated for hosts that support it.

---

## Security

The site is static: no server, no database, no accounts, no cookies, no third-party scripts or fonts. What is in place, and what GitHub Pages cannot do:

- **Content-Security-Policy** as a `<meta>` on every page, written by `scripts/prerender.mjs`: scripts only from the site itself plus each page's inline script by its SHA-256 hash (no `'unsafe-inline'`/`'unsafe-eval'`), images/fonts/connections from the site only, no frames, workers, plugins or foreign form targets. `npm run check` fails if a page lacks it or an inline script is not covered; a browser test checks that an injected script is blocked. If you add an inline `<script>`, the hash is added automatically; a script from another origin needs the policy changed.
- **Referrer-Policy** `strict-origin-when-cross-origin` (meta).
- **HTTPS + HSTS** are set by GitHub Pages.
- **Not possible on GitHub Pages** (they are HTTP response headers; their `<meta>` forms are ignored by browsers): `X-Content-Type-Options`, `X-Frame-Options` / CSP `frame-ancestors` (framing protection), `Permissions-Policy`, CSP reporting. They need a host that sets headers (Cloudflare Pages, Netlify) or a proxy in front (e.g. Cloudflare with header rules). The site has no logged-in state or actions a framing attack could abuse, so this is a hardening gap, not an open hole.
- **Deployment workflow**: no token permissions by default, per job only what it needs; actions pinned to commit SHAs (Dependabot proposes updates, `.github/dependabot.yml`); `npm ci --ignore-scripts` (no dependency needs an install script); checkout does not keep the token.
- **Repository** (Settings): Dependabot alerts and security updates, secret scanning with push protection, CodeQL code scanning, workflow tokens read-only by default, and a ruleset that blocks force-pushes to and deletion of `main`.
- Third-party reference images of unknown licence are kept out of the repository (`.gitignore`).

## Adding a real inquiry form later

GitHub Pages cannot run server code, so the site uses email instead of a form that would silently drop submissions. To add a form:

1. Choose a form backend that accepts a plain HTML `POST` (for example Formspree, Basin, Web3Forms or Getform) and create a form there. Check its privacy terms for your clients' countries.
2. Add the endpoint to `site.contact` (e.g. `formAction: 'https://…'`).
3. In `src/components/sections/Contact.tsx`, render a `<form method="post" action={site.contact.formAction}>` with labelled fields (name, email, message, budget, timeline), a honeypot field, and a visible success/error state. Keep the email link as a fallback.
4. Send a test submission and confirm it arrives before launch.

---

## Persian (RTL) edition

Prepared, not built:

- All copy is in `src/content/en/` behind the `PageContent` type. Create `src/content/fa/index.ts` with the same shape and register it in `src/content/index.ts`.
- Set `site.locale` to `{ lang: 'fa', dir: 'rtl', ogLocale: 'fa_IR' }`. The prerender writes `lang`/`dir` on `<html>`.
- Layout uses CSS logical properties (`margin-inline`, `inset-inline-start`, …). Direction-specific details (scrims, arrows, rule origins) already have `[dir='rtl']` rules. The hero image is not mirrored.
- Install `@fontsource-variable/vazirmatn`, import it in `src/styles/index.css`, and put `'Vazirmatn Variable'` first in `--font-sans`.
- For both languages at once, build each locale to its own folder (e.g. `/fa/`) and add `hreflang` links in `entry-server.tsx`.

---

## Regenerating the artwork

```bash
python tools/photos/prepare.py   # grade the licensed photographs
npm run build && npm run captures   # capture the built websites for the cards and case studies
npm run og                   # social card from tools/og/og-card.html (uses the hero image and the logo)
npm run assets               # → public/media, icons, og-image.jpg, media.json
```

The wordmarks need Python with `fonttools` and `brotli`. Captures are ignored by git; only the optimised outputs in `public/` are committed, so CI needs no browser. (The earlier Blender hero in `tools/scene/` needs Blender 4.5 and the Poly Haven HDRI `belfast_sunset_puresky`; it is not used on the site.)

---

## Accessibility, motion and performance notes

- `prefers-reduced-motion`: no entrance animation, parallax, reveals or hero settle; the hero image is shown in its final framing. Maison Aurel's 3D ring draws one frame and turns only when dragged; Lune's prices change without rolling; Tensile's lifts hold at the bottom of the movement until Play is pressed; in Selected Work the Lune ring stands still (a chosen card still comes forward) and the Anar assembly is shown finished.
- Without JavaScript all content is visible, including the project previews and every website page. The mobile menu becomes a link to the footer navigation.
- Dialogs, drawers and menus use the native `<dialog>`: focus is kept inside, Escape closes, focus returns to the trigger. Every choice is a real button or input with a visible focus ring; everything works with a keyboard.
- Forms validate next to the field, with the error linked by `aria-describedby`; checkout moves focus to the first field that needs attention.
- Hero text sits on the image's darkest side with a shade behind it (`hero.css`); its contrast is measured against the rendered result at several sizes.
- Images have intrinsic sizes (no layout shift). Covers and captures are attached only near the viewport.

## Content honesty

Maison Aurel, Lune Atelier, Tensile Athletic Club and Anar Dining Room are **self-initiated concept studies for fictional brands**, labelled as such in Selected Work, on every page of each website (the P. DESIGN bar and the site's own footer) and in the case studies. Reviews are marked as fictional samples, coaches as fictional profiles shown with Unsplash photographs, and hours, prices and timetables as sample content. No form sends anything. The P. DESIGN pages are the studio's own identity and are labelled "Studio brand". Don't add client names, testimonials, results or awards unless they are real and you have permission to show them.

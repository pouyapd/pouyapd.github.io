import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { App } from './app/App'
import { absoluteUrl, asset } from './app/paths'
import { CASE_STUDY, parseRoute, type Route } from './app/routes'
import { conceptSource, loadConcept } from './concepts/load'
import type { ConceptModule } from './concepts/types'
import { site } from './config/site'
import { getContent } from './content'
import media from './content/generated/media.json'
import { HERO_PORTRAIT, HERO_SIZES } from './components/sections/Hero'

// the same modules the client loads per page, all loaded up front for prerendering
const concepts: Record<string, ConceptModule> = Object.fromEntries(
  await Promise.all(Object.entries(loadConcept).map(async ([slug, load]) => [slug, await load()] as const)),
)

const conceptFor = (route: Route) => {
  const page = parseRoute(route, getContent().work.sites)
  return page.kind === 'concept' ? concepts[page.site.slug] : undefined
}

/** Used by scripts/prerender.mjs at build time. */
export function render(route: Route): string {
  return renderToString(
    <StrictMode>
      <App route={route} concept={conceptFor(route)} />
    </StrictMode>,
  )
}

/** The built source of a concept page's code, to link its CSS (scripts/prerender.mjs reads Vite's manifest). */
export function conceptEntry(route: Route): string | undefined {
  const page = parseRoute(route, getContent().work.sites)
  return page.kind === 'concept' ? conceptSource[page.site.slug] : undefined
}

/**
 * Whether a page belongs in search results and the sitemap. The demo checkouts are steps inside a
 * shop, not pages anyone searches for; the product pages of the concept shops (Maison Aurel's pieces,
 * Lune's products) show prices for things that are not for sale, so they stay out of search results
 * (their links are still followed); the 404 is not a page at all.
 */
export function indexable(route: Route): boolean {
  if (route === 'not-found') return false
  const page = parseRoute(route, getContent().work.sites)
  return !(page.kind === 'concept' && (/(^|\/)checkout$/.test(page.path) || /^(pieces|shop)\/[^/]+$/.test(page.path)))
}

/** "An online boutique…" → "an online boutique…", to follow a dash. */
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

/** <head> tags for a route. All URLs derive from SITE_URL (src/config/deployment.ts). */
export function head(route: Route): string {
  const content = getContent()
  const page = parseRoute(route, content.work.sites)
  const project = page.kind === 'case' ? page.site : undefined
  const live = page.kind === 'concept' ? page : undefined
  const subTitle = live && live.path ? concepts[live.site.slug]?.title?.(live.path) : undefined
  const title =
    route === 'home'
      ? `${site.name} — ${site.titleSuffix}`
      : project
        ? project.own
          ? `${project.title} — how the identity was designed · ${site.name}`
          : // what was made, in searchable words, then whose case study it is
            `${project.searchTitle ?? 'Website design'}: ${project.title} case study · ${site.name}`
        : live
          ? live.site.own
            ? `Brand guidelines · ${site.name}`
            : `${subTitle ? `${subTitle} — ` : ''}${live.site.title} · concept website by ${site.name}`
          : `${content.notFound.title} · ${site.name}`
  const description = project
    ? project.own
      ? `${project.kind}: ${project.summary}`
      : `A concept case study for a fictional brand — ${lowerFirst(project.summary)}`
    : live
      ? live.site.own
        ? `The ${site.name} brand guidelines: the monogram, colour, typography and usage rules.`
        : `Concept website by ${site.name} for a fictional brand — ${lowerFirst(live.site.summary)}`
      : site.description
  const canonical = absoluteUrl(route === 'home' ? '' : `${route}/`)
  // a featured project's pages and case study share its own card (public/og/<slug>.jpg, `npm run og`)
  const own = project ?? live?.site
  const card = own && own.featured !== false ? own : undefined
  const og = absoluteUrl(card ? `og/${card.slug}.jpg` : site.brand.ogImage)
  const ogAlt = card ? `${card.title}, a concept website by ${site.name}: its home page on a desktop and a phone.` : site.brand.ogImageAlt

  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}">`,
    `<meta name="theme-color" content="${site.themeColor}">`,
    `<link rel="icon" href="${asset(site.brand.favicon)}" type="image/svg+xml">`,
    `<link rel="icon" href="${asset('favicon-32.png')}" sizes="32x32" type="image/png">`,
    `<link rel="apple-touch-icon" href="${asset('apple-touch-icon.png')}">`,
    `<link rel="manifest" href="${asset('site.webmanifest')}">`,
  ]

  if (!indexable(route)) tags.push('<meta name="robots" content="noindex">')
  if (route === 'not-found') return tags.join('\n    ')

  tags.push(
    `<link rel="canonical" href="${canonical}">`,
    `<meta property="og:type" content="${route === 'home' ? 'website' : 'article'}">`,
    `<meta property="og:site_name" content="${esc(site.name)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${canonical}">`,
    `<meta property="og:locale" content="${site.locale.ogLocale}">`,
    `<meta property="og:image" content="${og}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta property="og:image:alt" content="${esc(ogAlt)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(description)}">`,
    `<meta name="twitter:image" content="${og}">`,
  )

  // a case study describes one piece of the studio's work (a concept for a fictional brand, so labelled)
  if (project) {
    const work = {
      '@type': 'CreativeWork',
      name: project.own ? `${project.title} — brand identity and website` : `${project.title} — concept website`,
      description,
      url: canonical,
      image: og,
      inLanguage: site.locale.lang,
      creator: { '@id': ORG_ID() },
    }
    tags.push(jsonLd({ '@context': 'https://schema.org', '@graph': [organization(), work] }))
  }

  if (route !== 'home') return tags.join('\n    ')

  // Preload the hero image (the largest image, the LCP): the phone crop or the whole image, as the <picture> picks.
  const stills = media.hero as Record<string, { widths: number[] }>
  for (const [name, query, sizes] of [
    ['portal-portrait', HERO_PORTRAIT, '100vw'],
    ['portal', `not all and ${HERO_PORTRAIT}`, HERO_SIZES],
  ] as const) {
    const e = stills[name]
    if (!e) continue
    const set = e.widths.map((w) => `${asset(`media/hero/${name}-${w}.avif`)} ${w}w`).join(', ')
    tags.push(`<link rel="preload" as="image" type="image/avif" imagesrcset="${set}" imagesizes="${sizes}" media="${query}" fetchpriority="high">`)
  }

  // Structured data: the studio and its website, with only facts that are true today (name, URL, logo,
  // contact if set) — no address, ratings or reviews
  const website = { '@type': 'WebSite', '@id': `${absoluteUrl()}#website`, name: site.name, url: absoluteUrl(), inLanguage: site.locale.lang, publisher: { '@id': ORG_ID() } }
  tags.push(jsonLd({ '@context': 'https://schema.org', '@graph': [organization(), website] }))

  return tags.join('\n    ')
}

const ORG_ID = () => `${absoluteUrl()}#organization`
const jsonLd = (data: unknown) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`

function organization(): Record<string, unknown> {
  const org: Record<string, unknown> = {
    '@type': 'Organization',
    '@id': ORG_ID(),
    name: site.name,
    url: absoluteUrl(),
    logo: absoluteUrl(site.brand.avatar),
    description: site.description,
    // the services the home page lists, nothing more
    knowsAbout: getContent().services.items.map((s) => s.title),
  }
  if (site.contact.email) org.email = site.contact.email
  if (site.social.length) org.sameAs = site.social.map((s) => s.href)
  return org
}

export const locale = site.locale
/** Every prerendered route except 404 (scripts/prerender.mjs writes one HTML file per route). */
export const routes: Route[] = [
  'home',
  ...getContent().work.sites.flatMap((s) => [
    ...(concepts[s.slug]?.paths ?? ['']).map((p) => `work/${s.slug}${p ? `/${p}` : ''}` as Route),
    `work/${s.slug}/${CASE_STUDY}` as Route,
  ]),
]

export const siteMeta = { name: site.name, themeColor: site.themeColor, description: site.description, email: site.contact.email }

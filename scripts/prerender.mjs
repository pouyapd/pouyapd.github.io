// Turns the client build into static, crawlable HTML.
//   dist/index.html             home page, fully rendered (hydrated by the client bundle)
//   dist/work/<slug>/…          every page of each concept website (its CSS linked from Vite's manifest)
//   dist/work/<slug>/case-study/ the notes on how each concept was designed
//   dist/404.html               not-found page (GitHub Pages serves it for unknown paths)
//   dist/sitemap.xml, dist/robots.txt, dist/site.webmanifest
// Runs after `vite build` and `vite build --ssr` (see package.json "build").
import { mkdir, readFile, writeFile, readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const ssrDir = path.join(root, 'dist-ssr')

const ssr = await import(pathToFileURL(path.join(ssrDir, 'entry-server.js')).href)
const template = await readFile(path.join(dist, 'index.html'), 'utf8')

// Base path as built into the client (from <script src="/base/assets/...">).
const base = template.match(/src="([^"]*?)assets\//)?.[1] ?? '/'
const siteUrl = ssr.head('home').match(/rel="canonical" href="([^"]+)"/)?.[1]
if (!siteUrl) throw new Error('Could not determine the canonical site URL from entry-server head().')

// Preload the two latin font files (hashed names) so text renders in the right face immediately.
const assets = await readdir(path.join(dist, 'assets'))
const fontPreloads = assets
  .filter((f) => /^(geist-latin-wght-normal|instrument-serif-latin-400-italic)-.*\.woff2$/.test(f))
  .map((f) => `<link rel="preload" href="${base}assets/${f}" as="font" type="font/woff2" crossorigin>`)
if (fontPreloads.length !== 2) console.warn(`prerender: expected 2 font files to preload, found ${fontPreloads.length}`)

// Each concept website is its own chunk with its own CSS: link that CSS (and preload the chunk)
// in the page's HTML so it paints in its own identity before the script runs.
const manifest = JSON.parse(await readFile(path.join(dist, '.vite/manifest.json'), 'utf8'))
async function conceptTags(route) {
  const key = ssr.conceptEntry(route)
  if (!key) return []
  const entry = manifest[key]
  if (!entry) throw new Error(`prerender: ${key} is not in the Vite manifest`)
  const css = new Set()
  const walk = (k) => {
    const e = manifest[k]
    if (!e) return
    e.css?.forEach((c) => css.add(c))
    e.imports?.forEach(walk)
  }
  walk(key)
  // its own latin fonts, so the first paint is already in its typefaces (no swap, no shift)
  const fonts = new Set()
  for (const c of css) {
    const text = await readFile(path.join(dist, c), 'utf8')
    for (const m of text.matchAll(/url\(([^)]+?-latin-[^)]+?\.woff2)\)/g)) if (!m[1].includes('latin-ext')) fonts.add(m[1])
  }
  return [
    `<link rel="modulepreload" href="${base}${entry.file}">`,
    ...[...css].map((c) => `<link rel="stylesheet" href="${base}${c}">`),
    ...[...fonts].map((f) => `<link rel="preload" href="${f}" as="font" type="font/woff2" crossorigin>`),
  ]
}

/** The page's main photograph (the one rendered with fetchPriority="high"): preload it from the head. */
function lcpPreload(html) {
  const at = html.search(/fetchpriority="high"/i)
  if (at < 0) return []
  const pic = html.lastIndexOf('<picture', at)
  const source = pic < 0 ? null : html.slice(pic, at).match(/<source type="image\/avif" srcSet="([^"]+)" sizes="([^"]+)"/)
  return source ? [`<link rel="preload" as="image" type="image/avif" imagesrcset="${source[1]}" imagesizes="${source[2]}" fetchpriority="high">`] : []
}

async function page(route) {
  const html = ssr.render(route)
  const concept = await conceptTags(route)
  // a concept page uses the studio's sans only in its slim bar, and not the studio's serif
  const fonts = concept.length ? fontPreloads.filter((l) => l.includes('geist')) : fontPreloads
  const head = [ssr.head(route), ...fonts, ...concept, ...(route === 'home' ? [] : lcpPreload(html))]
  return template
    .replace('<html lang="en" dir="ltr">', `<html lang="${ssr.locale.lang}" dir="${ssr.locale.dir}">`)
    .replace('<!--app-head-->', head.join('\n    '))
    .replace('<div id="root"><!--app-html--></div>', `<div id="root"${route === 'home' ? '' : ` data-route="${route}"`}>${html}</div>`)
}

const urls = []
for (const route of ssr.routes) {
  const dir = route === 'home' ? dist : path.join(dist, route)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, 'index.html'), await page(route))
  // the sitemap lists only pages meant for search (not the demo checkouts)
  if (ssr.indexable(route)) urls.push(route === 'home' ? siteUrl : new URL(`${route}/`, siteUrl).href)
}
await writeFile(path.join(dist, '404.html'), await page('not-found'))

const today = new Date().toISOString().slice(0, 10)
const entries = urls.map((u) => `  <url>\n    <loc>${u}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`)
await writeFile(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>
`,
)

// robots.txt is only read by crawlers at a domain root. On a project URL
// (user.github.io/repo/) it is harmless; on a custom domain it is authoritative.
await writeFile(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}sitemap.xml\n`)

await writeFile(
  path.join(dist, 'site.webmanifest'),
  JSON.stringify(
    {
      name: ssr.siteMeta.name,
      short_name: ssr.siteMeta.name,
      description: ssr.siteMeta.description,
      start_url: base,
      scope: base,
      display: 'standalone',
      background_color: ssr.siteMeta.themeColor,
      theme_color: ssr.siteMeta.themeColor,
      icons: [
        { src: `${base}icon-192.png`, sizes: '192x192', type: 'image/png' },
        { src: `${base}icon-512.png`, sizes: '512x512', type: 'image/png' },
        { src: `${base}icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    null,
    2,
  ) + '\n',
)

// GitHub Pages: serve files as-is (no Jekyll processing of underscored paths).
await writeFile(path.join(dist, '.nojekyll'), '')

await rm(ssrDir, { recursive: true, force: true })
await rm(path.join(dist, '.vite'), { recursive: true, force: true })

console.log(`prerendered ${ssr.routes.length} pages + 404 for ${siteUrl} (base ${base}); ${urls.length} in the sitemap`)

// Post-build verification of dist/ (run by `npm run check`).
// Fails (exit 1) on: missing local files referenced from HTML/CSS/manifest,
// in-page anchors without a target, missing deploy files, broken metadata,
// images without alt, more or fewer than one <h1>.
import { createHash } from 'node:crypto'
import { readFile, readdir, access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const errors = []
const notes = []
const exists = (p) => access(p).then(() => true, () => false)

const html = await readFile(path.join(dist, 'index.html'), 'utf8')
const base = html.match(/src="([^"]*?)assets\//)?.[1] ?? '/'
const canonical = html.match(/rel="canonical" href="([^"]+)"/)?.[1]

/** Map a URL found in the page to a file in dist/, or null if it's external. */
function toFile(url) {
  if (/^(data:|mailto:|tel:|#|\/\/)/.test(url)) return null
  if (/^https?:\/\//.test(url)) {
    if (canonical && url.startsWith(canonical)) url = base + url.slice(canonical.length)
    else return null
  }
  if (!url.startsWith(base)) {
    errors.push(`reference outside base path "${base}": ${url}`)
    return null
  }
  const rel = decodeURIComponent(url.slice(base.length).split(/[?#]/)[0])
  return path.join(dist, rel === '' || rel.endsWith('/') ? `${rel}index.html` : rel)
}

async function checkRefs(label, refs) {
  let n = 0
  for (const ref of new Set(refs)) {
    const file = toFile(ref)
    if (!file) continue
    n++
    if (!(await exists(file))) errors.push(`${label}: missing file for ${ref}`)
  }
  return n
}

// 1. HTML attributes
const attrRefs = [...html.matchAll(/\s(?:src|href)="([^"]+)"/g)].map((m) => m[1])
const srcsetRefs = [...html.matchAll(/\s(?:srcset|imagesrcset)="([^"]+)"/gi)].flatMap((m) =>
  m[1].split(',').map((s) => s.trim().split(/\s+/)[0]),
)
const homeOg = html.match(/property="og:image" content="([^"]+)"/)?.[1]
let htmlCount = await checkRefs('index.html', [...attrRefs, ...srcsetRefs, ...(homeOg ? [homeOg] : [])])

// 1b. Pages under /work/: each concept website's pages and each case study —
// references (including links between pages), one <h1>, alt text, in-page anchors, honest labels
const workDir = path.join(dist, 'work')
async function htmlUnder(dir) {
  if (!(await exists(dir))) return []
  const out = []
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...(await htmlUnder(p)))
    else if (e.name === 'index.html') out.push(path.relative(dist, p))
  }
  return out
}
const projectPages = await htmlUnder(workDir)
const caseStudies = projectPages.filter((p) => /[\\/]case-study[\\/]/.test(p))
const conceptPages = projectPages.filter((p) => !caseStudies.includes(p))
if (caseStudies.length < 5) errors.push(`expected 5 case studies in dist/work/, found ${caseStudies.length}`)
if (conceptPages.length < 30) errors.push(`expected the websites' pages in dist/work/, found ${conceptPages.length}`)
for (const page of projectPages) {
  const doc = await readFile(path.join(dist, page), 'utf8')
  const refs = [...doc.matchAll(/\s(?:src|href)="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'))
  const sets = [...doc.matchAll(/\s(?:srcset|imagesrcset)="([^"]+)"/gi)].flatMap((m) => m[1].split(',').map((x) => x.trim().split(/\s+/)[0]))
  // structured data, where a page has it, must be valid JSON
  for (const m of doc.matchAll(/<script type="application\/ld\+json">(.+?)<\/script>/gs)) {
    try {
      JSON.parse(m[1])
    } catch {
      errors.push(`${page}: invalid JSON-LD`)
    }
  }
  // the social preview (a project's own card or the studio's) must exist too
  const ogImage = doc.match(/property="og:image" content="([^"]+)"/)?.[1]
  htmlCount += await checkRefs(page, [...refs, ...sets, ...(ogImage ? [ogImage] : [])])
  const h1 = (doc.match(/<h1[\s>]/g) ?? []).length
  if (h1 !== 1) errors.push(`${page}: expected exactly one <h1>, found ${h1}`)
  for (const m of doc.matchAll(/<img\b[^>]*>/g)) if (!/\salt="/.test(m[0])) errors.push(`${page}: <img> without alt`)
  const pageIds = new Set([...doc.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))
  for (const m of doc.matchAll(/href="#([^"]*)"/g)) if (m[1] && !pageIds.has(m[1])) errors.push(`${page}: anchor #${m[1]} has no target`)
  // honest labels: a fictional brand's pages say so; the studio's own brand is labelled as that
  const own = /[\\/]p-design[\\/]/.test(page)
  const label = caseStudies.includes(page) ? (own ? 'Studio brand' : 'Concept study') : own ? 'Brand guidelines' : 'Concept website'
  if (!doc.includes(label)) errors.push(`${page}: not labelled "${label}"`)
  if (!caseStudies.includes(page) && (doc.match(/<link rel="stylesheet"/g) ?? []).length < 2) errors.push(`${page}: the concept's own CSS is not linked`)
  if (!/rel="canonical" href="[^"]+\/work\/[^"]+\/"/.test(doc)) errors.push(`${page}: canonical is not the page's own URL`)
}

// 2. CSS url(...)
let cssCount = 0
for (const f of (await readdir(path.join(dist, 'assets'))).filter((f) => f.endsWith('.css'))) {
  const css = await readFile(path.join(dist, 'assets', f), 'utf8')
  const refs = [...css.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)].map((m) => m[1]).filter((u) => !u.startsWith('data:'))
  cssCount += await checkRefs(f, refs.map((u) => (u.startsWith('/') ? u : base + 'assets/' + u)))
}

// 2b. url(...) inside inline <style> blocks (hero scene placeholder)
const inlineCss = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n')
const inlineRefs = [...inlineCss.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)].map((m) => m[1]).filter((u) => !u.startsWith('data:'))
cssCount += await checkRefs('inline <style>', inlineRefs)

// 3. Manifest icons
const manifest = JSON.parse(await readFile(path.join(dist, 'site.webmanifest'), 'utf8'))
await checkRefs('site.webmanifest', manifest.icons.map((i) => i.src))

// 4. In-page anchors
const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))
for (const m of html.matchAll(/href="#([^"]*)"/g)) {
  if (m[1] && !ids.has(m[1])) errors.push(`anchor #${m[1]} has no matching id`)
}

// 5. Deploy files
for (const f of ['404.html', 'robots.txt', 'sitemap.xml', 'site.webmanifest', '.nojekyll', 'og-image.jpg', 'favicon.svg', 'apple-touch-icon.png']) {
  if (!(await exists(path.join(dist, f)))) errors.push(`missing ${f}`)
}

// 6. Metadata
if (!canonical) errors.push('missing canonical link')
const ogUrl = html.match(/property="og:url" content="([^"]+)"/)?.[1]
const ogImage = html.match(/property="og:image" content="([^"]+)"/)?.[1]
if (ogUrl !== canonical) errors.push(`og:url (${ogUrl}) differs from canonical (${canonical})`)
if (!ogImage?.startsWith(canonical ?? '\0')) errors.push(`og:image is not under the site URL: ${ogImage}`)
const sitemap = await readFile(path.join(dist, 'sitemap.xml'), 'utf8')
if (!sitemap.includes(`<loc>${canonical}</loc>`)) errors.push('sitemap.xml does not list the canonical URL')
// every page meant for search is listed; a page marked noindex (the demo checkouts) is not
for (const page of projectPages) {
  const url = `${canonical}${page.replace(/index\.html$/, '').replace(/\\/g, '/')}`
  const noindex = /<meta name="robots" content="noindex">/.test(await readFile(path.join(dist, page), 'utf8'))
  if (!noindex && !sitemap.includes(`<loc>${url}</loc>`)) errors.push(`sitemap.xml does not list ${url}`)
  if (noindex && sitemap.includes(`<loc>${url}</loc>`)) errors.push(`sitemap.xml lists ${url}, which is marked noindex`)
}
const ld = html.match(/<script type="application\/ld\+json">(.+?)<\/script>/s)?.[1]
try {
  JSON.parse(ld ?? '')
} catch {
  errors.push('JSON-LD missing or invalid')
}
// a local build may point at localhost; a deployment build (CI, or PRODUCTION=1) must not publish it
if (/localhost|127\.0\.0\.1/.test(canonical ?? '')) {
  const message = `canonical is ${canonical} — set SITE_URL for a production build`
  if (process.env.CI || process.env.PRODUCTION) errors.push(`${message} (canonical, Open Graph, sitemap and manifest would all point at it)`)
  else notes.push(message)
}

// 7. Basic accessibility of the static HTML
const h1s = (html.match(/<h1[\s>]/g) ?? []).length
if (h1s !== 1) errors.push(`expected exactly one <h1>, found ${h1s}`)
for (const m of html.matchAll(/<img\b[^>]*>/g)) {
  if (!/\salt="/.test(m[0])) errors.push(`<img> without alt: ${m[0].slice(0, 80)}…`)
}
if (!/<html lang="[a-z-]+" dir="(ltr|rtl)"/.test(html)) errors.push('missing html lang/dir')
if (!/<main\b/.test(html)) errors.push('missing <main> landmark')

// 7b. Content Security Policy on every page, before any script, covering each inline script by hash
for (const page of ['index.html', '404.html', ...projectPages]) {
  const doc = await readFile(path.join(dist, page), 'utf8')
  const csp = doc.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/)
  if (!csp) {
    errors.push(`${page}: no Content-Security-Policy`)
    continue
  }
  if (doc.indexOf(csp[0]) > doc.indexOf('<script')) errors.push(`${page}: the Content-Security-Policy comes after a script`)
  const scriptSrc = csp[1].split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src')) ?? ''
  if (/'unsafe-inline'|'unsafe-eval'|\*/.test(scriptSrc)) errors.push(`${page}: script-src is not strict (${scriptSrc})`)
  for (const m of doc.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
    // browsers hash the script with its line breaks normalised to LF
    const hash = `'sha256-${createHash('sha256').update(m[1].replace(/\r\n?/g, '\n')).digest('base64')}'`
    if (!scriptSrc.includes(hash)) errors.push(`${page}: an inline script is not allowed by the Content-Security-Policy`)
  }
}

// 8. No developer-facing instructions in the public build
for (const page of ['index.html', '404.html', ...projectPages]) {
  const text = await readFile(path.join(dist, page), 'utf8')
  for (const leak of ['Developer note', 'src/config/', 'TODO', 'localhost:5173', 'being set up']) {
    if (text.includes(leak)) errors.push(`${page} contains developer text: "${leak}"`)
  }
}

// 9. Contact details come from src/config/site.ts and must reach the page
const site = await readFile(path.join(root, 'src/config/site.ts'), 'utf8')
const email = site.match(/email:\s*'([^']+)'/)?.[1]
if (!email) errors.push('contact.email is not set in src/config/site.ts')
else if (!html.includes(`href="mailto:${email}`)) errors.push(`no mailto link for ${email} in the page`)
const anchors = [...html.matchAll(/<a\b[^>]*>/g)].map((m) => m[0])
for (const m of site.matchAll(/href:\s*'(https:[^']+)'/g)) {
  const link = anchors.find((a) => a.includes(`href="${m[1]}"`))
  if (!link) errors.push(`social link ${m[1]} is missing from the page`)
  else if (!/target="_blank"/.test(link) || !/rel="[^"]*noopener/.test(link)) errors.push(`social link ${m[1]} lacks target/rel`)
}

// 10. Content present as HTML (not only via JS)
for (const phrase of ['Digital experiences,', 'Selected work', 'concept websites for fictional brands', 'Explore the website', 'View case study', 'Maison Aurel', 'Lune Atelier', 'Anar Dining Room', 'Tensile Athletic Club', 'id="services"', 'Seen in', 'Discovery and direction', 'id="approach"', 'id="studio"', 'id="contact"']) {
  if (!html.includes(phrase)) errors.push(`prerendered HTML is missing "${phrase}"`)
}
// the four commercial projects in Selected Work: the studio's own identity is linked from Studio, not shown as a project
if (/class="case[^"]*"[^>]*aria-labelledby="case-p-design"/.test(html)) errors.push('Selected Work still shows the studio’s own identity as a project')
// removed sections must stay removed
for (const phrase of ['Studies in light', 'Atlas Ledger', 'Meridian Atelier', 'id="motion"', 'Motion with a purpose']) {
  if (html.includes(phrase)) errors.push(`prerendered HTML still contains "${phrase}"`)
}

console.log(`checked ${htmlCount} HTML refs (home + ${conceptPages.length} concept-website pages + ${caseStudies.length} case studies), ${cssCount} CSS refs, ${ids.size} ids; base "${base}", site ${canonical}`)
for (const n of notes) console.log(`note: ${n}`)
if (errors.length) {
  console.error(`\n${errors.length} problem(s):\n- ${errors.join('\n- ')}`)
  process.exit(1)
}
console.log('dist check passed')

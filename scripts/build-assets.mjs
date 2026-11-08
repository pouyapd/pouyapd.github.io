// Converts the hero image (tools/hero), the concept-site captures and the
// graded photographs into web-ready media:
//   public/media/**      responsive AVIF + WebP
//   public/*.png         favicon / app icons rasterised from public/favicon.svg
//   public/og-image.jpg  social preview (from tools/og/og-card.png, see `npm run og`)
//   public/og/<slug>.jpg each project's social preview (tools/og/og-<slug>.png)
//   src/content/generated/media.json   dimensions + tiny blurred placeholders
//   src/content/generated/credits.json photographers of the licensed photos (tools/photos/*/sources.tsv)
// Inputs: tools/hero (the owner's hero image), tools/captures/out (the built websites, scripts/captures.mjs),
//         tools/mockups/out (earlier static mockups), tools/photos/*/out (graded photographs).
//
// Usage: npm run assets
//        npm run assets -- hero/ shots/lune   rebuild only outputs starting with these prefixes
//        (the rest of media.json is kept)
import { mkdir, readFile, readdir, writeFile, access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const src = path.join(root, 'tools/scene/out')
const hero = path.join(root, 'tools/hero')
const shots = path.join(root, 'tools/mockups/out')
const captures = path.join(root, 'tools/captures/out')
const pub = path.join(root, 'public')
const media = path.join(pub, 'media')
const photos = path.join(root, 'tools/photos')
const PHOTO_SETS = ['lune', 'aurel', 'anar', 'tensile']

const exists = (p) => access(p).then(() => true, () => false)

/** Responsive variants: `q` per job; `alpha` keeps transparency; `placeholderFrom` picks the blur-up source; `extract` crops first. */
const jobs = [
  // the hero: the owner's image as supplied (tools/hero/sunset-portal.png, 1672 x 941), never enlarged.
  // Phones get a crop of the same image — the figure, the arch and the sun — so they download only that part.
  { dir: hero, file: 'sunset-portal.png', out: 'hero/portal', widths: [960, 1280, 1672], q: { avif: 74, webp: 88 } },
  { dir: hero, file: 'sunset-portal.png', out: 'hero/portal-portrait', extract: { left: 740, top: 0, width: 680, height: 941 }, widths: [480, 680], q: { avif: 74, webp: 88 } },
  // the built websites (scripts/captures.mjs): whole pages for the previews, and single screens for the case studies
  ...(await readdir(captures).catch(() => []))
    .filter((f) => /^live-.+-(desktop|mobile)\.png$/.test(f) && !f.includes('-shot-'))
    .map((f) => ({
      dir: captures, file: f, out: `sites/${f.replace(/\.png$/, '')}`, placeholderTop: true, effort: 4,
      widths: f.endsWith('-desktop.png') ? [720, 1080, 1440] : [390, 780], q: { avif: 60, webp: 80 },
    })),
  ...(await readdir(captures).catch(() => []))
    .filter((f) => /^live-.+-shot-.+-(desktop|mobile)\.png$/.test(f))
    .map((f) => ({
      dir: captures, file: f, out: `shots/${f.replace(/\.png$/, '')}`, noPlaceholder: true, effort: 4,
      widths: f.endsWith('-desktop.png') ? [720, 1080, 1440] : [390, 780], q: { avif: 60, webp: 80 },
    })),
  // concept-site captures of the earlier static mockups (tall, full-page)
  ...['maison-aurel', 'anar', 'lune', 'meridian'].flatMap((n) => [
    { dir: shots, file: `${n}-desktop.png`, out: `sites/${n}-desktop`, widths: [720, 1080, 1440], q: { avif: 60, webp: 80 }, placeholderTop: true },
    { dir: shots, file: `${n}-mobile.png`, out: `sites/${n}-mobile`, widths: [390, 780], q: { avif: 60, webp: 80 }, placeholderTop: true },
  ]),
  // each concept section on its own (desktop) and one phone screen of it (mobile), see scripts/mockups.mjs
  ...(await readdir(shots).catch(() => []))
    .filter((f) => /-shot-.+-(desktop|mobile)\.png$/.test(f))
    .map((f) => ({
      dir: shots, file: f, out: `shots/${f.replace(/\.png$/, '')}`, noPlaceholder: true,
      widths: f.endsWith('-desktop.png') ? [720, 1080, 1440] : [390, 780], q: { avif: 60, webp: 80 }, effort: 4,
    })),
  // licensed photographs for the concept case studies (graded by tools/photos/prepare.py)
  ...(await Promise.all(PHOTO_SETS.map(async (set) =>
    (await readdir(path.join(photos, set, 'out')).catch(() => [])).filter((f) => f.endsWith('.jpg')).map((f) => ({
      dir: path.join(photos, set, 'out'), file: f, out: `photos/${set}-${f.replace(/\.jpg$/, '')}`,
      widths: [480, 960, 1440], q: { avif: 56, webp: 76 }, effort: 4, placeholderSize: 16,
    }))))).flat(),
]

async function placeholder(file, size = 32) {
  const buf = await sharp(file).resize(size).blur(0.6).webp({ quality: 50 }).toBuffer()
  return `data:image/webp;base64,${buf.toString('base64')}`
}

/** Blur-up for tall page captures: only the first screen matters. */
async function placeholderTop(file, meta) {
  const h = Math.round(meta.width * 0.625)
  const buf = await sharp(file).extract({ left: 0, top: 0, width: meta.width, height: Math.min(h, meta.height) }).resize(32).blur(0.6).webp({ quality: 50 }).toBuffer()
  return `data:image/webp;base64,${buf.toString('base64')}`
}

async function run() {
  const only = process.argv.slice(2)
  const manifestPath = path.join(root, 'src/content/generated/media.json')
  const manifest = { hero: {}, sites: {}, shots: {}, photos: {} }
  if (only.length && (await exists(manifestPath))) Object.assign(manifest, JSON.parse(await readFile(manifestPath, 'utf8')))
  // entries under a rebuilt prefix are re-created below, so files that no longer exist drop out
  for (const [group, entries] of Object.entries(manifest)) {
    for (const name of Object.keys(entries)) if (only.some((o) => `${group}/${name}`.startsWith(o))) delete entries[name]
  }
  let bytes = 0
  for (const job of jobs) {
    if (only.length && !only.some((o) => job.out.startsWith(o))) continue
    const input = path.join(job.dir ?? src, job.file)
    if (!(await exists(input))) {
      console.warn(`skip ${job.file} (render it first: npm run render:scene)`)
      continue
    }
    const full = await sharp(input).metadata()
    // optional crop: a given region (extract), or the top of the image (height = width x cropRatio)
    const crop = job.extract ?? (job.cropRatio ? { left: 0, top: 0, width: full.width, height: Math.min(full.height, Math.round(full.width * job.cropRatio)) } : null)
    const source = () => (crop ? sharp(input).extract(crop) : sharp(input))
    const meta = crop ? { ...full, width: crop.width, height: crop.height } : full
    await mkdir(path.join(media, path.dirname(job.out)), { recursive: true })
    // AVIF stops at 16384 px per side: very tall page captures get a narrower top width
    const cap = Math.floor((16383 * meta.width) / meta.height)
    const widths = [...new Set(job.widths.map((w) => Math.min(w, cap)))]
    for (const w of widths) {
      const base = source().resize({ width: Math.min(w, meta.width) })
      const avif = await base.clone().avif({ quality: job.q.avif, effort: job.effort ?? 6, chromaSubsampling: '4:2:0' }).toBuffer()
      const webp = await base.clone().webp({ quality: job.q.webp, effort: 6, alphaQuality: 90, smartSubsample: true }).toBuffer()
      await writeFile(path.join(media, `${job.out}-${w}.avif`), avif)
      await writeFile(path.join(media, `${job.out}-${w}.webp`), webp)
      bytes += avif.length + webp.length
      console.log(`${job.out}-${w}  avif ${(avif.length / 1024).toFixed(0)}KB  webp ${(webp.length / 1024).toFixed(0)}KB`)
    }
    const [group, name] = job.out.split('/')
    const entry = { width: meta.width, height: meta.height, widths }
    // nav anchors measured by `npm run mockups` (clickable navigation inside a preview)
    const anchors = path.join(job.dir ?? src, job.file.replace(/\.png$/, '.json'))
    if (job.dir === shots && (await exists(anchors))) entry.anchors = JSON.parse(await readFile(anchors, 'utf8'))
    if (!job.alpha && !job.noPlaceholder) {
      // placeholder from the composite (layer-free) render when one exists
      const from = job.placeholderFrom ? path.join(src, job.placeholderFrom) : path.join(src, job.file.replace('-back', ''))
      if (job.placeholderTop) entry.placeholder = await placeholderTop(input, meta)
      else if (crop) entry.placeholder = await placeholder(await source().png().toBuffer(), job.placeholderSize)
      else entry.placeholder = await placeholder((await exists(from)) ? from : input, job.placeholderSize)
    }
    manifest[group][name] = entry
  }

  // icons from the SVG favicon
  const fav = await readFile(path.join(pub, 'favicon.svg'))
  for (const [name, size] of [['favicon-32.png', 32], ['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
    await sharp(fav, { density: 72 * (size / 64) * 2 }).resize(size, size).png({ compressionLevel: 9 }).toFile(path.join(pub, name))
  }
  // maskable icon: mark on a full-bleed tile with safe-zone padding
  const mark = await readFile(path.join(pub, 'brand/pd-mark.svg'))
  const markPng = await sharp(mark, { density: 600 }).resize({ height: 260 }).png().toBuffer()
  await sharp({ create: { width: 512, height: 512, channels: 4, background: '#101315' } })
    .composite([{ input: markPng, gravity: 'center' }])
    .png().toFile(path.join(pub, 'icon-maskable-512.png'))
  // social profile picture (GitHub, LinkedIn…): the icon tile, square; platforms crop it to a circle
  const icon = await readFile(path.join(pub, 'brand/pd-icon.svg'))
  await sharp(icon, { density: 72 * (1024 / 48) }).resize(1024, 1024).png({ compressionLevel: 9 }).toFile(path.join(pub, 'brand/pd-avatar-1024.png'))

  const og = path.join(root, 'tools/og/og-card.png')
  if (await exists(og)) {
    await sharp(og).resize(1200, 630).jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(pub, 'og-image.jpg'))
    console.log('og-image.jpg written')
  } else {
    console.warn('skip og-image.jpg (run `npm run og` first)')
  }
  // one card per project (tools/og/og-<slug>.png, also from `npm run og`) → public/og/<slug>.jpg
  await mkdir(path.join(pub, 'og'), { recursive: true })
  for (const file of (await readdir(path.join(root, 'tools/og'))).filter((f) => /^og-(?!card).+\.png$/.test(f))) {
    const slug = file.replace(/^og-|\.png$/g, '')
    await sharp(path.join(root, 'tools/og', file)).resize(1200, 630).jpeg({ quality: 86, mozjpeg: true }).toFile(path.join(pub, 'og', `${slug}.jpg`))
    console.log(`og/${slug}.jpg written`)
  }

  await mkdir(path.join(root, 'src/content/generated'), { recursive: true })
  // photo credits, from each set's sources.tsv
  const credits = {}
  for (const set of PHOTO_SETS) {
    const tsv = path.join(photos, set, 'sources.tsv')
    if (!(await exists(tsv))) continue
    const [head, ...rows] = (await readFile(tsv, 'utf8')).trim().split(/\r?\n/).map((l) => l.split('\t'))
    credits[set] = rows.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]]))).map((r) => ({
      key: r.key, photographer: r.photographer, page: r.photo_page, subject: r.subject,
    }))
  }
  await writeFile(path.join(root, 'src/content/generated/credits.json'), JSON.stringify(credits, null, 2) + '\n')
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n')
  console.log(`\nmedia total ${(bytes / 1024 / 1024).toFixed(2)} MB (all formats and widths)`)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})

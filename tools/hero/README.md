# Hero image

`sunset-portal.png` — the hero image supplied by the owner (original file name
"Sunset Portal Over Reflective Waters.png", 1672 × 941 px, PNG, sRGB;
SHA-256 `950dd69362f057380fb3802ea00d33e36d5063ad52c11dba8e8b2876e22b61bf`).
It is used as supplied: no retouching, no added elements, never enlarged.

`npm run assets -- hero/` writes the web versions to `public/media/hero/`:

- `portal-{960,1280,1672}.{avif,webp}` — the whole image (landscape screens, tablets).
- `portal-portrait-{480,680}.{avif,webp}` — a crop of the same image for phones,
  x 740–1420 px of the original at full height: the figure on the walkway, the
  arch with the sun and its reflection. Phones download only that part.

The largest web version is the original's own width (1672 px). On wider or
high-density screens the browser scales it up; a larger original, if one exists,
can replace this file under the same name — then add widths in
`scripts/build-assets.mjs` and rebuild.

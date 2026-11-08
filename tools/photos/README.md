# Licensed photographs for the concept websites

The concept websites (Maison Aurel, Lune Atelier, Tensile Athletic Club, Anar Dining Room) use real photography so the designs look like the businesses they are for. Every photograph comes from **Unsplash** and is used under the **Unsplash License** (free for commercial and non-commercial use, no permission needed; attribution appreciated, not required). Unsplash+ images are not used.

| Folder | Concept | Photos |
| --- | --- | --- |
| `lune/` | Lune Atelier (beauty salon and shop) | natural-skin portraits, hair, brows, lashes, unbranded skincare products |
| `aurel/` | Maison Aurel (fine jewellery) | gold rings, chains, pendants, pearls, the bench |
| `anar/` | Anar Dining Room (Persian restaurant) | tahdig, saffron rice, stews, tea, dining rooms |
| `tensile/` | Tensile Athletic Club (fitness) | spot-lit strength training, chalk, kettlebells, mobility, coach portraits |

Each folder has:

- `sources.tsv` — for every file: its key, the Unsplash image id, the photo page, the photographer and what it shows. The site's case studies list these credits (generated into `src/content/generated/credits.json` by `npm run assets`).
- `src/` — the downloads (`https://images.unsplash.com/<id>?w=2000`).
- `out/` — graded, web-sized copies used by the mockups (`npm run photos` → `prepare.py`).

The grade is light and the same for a whole set (white balance, a slight shadow lift, calmer blues); nothing is added to or removed from a picture. Photos posted by accounts of real restaurants or brands were avoided, so a fictional business never borrows a real one's work. Product photographs are unbranded (blank or no labels); the one boxing photo with a legible glove brand is not shown prominently.

Faces appear in some photographs (for example the Lune portraits and the Tensile coach profiles). They are Unsplash photographs of real people — the coach names and biographies are fictional and labelled so; they appear only inside fictional concept designs, which are labelled as such on every page. If a photograph is ever used for real client work or advertising, check Unsplash's guidance on people and trademarks first.

Two exceptions, neither a photograph:

- `aurel/out/stella-render.jpg` and `stella-render-front.jpg` are stills of the Stella solitaire rendered by the site's own real-time shader (`npm run render:stella`). They have no row in `sources.tsv` and no file in `src/`, so `prepare.py` leaves them alone.
- `lune/unused/` holds two photographs set aside because they show a real brand's product label.

To replace a photo: download it into `src/`, add a row to `sources.tsv`, run `npm run photos`, update the mockup HTML and `src/content/en/projects.ts`, then `npm run mockups && npm run assets`.

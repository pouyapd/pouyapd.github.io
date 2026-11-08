"""
P. DESIGN identity — generates every logo file from one set of measurements.

The mark is the owner's pd monogram (reference: "Minimal Champagne Monogram
Logo.png", 2026-10-27), redrawn as flat vector geometry. It was measured from
the reference's pixels: stroke 29 px, bowls of outer radius ~101 px whose centres
sit 173 px apart (= two radii minus one stroke), the d's ascender reaching
229 px above the bowls' centre line and the p's descender 194 px below it,
both stems cut at the same slant (rise 0.44 per unit of width).

  * Two round bowls whose centres sit one bowl-width minus one stroke apart,
    so where they meet the stroke is exactly one stroke wide.
  * One continuous ribbon: up the p's stem, over the p's bowl, through the
    waist, round the d's bowl and up the d's stem. The other two arcs (the p's
    lower and the d's upper) pass under it; in flat colour that is a clean gap
    of GAP (0.3 stroke) where each one meets the ribbon. At small sizes the gap
    closes visually and the mark reads as the solid form.
  * The p's stem is flush with its bowl's outer edge and falls from the centre
    line; the d's rises the same way. The d's ascender is taller than the p's
    descender, as in the reference (and in most type).
  * One stroke weight; flat colour; no gradients, shadows or texture.
  * Two colours (2026-10-27, owner's brief): the p ivory, the d lime (the
    accent of the site's "Start a project" button). The ribbon changes colour
    at the waist, where the two bowls meet on the centre line, so each letter
    is its own ring and stem. On light backgrounds the p is charcoal and the d
    a deeper lime that keeps 3:1 against ivory (the site lime has 1.15:1).

Each letter is one closed outline of straight lines and circular arcs (no
strokes), so the mark scales, prints and cuts cleanly; the d reaches a hair
(0.5 unit, ~0.01 unit of overlap at the edges) under the p at the waist, so no
seam of background shows between the two colours. Turned through 180 degrees
the p becomes the d (only the stem lengths differ).

    python tools/brand/make_logo.py   → public/brand/*.svg, public/favicon.svg,
                                        src/concepts/pdesign/mark.json (for the guidelines page)

Files:
    pd-mark.svg / logo.svg            for dark backgrounds (ivory p, lime d)
    pd-mark-ink.svg / logo-ink.svg    for light backgrounds (charcoal p, deep-lime d)
    pd-icon.svg                       app / social profile icon: the mark on a charcoal tile
    ../favicon.svg                    the small-size cut on the lime tile, for 16–32 px:
                                      heavier stroke, shorter stems, no gaps, one colour
                                      (charcoal: a lime d would vanish on the lime tile)
`npm run assets` rasterises the icon files to PNG (favicon-32, apple-touch,
manifest icons, brand/pd-avatar-1024.png). Earlier marks: tools/brand/legacy/.
"""

import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BRAND = ROOT / "public" / "brand"

IVORY, LIME, CHARCOAL = "#F2F0E9", "#C5F05C", "#101315"
LIME_DEEP = "#6E8F1A"   # the d on light backgrounds: 3.3:1 on ivory, 3.8:1 on white
SEAM = 0.5              # how far the d reaches under the p at the waist

# the master, in units where a bowl's outer radius is 28 (reference px × 28/101)
R = 28.0          # a bowl's outer radius (the x-height is 2R)
STROKE = 8.0      # the one stroke weight (reference 29 / 101 of the radius)
ASC = 63.5        # top of the d's stem (its higher, right-hand corner) above the centre line
DESC = 54.0       # foot of the p's stem (its lower, left-hand corner) below the centre line
SLANT = 0.44      # both stem ends are cut on this slope (rise per unit of width)
GAP = 0.3 * STROKE  # where an arc passes under the ribbon

# the favicon cut: heavier, stems shortened so it fills a square tile, no gaps
FAV = dict(t=11.0, asc=54.0, desc=47.0, gap=0.0)


def f(x):
    s = f"{x:.3f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def outline(t=STROKE, asc=ASC, desc=DESC, gap=GAP, k=SLANT):
    """The mark as SVG path data, centred on the bowls' centre line; returns (d, viewBox, fill-rule)."""
    c = R - t / 2                          # bowl centres at (±c, 0): one stroke where they meet
    ro, ri = R, R - t
    xl, xr = -c - R, c + R                 # outer edges of the two stems
    h = math.sqrt(ro ** 2 - ri ** 2)       # where a bowl's outer edge leaves its stem's inner edge
    p = lambda x, y: f"{f(x)} {f(y)}"
    arc = lambda r, sweep, x, y: f"A{f(r)} {f(r)} 0 0 {sweep} {p(x, y)}"

    def meet(r_d, r_p):
        """Upper intersection of the circle radius r_d round the d's centre with r_p round the p's."""
        x = (r_p ** 2 - r_d ** 2) / (4 * c)
        return x, -math.sqrt(max(r_d ** 2 - (x - c) ** 2, 0.0))

    if gap > 0:
        # one contour: the ribbon, with the two under-passing arcs stopping `gap` short of it
        rg = R + gap
        q1, q2 = meet(ri, rg), meet(ro, rg)
        d = [
            f"M{p(xl, desc)}", f"L{p(xl, 0)}",                         # p stem, outer edge
            arc(ro, 1, -c, -R), arc(ro, 1, t / 2, 0),                  # over the p's bowl to the waist
            arc(ri, 0, c, ri), arc(ri, 0, xr - t, 0), arc(ri, 0, c, -ri), arc(ri, 0, *q1),  # inside the d
            arc(rg, 0, *q2),                                           # the d's upper arc ends: the gap
            arc(ro, 1, xr - t, -h),                                    # over the d to its stem
            f"L{p(xr - t, -asc + t * k)}", f"L{p(xr, -asc)}", f"L{p(xr, 0)}",  # d stem, slanted top
            arc(ro, 1, c, R), arc(ro, 1, -t / 2, 0),                   # under the d's bowl to the waist
            arc(ri, 0, -c, -ri), arc(ri, 0, xl + t, 0), arc(ri, 0, -c, ri), arc(ri, 0, -q1[0], -q1[1]),  # inside the p
            arc(rg, 0, -q2[0], -q2[1]),                                # the p's lower arc ends: the gap
            arc(ro, 1, xl + t, h),                                     # under the p to its stem
            f"L{p(xl + t, desc - t * k)}", "Z",                        # p stem, slanted foot
        ]
        rule = "nonzero"
    else:
        # solid form: the outer contour, then the two counters
        u = math.sqrt(R ** 2 - c ** 2)     # the notches above and below the waist
        d = [
            f"M{p(xl, desc)}", f"L{p(xl, 0)}", arc(ro, 1, -c, -R), arc(ro, 1, 0, -u),
            arc(ro, 1, xr - t, -h), f"L{p(xr - t, -asc + t * k)}", f"L{p(xr, -asc)}", f"L{p(xr, 0)}",
            arc(ro, 1, c, R), arc(ro, 1, 0, u), arc(ro, 1, xl + t, h), f"L{p(xl + t, desc - t * k)}", "Z",
        ]
        for cx in (-c, c):
            d += [f"M{p(cx + ri, 0)}", f"A{f(ri)} {f(ri)} 0 1 0 {p(cx - ri, 0)}", f"A{f(ri)} {f(ri)} 0 1 0 {p(cx + ri, 0)}", "Z"]
        rule = "evenodd"
    view = (xl, -asc, xr - xl, asc + desc)
    return "".join(d), view, rule


def letters(t=STROKE, asc=ASC, desc=DESC, gap=GAP, k=SLANT, seam=SEAM):
    """The master as two outlines, (p, d), split where the ribbon crosses the centre line at the waist.

    The p: its stem, the ribbon over its bowl down to the waist, and its lower arc (which stops `gap` short
    of the d). The d: the ribbon from the waist under its bowl, its stem, and its upper arc (which stops
    `gap` short of the p). The d starts `seam` above the centre line, under the p, which is drawn on top.
    """
    c = R - t / 2
    ro, ri = R, R - t
    xl, xr = -c - R, c + R
    h = math.sqrt(ro ** 2 - ri ** 2)
    p = lambda x, y: f"{f(x)} {f(y)}"
    arc = lambda r, sweep, x, y: f"A{f(r)} {f(r)} 0 0 {sweep} {p(x, y)}"
    rg = R + gap
    meet = lambda r_d, r_p: ((r_p ** 2 - r_d ** 2) / (4 * c), -math.sqrt(max(r_d ** 2 - ((r_p ** 2 - r_d ** 2) / (4 * c) - c) ** 2, 0.0)))
    q1, q2 = meet(ri, rg), meet(ro, rg)
    pl = [
        f"M{p(xl, desc)}", f"L{p(xl, 0)}",
        arc(ro, 1, -c, -R), arc(ro, 1, t / 2, 0),                      # over the p's bowl to the waist
        f"L{p(-t / 2, 0)}",                                            # the cut, on the centre line
        arc(ri, 0, -c, -ri), arc(ri, 0, xl + t, 0), arc(ri, 0, -c, ri), arc(ri, 0, -q1[0], -q1[1]),
        arc(rg, 0, -q2[0], -q2[1]),                                    # the p's lower arc ends: the gap
        arc(ro, 1, xl + t, h),
        f"L{p(xl + t, desc - t * k)}", "Z",
    ]
    a = (c - math.sqrt(ri ** 2 - seam ** 2), -seam)                   # on the d's inner edge, just above the waist
    b = (c - math.sqrt(ro ** 2 - seam ** 2), -seam)                   # on its outer edge
    dl = [
        f"M{p(*a)}",
        arc(ri, 0, c, ri), arc(ri, 0, xr - t, 0), arc(ri, 0, c, -ri), arc(ri, 0, *q1),  # inside the d
        arc(rg, 0, *q2),                                               # the d's upper arc ends: the gap
        arc(ro, 1, xr - t, -h),
        f"L{p(xr - t, -asc + t * k)}", f"L{p(xr, -asc)}", f"L{p(xr, 0)}",
        arc(ro, 1, c, R), arc(ro, 1, *b),                              # under the d's bowl, back to the waist
        "Z",
    ]
    return "".join(pl), "".join(dl)


def pair(p_colour, d_colour, pd):
    """The two letters as SVG: the d first, the p over it."""
    lp, ld = pd
    return f'  <path fill="{d_colour}" d="{ld}"/>\n  <path fill="{p_colour}" d="{lp}"/>'


def body(colour, d, rule):
    return f'  <path fill="{colour}" fill-rule="{rule}" d="{d}"/>'


def svg(view, content, title="P. DESIGN"):
    vb = " ".join(f(v) for v in view)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-labelledby="t">\n'
            f'  <title id="t">{title}</title>\n{content}\n</svg>\n')


def tile(content, view, fill, size=48, scale=0.72, rx=0):
    """The mark centred on a square tile, its larger side `scale` of the tile."""
    x, y, w, h = view
    k = size * scale / max(w, h)
    tx, ty = size / 2 - (x + w / 2) * k, size / 2 - (y + h / 2) * k
    corner = f' rx="{rx}"' if rx else ""
    return (f'  <rect width="{size}" height="{size}"{corner} fill="{fill}"/>\n'
            f'  <g transform="translate({f(tx)} {f(ty)}) scale({f(k)})">\n'
            + content.replace("\n", "\n  ") + "\n  </g>")


def write(path, text):
    path.write_text(text, encoding="utf-8")
    print("  wrote", path.relative_to(ROOT))


def main():
    BRAND.mkdir(parents=True, exist_ok=True)
    d, view, rule = outline()
    pd = letters()
    for name in ("pd-mark.svg", "logo.svg"):
        write(BRAND / name, svg(view, pair(IVORY, LIME, pd)))
    for name in ("pd-mark-ink.svg", "logo-ink.svg"):
        write(BRAND / name, svg(view, pair(CHARCOAL, LIME_DEEP, pd)))
    write(BRAND / "pd-icon.svg", svg((0, 0, 48, 48), tile(pair(IVORY, LIME, pd), view, CHARCOAL, scale=0.62)))
    fd, fview, frule = outline(**FAV)
    write(ROOT / "public" / "favicon.svg", svg((0, 0, 48, 48), tile(body(CHARCOAL, fd, frule), fview, LIME, scale=0.8, rx=11)))
    # the same numbers for the brand guidelines page (construction drawing, captions)
    mark = {
        "d": d, "rule": rule, "view": [round(v, 3) for v in view],
        "letters": {"p": pd[0], "d": pd[1], "colours": {"p": IVORY, "d": LIME, "pInk": CHARCOAL, "dInk": LIME_DEEP}},
        "favicon": {"d": fd, "rule": frule, "view": [round(v, 3) for v in fview]},
        "R": R, "stroke": STROKE, "asc": ASC, "desc": DESC, "slant": SLANT, "gap": GAP,
        "centre": round(R - STROKE / 2, 3),
    }
    write(ROOT / "src" / "concepts" / "pdesign" / "mark.json", json.dumps(mark, indent=2) + "\n")
    print(f"  mark viewBox: {' '.join(f(v) for v in view)} (aspect {view[2] / view[3]:.4f})")


if __name__ == "__main__":
    main()

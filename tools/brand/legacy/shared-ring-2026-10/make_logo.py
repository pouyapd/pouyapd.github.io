"""
P. DESIGN identity — generates every logo file from one set of measurements.

The mark is a single, point-symmetric monogram built on one observation: a
lowercase p turned through 180 degrees is a d. So the two letters share one
bowl.
  * the bowl: one ring of a single stroke weight;
  * the p (ivory): the bowl's left half and a descender, its outer edge flush
    with the bowl's outer edge;
  * the d (lime): the bowl's right half and an ascender, mirrored exactly.
The counter in the middle is the shared negative space; the colour changes
on the vertical axis, where the two halves meet. Rotate the mark 180 degrees
and it maps onto itself (colours swapped). No wordmark: the studio's name is
the accessible name and the page title. All geometry is drawn here; no font
is involved.

    python tools/brand/make_logo.py        → public/brand/*.svg, public/favicon.svg

Files:
    pd-mark.svg / logo.svg            for dark backgrounds (ivory p, lime d)
    pd-mark-ink.svg / logo-ink.svg    for light backgrounds (charcoal p, deep lime d)
    pd-icon.svg                       app / social profile icon: the mark on a charcoal tile
    ../favicon.svg                    a heavier stroke for 16–32 px
`npm run assets` rasterises the icon files to PNG (favicon-32, apple-touch,
manifest icons, brand/pd-avatar-1024.png).
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BRAND = ROOT / "public" / "brand"

IVORY, LIME, CHARCOAL, DEEP_LIME = "#F2F0E9", "#C5F05C", "#101315", "#4F7A0C"

R = 16.0        # the bowl's outer radius
STROKE = 6.0    # the one stroke weight (0.375 R)
EXTEND = 12.0   # ascender / descender beyond the bowl


def f(x):
    return f"{x:.3f}".rstrip("0").rstrip(".")


def monogram(p_colour, d_colour, t=STROKE, extend=EXTEND):
    """Returns (svg body, viewBox). The bowl is centred on the origin."""
    r = R - t / 2                        # centre line of the ring
    xl, xr = -R + t / 2, R - t / 2       # stem centre lines, flush with the bowl's outer edge
    top, bottom = -(R + extend), R + extend
    s = f"stroke-width=\"{f(t)}\" fill=\"none\""
    body = (
        f'  <!-- p: left half of the bowl and the descender -->\n'
        f'  <path d="M0 {f(-r)}A{f(r)} {f(r)} 0 0 0 0 {f(r)}M{f(xl)} 0V{f(bottom)}" stroke="{p_colour}" {s}/>\n'
        f'  <!-- d: right half of the bowl and the ascender (the p turned 180 degrees) -->\n'
        f'  <path d="M0 {f(-r)}A{f(r)} {f(r)} 0 0 1 0 {f(r)}M{f(xr)} 0V{f(top)}" stroke="{d_colour}" {s}/>'
    )
    view = (-R, top, 2 * R, bottom - top)
    return body, view


def svg(view, body, title="P. DESIGN"):
    vb = " ".join(f(v) for v in view)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-labelledby="t">\n'
            f'  <title id="t">{title}</title>\n{body}\n</svg>\n')


def tile(body, view, size=48, height=0.72, rx=0):
    """The mark centred on a charcoal square, `height` of the tile tall."""
    x, y, w, h = view
    k = size * height / h
    tx, ty = size / 2 - (x + w / 2) * k, size / 2 - (y + h / 2) * k
    corner = f' rx="{rx}"' if rx else ""
    return (f'  <rect width="{size}" height="{size}"{corner} fill="{CHARCOAL}"/>\n'
            f'  <g transform="translate({f(tx)} {f(ty)}) scale({f(k)})">\n'
            + body.replace("\n", "\n  ") + "\n  </g>")


def write(name, text):
    path = BRAND / name if not name.startswith("../") else BRAND.parent / name[3:]
    path.write_text(text, encoding="utf-8")
    print("  wrote", path.relative_to(ROOT))


def main():
    BRAND.mkdir(parents=True, exist_ok=True)
    body, view = monogram(IVORY, LIME)
    ink, _ = monogram(CHARCOAL, DEEP_LIME)
    for name in ("pd-mark.svg", "logo.svg"):
        write(name, svg(view, body))
    for name in ("pd-mark-ink.svg", "logo-ink.svg"):
        write(name, svg(view, ink))
    write("pd-icon.svg", svg((0, 0, 48, 48), tile(body, view, height=0.62)))
    # favicon: a heavier stroke and shorter stems, so the counter stays open at 16 px
    fav, fav_view = monogram(IVORY, LIME, t=8.0, extend=9.0)
    write("../favicon.svg", svg((0, 0, 48, 48), tile(fav, fav_view, height=0.8, rx=11)))
    print(f"  mark viewBox: {' '.join(f(v) for v in view)} (aspect {view[2] / view[3]:.4f})")


if __name__ == "__main__":
    main()

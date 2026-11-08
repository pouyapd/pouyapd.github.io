"""
P. DESIGN identity — generates every logo file from one set of measurements.

The mark is a pd ligature: one continuous form, not two letters set side by side.
  * two round bowls whose centres sit one bowl-width minus one stroke apart, so
    the stroke between the two counters is shared and exactly one stroke wide;
  * the p's stem runs from the x-height down, flush with the left bowl's outer
    edge; the d's stem runs from the baseline up, flush with the right bowl's;
  * one stroke weight throughout; flat stem ends; the bowls overshoot the stem
    ends slightly so round and straight look the same height.
Turned through 180 degrees the mark maps onto itself (the p becomes the d), the
idea of the earlier shared-ring mark (tools/brand/legacy/shared-ring-2026-10/)
kept in a form that reads as "pd" at a glance. The proportions are close to
square (58 x 56), so it holds its size in the header and on a favicon tile.

It is drawn in one colour: ivory on dark, charcoal on light. Lime is kept for
action (buttons, focus) and for the favicon tile, where it marks the tab.
No wordmark: the studio's name is the accessible name and the page title. All
geometry is drawn here; no font is involved.

    python tools/brand/make_logo.py        → public/brand/*.svg, public/favicon.svg

Files:
    pd-mark.svg / logo.svg            for dark backgrounds (ivory)
    pd-mark-ink.svg / logo-ink.svg    for light backgrounds (charcoal)
    pd-icon.svg                       app / social profile icon: the mark on a charcoal tile
    ../favicon.svg                    a heavier cut with shorter stems on a lime tile, for 16–32 px
`npm run assets` rasterises the icon files to PNG (favicon-32, apple-touch,
manifest icons, brand/pd-avatar-1024.png).
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BRAND = ROOT / "public" / "brand"

IVORY, LIME, CHARCOAL = "#F2F0E9", "#C5F05C", "#101315"

R = 16.0          # a bowl's outer radius (the x-height is 2R)
STROKE = 6.0      # the one stroke weight
EXTEND = 12.0     # ascender / descender beyond the x-height and baseline
OVERSHOOT = 0.5   # the bowls rise this much past the stems' ends


def f(x):
    return f"{x:.3f}".rstrip("0").rstrip(".")


def ring(cx, r):
    return f"M{f(cx - r)} 0a{f(r)} {f(r)} 0 1 0 {f(2 * r)} 0a{f(r)} {f(r)} 0 1 0 {f(-2 * r)} 0"


def monogram(colour, t=STROKE, extend=EXTEND, overshoot=OVERSHOOT):
    """Returns (svg body, viewBox). The mark is centred on the origin."""
    c = R - t / 2                      # each bowl's centre, ±c: the shared stroke is t wide
    r = R - t / 2                      # centre line of each bowl's stroke
    xp, xd = -c - R + t / 2, c + R - t / 2   # stem centre lines, flush with the outer edges
    top = R - overshoot                # stems stop just inside the bowls' extremes
    body = (
        f'  <g fill="none" stroke="{colour}" stroke-width="{f(t)}">\n'
        f'    <path d="{ring(-c, r)}"/>\n'
        f'    <path d="{ring(c, r)}"/>\n'
        f'    <!-- p: from the x-height to the descender; d: from the baseline to the ascender -->\n'
        f'    <path d="M{f(xp)} {f(-top)}V{f(R + extend)}M{f(xd)} {f(top)}V{f(-(R + extend))}"/>\n'
        f'  </g>'
    )
    w = 2 * (c + R)
    view = (-w / 2, -(R + extend), w, 2 * (R + extend))
    return body, view


def svg(view, body, title="P. DESIGN"):
    vb = " ".join(f(v) for v in view)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" role="img" aria-labelledby="t">\n'
            f'  <title id="t">{title}</title>\n{body}\n</svg>\n')


def tile(body, view, fill, size=48, scale=0.72, rx=0):
    """The mark centred on a square tile, its larger side `scale` of the tile."""
    x, y, w, h = view
    k = size * scale / max(w, h)
    tx, ty = size / 2 - (x + w / 2) * k, size / 2 - (y + h / 2) * k
    corner = f' rx="{rx}"' if rx else ""
    return (f'  <rect width="{size}" height="{size}"{corner} fill="{fill}"/>\n'
            f'  <g transform="translate({f(tx)} {f(ty)}) scale({f(k)})">\n'
            + body.replace("\n", "\n  ") + "\n  </g>")


def write(name, text):
    path = BRAND / name if not name.startswith("../") else BRAND.parent / name[3:]
    path.write_text(text, encoding="utf-8")
    print("  wrote", path.relative_to(ROOT))


def main():
    BRAND.mkdir(parents=True, exist_ok=True)
    body, view = monogram(IVORY)
    ink, _ = monogram(CHARCOAL)
    for name in ("pd-mark.svg", "logo.svg"):
        write(name, svg(view, body))
    for name in ("pd-mark-ink.svg", "logo-ink.svg"):
        write(name, svg(view, ink))
    write("pd-icon.svg", svg((0, 0, 48, 48), tile(body, view, CHARCOAL, scale=0.6)))
    # favicon: a heavier stroke and shorter stems so both counters stay open at 16 px
    fav, fav_view = monogram(CHARCOAL, t=7.2, extend=8.0, overshoot=0.6)
    write("../favicon.svg", svg((0, 0, 48, 48), tile(fav, fav_view, LIME, scale=0.8, rx=11)))
    print(f"  mark viewBox: {' '.join(f(v) for v in view)} (aspect {view[2] / view[3]:.4f})")


if __name__ == "__main__":
    main()

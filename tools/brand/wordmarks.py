"""
Concept-site wordmarks as SVG outlines.

Selected Work shows each concept's name in its own typeface. Shipping three
display fonts to the home page would delay the first screen, so the names are
converted to outlines once, here, from the (OFL) Fontsource files installed as
dev dependencies, and written to src/content/generated/wordmarks.json.

    python tools/brand/wordmarks.py

Requires fontTools and, for the woff2 variable fonts, brotli (`pip install fonttools brotli`).
"""

import json
from pathlib import Path

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[2]
FONTS = ROOT / "node_modules" / "@fontsource"
OUT = ROOT / "src" / "content" / "generated" / "wordmarks.json"

# slug: (font file, text, tracking in em) — as set in the concept mockups (tools/mockups/*.html)
MARKS = {
    "maison-aurel": ("bodoni-moda/files/bodoni-moda-latin-400-normal.woff", "MAISON AUREL", 0.34),
    "anar": ("fraunces/files/fraunces-latin-400-italic.woff", "Anar", -0.02),
    "lune": ("cormorant-garamond/files/cormorant-garamond-latin-300-italic.woff", "Lune", 0.0),
    # variable fonts: (file, text, tracking, axes) — an instance is cut at those axis values
    "tensile": ("../@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2", "TENSILE", 0.03, {"wght": 860, "wdth": 62}),
    "p-design": ("../@fontsource-variable/geist/files/geist-latin-wght-normal.woff2", "P. DESIGN", 0.05, {"wght": 500}),
}


def outline(font_file, text, tracking, axes=None):
    font = TTFont(FONTS / font_file)
    if axes:
        font = instantiateVariableFont(font, axes)
    upm = font["head"].unitsPerEm
    cmap = font.getBestCmap()
    glyphs = font.getGlyphSet()
    hmtx = font["hmtx"]
    pen = SVGPathPen(glyphs)
    bounds = BoundsPen(glyphs)
    x = 0.0
    for i, ch in enumerate(text):
        name = cmap[ord(ch)]
        # flip y (font units point up) and advance
        t = (1, 0, 0, -1, x, 0)
        glyphs[name].draw(TransformPen(pen, t))
        glyphs[name].draw(TransformPen(bounds, t))
        x += hmtx[name][0] + (tracking * upm if i < len(text) - 1 else 0)
    x0, y0, x1, y1 = bounds.bounds
    pad = upm * 0.02
    return {
        "d": pen.getCommands(),
        "viewBox": f"{x0 - pad:.0f} {y0 - pad:.0f} {x1 - x0 + 2 * pad:.0f} {y1 - y0 + 2 * pad:.0f}",
        "text": text,
    }


def main():
    data = {slug: outline(*spec) for slug, spec in MARKS.items()}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, indent=1) + "\n", encoding="utf-8")
    for slug, d in data.items():
        print(f"  {slug}: {len(d['d']) / 1024:.1f} KB path")


if __name__ == "__main__":
    main()

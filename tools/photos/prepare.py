"""
Grades the licensed photographs used inside the concept websites so each set
reads as one art-directed shoot, then writes web-sized copies the mockups use.

    python tools/photos/prepare.py            → tools/photos/<set>/out/<key>.jpg
    python tools/photos/prepare.py lune       (only the named sets)

Each set folder holds:
    sources.tsv   key, Unsplash image id, photo page, photographer, subject
    src/          the downloads (https://images.unsplash.com/<id>?w=2000)
The grade is deliberately light: a shared white balance, a slight matte lift in
the shadows, and hue-selective desaturation of colours that fight the palette
(e.g. the blue towels in the lash photos). Nothing in a picture is added or
removed; crops happen in the mockups with object-fit.
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
MAX_W = 1600

# per set: white balance (r, g, b gains), shadow lift, hue bands to calm (deg from, deg to, keep)
GRADES = {
    "lune": dict(gains=(1.03, 1.0, 0.95), lift=0.035, calm=[(160, 260, 0.28)], tint_bw=(1.0, 0.94, 0.86)),
    "anar": dict(gains=(1.04, 1.0, 0.93), lift=0.02, calm=[(160, 260, 0.45)], tint_bw=(1.0, 0.92, 0.82)),
    "aurel": dict(gains=(1.02, 1.0, 0.96), lift=0.015, calm=[(160, 260, 0.5)], tint_bw=(1.0, 0.95, 0.88)),
    # Tensile Athletic Club: deep shadows, warm neutral highlights; the gyms' teal and blue lights calmed
    "tensile": dict(gains=(1.02, 1.0, 0.97), lift=0.01, calm=[(80, 280, 0.22)], tint_bw=(1.0, 0.97, 0.93)),
}


def rgb_to_hsv(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1)
    d = mx - mn + 1e-8
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    s = np.where(mx > 0, (mx - mn) / (mx + 1e-8), 0)
    return h, s, mx


def grade(img, gains, lift, calm, tint_bw):
    a = np.asarray(img.convert("RGB"), dtype=np.float32) / 255
    h, s, v = rgb_to_hsv(a)
    lum = (a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32))[..., None]
    if float(s.mean()) < 0.04:  # a black-and-white photograph: tone it to the set's paper colour
        a = lum * np.array(tint_bw, dtype=np.float32)
    else:
        for lo, hi, keep in calm:
            band = ((h >= lo) & (h <= hi)).astype(np.float32)
            # feather the band edges by 15 degrees
            edge = np.clip(np.minimum(h - lo + 15, hi + 15 - h) / 15, 0, 1) * (1 - band) * ((h > lo - 15) & (h < hi + 15))
            w = (band + edge)[..., None] * (s[..., None] ** 0.5)
            a = a * (1 - w) + (lum + (a - lum) * keep) * w
        a = a * np.array(gains, dtype=np.float32)
    a = lift + (1 - lift) * np.clip(a, 0, 1)
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


def main():
    only = set(sys.argv[1:])
    for name, g in GRADES.items():
        if only and name not in only:
            continue
        folder = ROOT / name
        if not (folder / "src").exists():
            continue
        out = folder / "out"
        out.mkdir(exist_ok=True)
        for f in sorted((folder / "src").glob("*.jpg")):
            im = Image.open(f)
            if im.width > MAX_W:
                im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
            grade(im, **g).save(out / f.name, quality=88, optimize=True, progressive=True)
            print("  ", name, f.name)


if __name__ == "__main__":
    main()

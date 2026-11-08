"""
Seamless, horizontally tileable low-mist texture for the hero's atmosphere layer.

    python tools/scene/atmosphere.py   ->  tools/scene/out/mist.png (RGBA)

The site translates two copies side by side; the strip's ends are cross-faded
so the seam is invisible.
"""
import numpy as np
from PIL import Image

from render import F, OUT, fbm, smoothstep

W, H = 2048, 384


def main():
    B = 384  # overlap that is cross-faded into the start, which makes the strip tile seamlessly
    x = np.arange(W + B, dtype=F)
    y = np.arange(H, dtype=F)
    X, Y = np.meshgrid(x, y)
    # stretched noise: long, low banks of mist
    n = 0.65 * fbm(X / 420.0, Y / 70.0, 6, 5) + 0.35 * fbm(X / 170.0 + 9.0, Y / 34.0, 5, 13)
    t = (np.arange(B, dtype=F) / B)[None, :]
    n = np.concatenate([n[:, W:W + B] * (1 - t) + n[:, :B] * t, n[:, B:W]], 1)
    v = Y[:, :W] / H
    profile = smoothstep(0.05, 0.6, v) * (1 - smoothstep(0.85, 1.0, v))
    a = np.clip((n - 0.42) * 2.4, 0, 1) * profile
    a = a ** 1.25 * 0.8
    r = 0.93 + 0.05 * a
    g = 0.86 + 0.03 * a
    b = 0.80 - 0.02 * a
    rgba = np.stack([r, g, b, a], -1)
    Image.fromarray((np.clip(rgba, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').save(OUT / 'mist.png', optimize=True)
    print('mist.png written')


if __name__ == '__main__':
    main()

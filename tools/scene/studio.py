"""
P. DESIGN — studio renderer for concept-website imagery.

Indoor counterpart to render.py: closed rooms and product still-lifes built
from signed distance fields, lit by soft point lights (optionally through a
window "gobo"), with one reflection bounce for metal, mirror and gloss,
emissive lamps, bloom and a depth-of-field pass.

Everything here is original, generated artwork for the three concept studies
(jewellery, restaurant, beauty salon) and the service previews:

    python tools/scene/studio.py all
    python tools/scene/studio.py aurel-hero --preview

Outputs: tools/scene/out/<name>.png
"""

from __future__ import annotations

import argparse
import math
import time
from dataclasses import dataclass, field
from typing import Callable

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, zoom

from render import (F, OUT, _hash2, col3, dot, downsample, fbm, mix, norm, save_rgb, sd_box, sd_sphere,
                    smoothstep, tonemap, vignette)

# --------------------------------------------------------------------------
# geometry helpers
# --------------------------------------------------------------------------


def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b + (a - b) * h - k * h * (1 - h)


def rot(a_, b_, ang):
    c, s = math.cos(ang), math.sin(ang)
    return c * a_ - s * b_, s * a_ + c * b_


def sd_cyl(px, py, pz, c, r, h, rr=0.0):
    """Vertical cylinder centred at c, radius r, half-height h, edge rounding rr."""
    dx = np.sqrt((px - c[0]) ** 2 + (pz - c[2]) ** 2) - (r - rr)
    dy = np.abs(py - c[1]) - (h - rr)
    return np.minimum(np.maximum(dx, dy), 0) + np.sqrt(np.maximum(dx, 0) ** 2 + np.maximum(dy, 0) ** 2) - rr


def sd_torus_local(qx, qy, qz, R, r):
    """Torus in the local xz-plane (axis = y)."""
    q = np.sqrt(qx * qx + qz * qz) - R
    return np.sqrt(q * q + qy * qy) - r


def sd_torus(px, py, pz, c, R, r, tilt_x=0.0, tilt_z=0.0, yaw=0.0):
    x, y, z = px - c[0], py - c[1], pz - c[2]
    x, z = rot(x, z, yaw)
    y, z = rot(y, z, tilt_x)
    x, y = rot(x, y, tilt_z)
    return sd_torus_local(x, y, z, R, r)


def sd_rbox(px, py, pz, c, h, rr):
    return sd_box(px, py, pz, c, (h[0] - rr, h[1] - rr, h[2] - rr)) - rr


def sd_ellipsoid(px, py, pz, c, r):
    x, y, z = (px - c[0]) / r[0], (py - c[1]) / r[1], (pz - c[2]) / r[2]
    k0 = np.sqrt(x * x + y * y + z * z)
    k1 = np.sqrt((x / r[0]) ** 2 + (y / r[1]) ** 2 + (z / r[2]) ** 2)
    return k0 * (k0 - 1.0) / np.maximum(k1, 1e-6)


def sd_arch2d(qx, qy, w, h):
    """Round-headed arch opening: half-width w, straight height h (from y=0), semicircle on top."""
    rect = np.maximum(np.abs(qx) - w, np.maximum(-qy, qy - h))
    circ = np.sqrt(qx * qx + (qy - h) ** 2) - w
    # the half-disc overlaps the rectangle below the spring line: no internal seam
    return np.minimum(rect, np.maximum(circ, (h - w * 0.5) - qy))


# --------------------------------------------------------------------------
# materials and scene description
# --------------------------------------------------------------------------


@dataclass
class Mat:
    albedo: tuple = (0.6, 0.6, 0.6)
    gloss: float = 0.1          # specular strength (dielectric)
    shine: float = 24.0         # Blinn exponent
    metal: bool = False
    reflect: float = 0.0        # 0..1 mirror-like reflection amount (traced)
    emit: tuple | None = None
    sheen: tuple | None = None  # grazing-angle colour (velvet, pearl)
    tex: Callable | None = None  # (x, y, z) -> (3, n) albedo multiplier


@dataclass
class Light:
    pos: tuple
    color: tuple = (1.0, 0.9, 0.8)
    power: float = 10.0
    soft: float = 10.0          # shadow sharpness (higher = sharper)
    gobo: Callable | None = None  # (x, y, z) -> 0..1 light mask (window frames, blinds)


@dataclass
class Cam:
    pos: tuple
    target: tuple
    vfov: float = 35.0
    width: int = 1600
    height: int = 900
    focus: float | None = None  # focus distance; None = no depth of field
    aperture: float = 0.0       # depth-of-field strength


@dataclass
class Scene:
    name: str
    cam: Cam
    objects: list               # [(sdf(px,py,pz)->d, mat_index)]
    mats: list
    lights: list
    env: Callable               # escaped ray direction -> colour (3, n)
    ambient_up: tuple = (0.08, 0.08, 0.09)
    ambient_down: tuple = (0.03, 0.03, 0.03)
    exposure: float = 1.0
    bloom: float = 0.25
    vignette: float = 0.2
    bounds: tuple = (-20, -1, -20, 20, 20, 20)
    steps: int = 220
    grade: tuple = (1.0, 1.0, 1.0)


# --------------------------------------------------------------------------
# renderer
# --------------------------------------------------------------------------


class Studio:
    def __init__(self, s: Scene):
        self.s = s
        b = np.array(s.bounds, F)
        self.lo, self.hi = b[:3], b[3:]

    def sdf(self, px, py, pz):
        d = np.full(px.size, 1e9, F)
        m = np.zeros(px.size, np.int16)
        for fn, mi in self.s.objects:
            dd = fn(px, py, pz).astype(F)
            sel = dd < d
            d = np.where(sel, dd, d)
            m[sel] = mi
        return d, m

    def aabb(self, o, d):
        t0 = np.zeros_like(o[0])
        t1 = np.full_like(o[0], 1e9)
        for k in range(3):
            inv = 1.0 / np.where(np.abs(d[k]) < 1e-8, 1e-8, d[k])
            a = (self.lo[k] - o[k]) * inv
            b = (self.hi[k] - o[k]) * inv
            t0 = np.maximum(t0, np.minimum(a, b))
            t1 = np.minimum(t1, np.maximum(a, b))
        return np.maximum(t0, 0), t1

    def march(self, o, d, t0, t1):
        n = o[0].size
        t = t0.copy()
        hit = np.zeros(n, bool)
        mid = np.zeros(n, np.int16)
        act = np.nonzero(t0 < t1)[0]
        for _ in range(self.s.steps):
            if act.size == 0:
                break
            ta = t[act]
            dist, m = self.sdf(o[0][act] + d[0][act] * ta, o[1][act] + d[1][act] * ta, o[2][act] + d[2][act] * ta)
            done = dist < np.maximum(0.0004 * ta, 0.0006)
            hit[act[done]] = True
            mid[act[done]] = m[done]
            t[act] = ta + np.where(done, 0, dist * 0.9)
            keep = (~done) & (t[act] < t1[act])
            act = act[keep]
        return t, hit, mid

    def normal(self, px, py, pz):
        e = 0.0015
        nx = np.zeros_like(px)
        ny = np.zeros_like(px)
        nz = np.zeros_like(px)
        for a, b, c in ((1, -1, -1), (-1, -1, 1), (-1, 1, -1), (1, 1, 1)):
            dd, _ = self.sdf(px + a * e, py + b * e, pz + c * e)
            nx += a * dd
            ny += b * dd
            nz += c * dd
        return norm((nx, ny, nz))

    def shadow(self, p, ldir, dist, k):
        n = p[0].size
        res = np.ones(n, F)
        t = np.full(n, 0.01, F)
        act = np.arange(n)
        for _ in range(110):
            if act.size == 0:
                break
            ta = t[act]
            dd, _ = self.sdf(p[0][act] + ldir[0][act] * ta, p[1][act] + ldir[1][act] * ta, p[2][act] + ldir[2][act] * ta)
            res[act] = np.minimum(res[act], k * dd / ta)
            t[act] = ta + np.clip(dd * 0.8, 0.006, 0.25)
            keep = (res[act] > 0.003) & (t[act] < dist[act])
            act = act[keep]
        return smoothstep(0.0, 1.0, np.clip(res, 0, 1))

    def ao(self, p, n):
        occ = np.zeros_like(p[0])
        sca = 1.0
        for i in range(5):
            h = 0.01 + 0.09 * i
            dd, _ = self.sdf(p[0] + n[0] * h, p[1] + n[1] * h, p[2] + n[2] * h)
            occ += (h - dd) * sca
            sca *= 0.7
        return np.clip(1.0 - 2.2 * occ, 0, 1)

    def shade(self, o, d, t, mid, depth):
        s = self.s
        p = (o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t)
        n = self.normal(*p)
        nv = np.clip(-dot(d, n), 0, 1)
        alb = np.zeros((3, t.size), F)
        gloss = np.zeros(t.size, F)
        shine = np.ones(t.size, F)
        metal = np.zeros(t.size, bool)
        refl = np.zeros(t.size, F)
        emit = np.zeros((3, t.size), F)
        sheen = np.zeros((3, t.size), F)
        for mi, mat in enumerate(s.mats):
            sel = mid == mi
            if not sel.any():
                continue
            a = col3(mat.albedo) * np.ones(sel.sum(), F)
            if mat.tex is not None:
                a = a * mat.tex(p[0][sel], p[1][sel], p[2][sel])
            alb[:, sel] = a
            gloss[sel] = mat.gloss
            shine[sel] = mat.shine
            metal[sel] = mat.metal
            refl[sel] = mat.reflect
            if mat.emit is not None:
                emit[:, sel] = col3(mat.emit)
            if mat.sheen is not None:
                sheen[:, sel] = col3(mat.sheen) * ((1 - nv[sel]) ** 3)

        occ = self.ao(p, n)
        diff_w = np.where(metal, 0.0, 1.0).astype(F)
        c = emit + sheen * occ
        hemi = mix(col3(s.ambient_down), col3(s.ambient_up), 0.5 + 0.5 * n[1])
        c = c + alb * diff_w * hemi * occ
        lit = emit.sum(0) < 1e-6
        for L in s.lights:
            lx, ly, lz = L.pos[0] - p[0], L.pos[1] - p[1], L.pos[2] - p[2]
            dist = np.sqrt(lx * lx + ly * ly + lz * lz) + 1e-6
            ld = (lx / dist, ly / dist, lz / dist)
            ndl = np.clip(dot(n, ld), 0, 1)
            vis = np.zeros_like(ndl)
            sel = (ndl > 0) & lit
            if sel.any():
                i = np.nonzero(sel)[0]
                pp = tuple(p[k][i] + n[k][i] * 0.008 for k in range(3))
                vis[i] = self.shadow(pp, tuple(ld[k][i] for k in range(3)), dist[i] - 0.05, L.soft)
                if L.gobo is not None:
                    vis[i] *= L.gobo(p[0][i], p[1][i], p[2][i])
            atten = L.power / (1.0 + dist * dist)
            hx, hy, hz = norm((ld[0] - d[0], ld[1] - d[1], ld[2] - d[2]))
            nh = np.clip(n[0] * hx + n[1] * hy + n[2] * hz, 0, 1)
            spec = nh ** shine * (shine + 8) / 25.0
            spec_col = np.where(metal, alb, np.ones_like(alb)) * np.where(metal, 1.0, gloss)
            c = c + col3(L.color) * (atten * vis * ndl) * (alb * diff_w + spec_col * spec)

        # one traced reflection bounce for metal, mirror and gloss
        fres = 0.04 + 0.96 * (1 - nv) ** 5
        k_ref = np.where(metal, 1.0, refl + gloss * fres * 0.6)
        want = (k_ref > 0.01) & (depth == 0)
        if want.any():
            i = np.nonzero(want)[0]
            vd = dot(d, n)
            r = norm((d[0] - 2 * vd * n[0], d[1] - 2 * vd * n[1], d[2] - 2 * vd * n[2]))
            ro = tuple(p[k][i] + n[k][i] * 0.006 for k in range(3))
            rc, _ = self.trace(ro, tuple(r[k][i] for k in range(3)), depth=1)
            tint = np.where(metal[i], alb[:, i] * (0.75 + 0.25 * fres[i]) , 1.0)
            c[:, i] = c[:, i] + rc * tint * k_ref[i]
        return c

    def trace(self, o, d, depth=0):
        n = o[0].size
        c = np.zeros((3, n), F)
        t0, t1 = self.aabb(o, d)
        t, hit, mid = self.march(o, d, t0, t1)
        if hit.any():
            i = np.nonzero(hit)[0]
            c[:, i] = self.shade(tuple(a[i] for a in o), tuple(a[i] for a in d), t[i], mid[i], depth)
        if (~hit).any():
            i = np.nonzero(~hit)[0]
            c[:, i] = self.s.env(tuple(a[i] for a in d))
        return c, np.where(hit, t, 1e3)

    def rays(self, rows, W, H):
        cam = self.s.cam
        pos = np.array(cam.pos, F)
        f = np.array(cam.target, F) - pos
        f /= np.linalg.norm(f)
        r = np.cross(np.array([0, 1, 0], F), f)
        r /= np.linalg.norm(r)
        u = np.cross(f, r)
        th = math.tan(math.radians(cam.vfov) / 2)
        xs = ((np.arange(W, dtype=F) + 0.5) / W * 2 - 1) * th * (W / H)
        ys = (1 - (rows.astype(F) + 0.5) / H * 2) * th
        X, Y = np.meshgrid(xs, ys)
        X, Y = X.ravel(), Y.ravel()
        d = norm((f[0] + X * r[0] + Y * u[0], f[1] + X * r[1] + Y * u[1], f[2] + X * r[2] + Y * u[2]))
        o = tuple(np.full_like(X, v) for v in cam.pos)
        return o, d

    def render(self, ss=2, scale=1.0, chunk=64):
        cam = self.s.cam
        W, H = int(cam.width * scale) * ss, int(cam.height * scale) * ss
        img = np.zeros((H, W, 3), F)
        depth = np.zeros((H, W), F)
        t0 = time.time()
        for y in range(0, H, chunk):
            rows = np.arange(y, min(H, y + chunk))
            o, d = self.rays(rows, W, H)
            c, t = self.trace(o, d)
            img[rows[0]:rows[-1] + 1] = c.T.reshape(len(rows), W, 3)
            depth[rows[0]:rows[-1] + 1] = t.reshape(len(rows), W)
            print(f"\r  {self.s.name}: {min(1, (y + chunk) / H) * 100:5.1f}%  {time.time() - t0:6.1f}s", end="", flush=True)
        print()
        return downsample(img, ss), downsample(depth, ss)


def _blur(a, radius):
    sig = (radius, radius, 0) if a.ndim == 3 else (radius, radius)
    return gaussian_filter(a.astype(np.float32), sig, mode="nearest")


def post(s: Scene, img, depth):
    H, W = img.shape[:2]
    # bloom from the bright end of the HDR image
    bright = np.maximum(img - 0.9, 0)
    small = _blur(bright[::4, ::4], W * 0.012 / 4)
    bl = zoom(small, (H / small.shape[0], W / small.shape[1], 1), order=1)[:H, :W]
    img = img + bl * s.bloom
    x = tonemap(img * np.array(s.grade, F), s.exposure)
    # depth of field: blend progressively blurred copies by circle of confusion
    cam = s.cam
    if cam.focus and cam.aperture > 0:
        coc = np.clip(np.abs(1.0 / np.maximum(depth, 1e-3) - 1.0 / cam.focus) * cam.aperture, 0, 1)
        coc = _blur(coc, W * 0.003)[..., None]
        levels = [x] + [_blur(x, W * r) for r in (0.0025, 0.006, 0.012)]
        pos = coc * 3
        out = np.zeros_like(x)
        for i in range(4):
            w = np.clip(1 - np.abs(pos - i), 0, 1)
            out += levels[i] * w
        x = out
    x = vignette(x, s.vignette)
    # very fine grain keeps gradients from banding after compression
    rng = np.random.default_rng(7)
    x = x + (rng.random(x.shape[:2], dtype=np.float32)[..., None] - 0.5) * (1.5 / 255)
    return np.clip(x, 0, 1)


# --------------------------------------------------------------------------
# textures and environments
# --------------------------------------------------------------------------


def tex_plaster(scale=1.6, amount=0.10, seed=3):
    def f(x, y, z):
        n = fbm((x + z * 0.7) * scale, y * scale, 5, seed)
        m = 1 - amount + amount * 2 * n
        return np.stack([m, m, m])
    return f


def tex_marble(vein=(0.55, 0.5, 0.46), scale=2.2, seed=11):
    def f(x, y, z):
        w = fbm(x * scale, (y + z) * scale, 5, seed)
        v = np.abs(np.sin((x * 1.7 + y * 0.6 + z * 0.9 + w * 3.2) * 3.0))
        line = smoothstep(0.08, 0.0, v)
        base = 0.94 + 0.08 * fbm(x * 7, z * 7 + y * 3, 3, seed + 3)
        return mix(np.stack([base, base, base]), col3(vein) / 0.9, line * 0.55)
    return f


def tex_travertine(scale=3.0, seed=21):
    def f(x, y, z):
        bands = 0.92 + 0.08 * np.sin((y * 18 + fbm(x * scale, z * scale, 4, seed) * 6))
        pits = 1 - 0.18 * smoothstep(0.72, 0.8, fbm(x * 14 + z * 9, y * 14, 3, seed + 5))
        m = bands * pits
        return np.stack([m, m * 0.985, m * 0.96])
    return f


def tex_speckle(scale=40, seed=31, amount=0.25):
    def f(x, y, z):
        n = vnoise_cell(x * scale + z * scale * 0.7, y * scale + z * scale * 0.3, seed)
        m = 1 - amount * (n > 0.86)
        return np.stack([m, m, m])
    return f


def vnoise_cell(x, y, seed):
    return _hash2(np.floor(x).astype(np.int64), np.floor(y).astype(np.int64), seed)


def tex_floor(scale=2.5, amount=0.07, seed=27):
    """Horizontal stone: noise over x/z (plaster noise would streak on a flat floor)."""
    def f(x, y, z):
        m = 1 - amount + amount * 2 * fbm(x * scale, z * scale, 5, seed)
        return np.stack([m, m, m])
    return f


def tex_wood(scale=5.0, seed=41):
    def f(x, y, z):
        g = np.sin((x * scale + fbm(x * 0.8, z * 6, 4, seed) * 4.0) * 6.0) * 0.5 + 0.5
        m = 0.82 + 0.18 * g
        return np.stack([m, m * 0.96, m * 0.9])
    return f


def tex_linen(seed=51):
    def f(x, y, z):
        w = 0.94 + 0.06 * np.sin(x * 260) * np.sin(z * 260) + 0.04 * fbm(x * 30, z * 30, 3, seed)
        return np.stack([w, w, w])
    return f


def env_studio(dark=(0.01, 0.01, 0.012), boxes=()):
    """Dark studio with rectangular softboxes: boxes = [(dir, size, colour)]."""
    def f(d):
        c = col3(dark) * np.ones(d[0].size, F)
        for bdir, size, colr in boxes:
            u = np.array(bdir, F)
            u = u / np.linalg.norm(u)
            cs = dot(d, u)
            m = smoothstep(math.cos(size * 1.15), math.cos(size), cs)
            c = c + col3(colr) * m
        return c
    return f


def env_sunset(horizon=(1.6, 0.9, 0.5), top=(0.5, 0.35, 0.3)):
    def f(d):
        e = np.clip(d[1], -0.2, 1)
        g = np.exp(-np.maximum(e, 0) * 5)
        return mix(col3(top), col3(horizon), g) * np.ones(d[0].size, F)
    return f


def gobo_window(axis='x', at=0.0, panes=(3, 2), size=(1.2, 1.6), center=(0.0, 1.6), frame=0.06, light_pos=(0, 0, 0)):
    """Projects a window with mullions from the light onto the scene (shadow pattern)."""
    lp = np.array(light_pos, F)

    def f(x, y, z):
        # intersect segment point->light with the window plane
        if axis == 'x':
            t = (at - x) / np.where(np.abs(lp[0] - x) < 1e-6, 1e-6, (lp[0] - x))
            u = z + (lp[2] - z) * t
        else:
            t = (at - z) / np.where(np.abs(lp[2] - z) < 1e-6, 1e-6, (lp[2] - z))
            u = x + (lp[0] - x) * t
        v = y + (lp[1] - y) * t
        uu = (u - center[0]) / size[0] + 0.5
        vv = (v - center[1]) / size[1] + 0.5
        inside = (uu > 0) & (uu < 1) & (vv > 0) & (vv < 1)
        fu = np.abs((uu * panes[0]) % 1.0 - 0.5) * size[0] / panes[0]
        fv = np.abs((vv * panes[1]) % 1.0 - 0.5) * size[1] / panes[1]
        bar = np.minimum(size[0] / panes[0] / 2 - fu, size[1] / panes[1] / 2 - fv)
        open_ = smoothstep(0.0, frame * 0.5, bar - frame * 0.5)
        return np.where(inside, open_, 0.0).astype(F)
    return f


# --------------------------------------------------------------------------
# object builders
# --------------------------------------------------------------------------


def floor_wall_sweep(floor_y=0.0, wall_z=4.0, radius=1.2):
    def f(px, py, pz):
        return smin(py - floor_y, wall_z - pz, radius)
    return f


def pomegranate(c, r):
    def f(px, py, pz):
        body = sd_ellipsoid(px, py, pz, c, (r, r * 0.92, r))
        crown = sd_cyl(px, py, pz, (c[0], c[1] + r * 0.95, c[2]), r * 0.28, r * 0.16, r * 0.04)
        hollow = sd_cyl(px, py, pz, (c[0], c[1] + r * 1.05, c[2]), r * 0.18, r * 0.14)
        return np.minimum(body, np.maximum(crown, -hollow))
    return f


def tex_pomegranate(seed=61):
    def f(x, y, z):
        n = fbm(x * 30, (y + z) * 30, 4, seed)
        patch = smoothstep(0.45, 0.75, fbm(x * 9 + 3, (y - z) * 9, 4, seed + 2))
        m = 0.7 + 0.4 * n
        return np.stack([m * (1.0 + 0.25 * patch), m * (0.8 + 1.6 * patch), m * (0.85 + 0.4 * patch)])
    return f


def estekan(c, r, h):
    """Persian tea glass: a vertical lathe with a pinched waist. Returns (glass, tea)."""
    def radius(py):
        t = np.clip((py - c[1]) / h, 0, 1)
        return r * (0.92 - 0.2 * np.sin(np.pi * np.clip(t * 1.15, 0, 1)) + 0.12 * t)

    def glass(px, py, pz):
        q = np.sqrt((px - c[0]) ** 2 + (pz - c[2]) ** 2)
        side = np.abs(q - radius(py)) - 0.003
        # clear glass reads only where there is no tea behind it: draw the rim band above the tea line
        return np.maximum(side, np.abs(py - c[1] - h * 0.9) - h * 0.1) * 0.7

    def tea(px, py, pz):
        q = np.sqrt((px - c[0]) ** 2 + (pz - c[2]) ** 2)
        return np.maximum(q - radius(py) + 0.001, np.abs(py - c[1] - h * 0.4) - h * 0.4) * 0.7
    return glass, tea


def bottle(c, r, h, neck_r, neck_h, cap_h, rr=0.01):
    """Cosmetic bottle: body + shoulder + neck. Cap is a separate object (other material)."""
    def body(px, py, pz):
        b = sd_cyl(px, py, pz, (c[0], c[1] + h / 2, c[2]), r, h / 2, rr * 3)
        n = sd_cyl(px, py, pz, (c[0], c[1] + h + neck_h / 2, c[2]), neck_r, neck_h / 2 + 0.005, rr)
        return smin(b, n, r * 0.35)

    def cap(px, py, pz):
        return sd_cyl(px, py, pz, (c[0], c[1] + h + neck_h + cap_h / 2 - 0.004, c[2]), neck_r * 1.35, cap_h / 2, rr)
    return body, cap


# --------------------------------------------------------------------------
# scenes
# --------------------------------------------------------------------------

GOLD = Mat((1.0, 0.74, 0.38), metal=True, shine=180)
GOLD_SOFT = Mat((0.98, 0.76, 0.46), metal=True, shine=90)


def scene_aurel_hero():
    # Maison Aurel — gold on stone, in a deep charcoal studio
    mats = [
        Mat((0.022, 0.02, 0.02), gloss=0.02, sheen=(0.05, 0.04, 0.035), tex=tex_plaster(2.0, 0.08)),  # backdrop velvet
        Mat((0.42, 0.39, 0.35), gloss=0.12, shine=40, tex=tex_travertine()),                            # plinth
        GOLD,
        Mat((0.92, 0.9, 0.86), gloss=0.9, shine=120, sheen=(0.25, 0.2, 0.28), reflect=0.12),           # pearl
        Mat((0.09, 0.085, 0.08), gloss=0.35, shine=90, tex=tex_marble((0.5, 0.45, 0.38))),            # nero marble
    ]
    objs = [
        (floor_wall_sweep(0.0, 5.0, 1.6), 0),
        (lambda x, y, z: sd_cyl(x, y, z, (0.85, 0.55, 2.4), 0.62, 0.55, 0.02), 1),
        (lambda x, y, z: sd_rbox(x, y, z, (-0.25, 0.25, 2.1), (0.42, 0.25, 0.42), 0.015), 4),
        (lambda x, y, z: sd_torus(x, y, z, (0.85, 1.1 + 0.30 + 0.05, 2.35), 0.30, 0.048, tilt_x=math.pi / 2, yaw=0.5), 2),
        (lambda x, y, z: sd_torus(x, y, z, (-0.2, 0.5 + 0.026, 2.0), 0.19, 0.026, tilt_x=0.05), 2),
        (lambda x, y, z: sd_sphere(x, y, z, (1.25, 1.1 + 0.085, 2.25), 0.085), 3),
        (lambda x, y, z: sd_sphere(x, y, z, (-0.05, 0.5 + 0.06, 1.88), 0.06), 3),
    ]
    lights = [
        Light((-1.6, 4.4, 0.6), (1.0, 0.84, 0.66), 22, soft=14),
        Light((3.4, 2.4, 4.6), (1.0, 0.78, 0.55), 30, soft=6),
        Light((0.2, 3.5, -3.5), (0.5, 0.52, 0.6), 3, soft=4),
    ]
    env = env_studio((0.008, 0.007, 0.008), [((-0.6, 0.6, -0.4), 0.45, (3.0, 2.6, 2.1)), ((0.7, 0.3, 0.6), 0.25, (1.8, 1.4, 1.0))])
    cam = Cam((-0.9, 1.2, -1.7), (-0.25, 0.85, 2.3), 32, 1600, 900, focus=4.1, aperture=0.9)
    return Scene("aurel-hero", cam, objs, mats, lights, env, (0.02, 0.018, 0.017), (0.006, 0.006, 0.006),
                 exposure=1.0, bloom=0.35, vignette=0.4, bounds=(-6, -0.1, -2, 6, 6, 5.2))


def scene_aurel_ring():
    mats = [Mat((0.07, 0.062, 0.058), gloss=0.02, sheen=(0.05, 0.04, 0.04), tex=tex_plaster(3, 0.05)),
            Mat((0.64, 0.6, 0.55), gloss=0.1, tex=tex_travertine(4.0, 7)), GOLD,
            Mat((0.9, 0.88, 0.95), gloss=1.0, shine=400, reflect=0.35)]  # set stone
    objs = [
        (floor_wall_sweep(0.0, 3.0, 1.0), 0),
        (lambda x, y, z: sd_rbox(x, y, z, (0.0, 0.3, 1.5), (0.35, 0.3, 0.35), 0.012), 1),
        (lambda x, y, z: sd_torus(x, y, z, (0.0, 0.6 + 0.2 + 0.03, 1.48), 0.2, 0.032, tilt_x=math.pi / 2, yaw=0.35), 2),
        (lambda x, y, z: sd_ellipsoid(x, y, z, (0.0, 0.6 + 0.43, 1.48), (0.055, 0.045, 0.055)), 3),
    ]
    lights = [Light((-2.2, 3.0, -0.4), (1.0, 0.86, 0.7), 18, soft=14), Light((2.0, 1.8, 3.0), (0.9, 0.75, 0.6), 10, soft=6)]
    env = env_studio((0.012, 0.011, 0.012), [((-0.6, 0.7, -0.3), 0.5, (2.8, 2.5, 2.1)), ((0.8, 0.2, 0.4), 0.3, (1.4, 1.1, 0.9))])
    cam = Cam((0.35, 1.05, 0.25), (0.0, 0.78, 1.5), 28, 1000, 1000, focus=1.35, aperture=0.35)
    return Scene("aurel-ring", cam, objs, mats, lights, env, (0.03, 0.028, 0.026), (0.01, 0.01, 0.01),
                 exposure=1.1, bloom=0.35, vignette=0.25, bounds=(-4, -0.1, -1, 4, 4, 3.2))


def scene_aurel_pearls():
    mats = [Mat((0.03, 0.028, 0.03), gloss=0.03, sheen=(0.08, 0.06, 0.07), tex=tex_linen()),
            Mat((0.74, 0.72, 0.7), gloss=1.0, shine=220, sheen=(0.35, 0.26, 0.32), reflect=0.3), GOLD]
    # sample an S-curve densely, then place pearls one diameter apart along it
    ts = np.linspace(0, 1, 2000)
    xs = -0.62 + 1.24 * ts
    zs = 1.42 + 0.3 * np.sin(ts * math.pi * 2.0)
    seg = np.hypot(np.diff(xs), np.diff(zs))
    arc = np.concatenate([[0], np.cumsum(seg)])
    at = np.arange(0, arc[-1], 0.066)
    centers = np.stack([np.interp(at, arc, xs), np.full_like(at, 0.034), np.interp(at, arc, zs)], 1).astype(F)

    def pearls(px, py, pz):
        d = np.full(px.size, 1e9, F)
        for c in centers:
            d = np.minimum(d, sd_sphere(px, py, pz, c, 0.031))
        return d
    objs = [
        (lambda x, y, z: y, 0),
        (pearls, 1),
        (lambda x, y, z: sd_torus(x, y, z, (0.66, 0.012, 1.42), 0.028, 0.009), 2),
        (lambda x, y, z: sd_torus(x, y, z, (-0.66, 0.012, 1.42), 0.022, 0.008), 2),
    ]
    lights = [Light((-1.6, 2.4, 0.6), (1.0, 0.88, 0.74), 12, soft=16), Light((1.8, 1.2, 2.6), (0.8, 0.7, 0.62), 4, soft=8)]
    env = env_studio((0.015, 0.014, 0.014), [((-0.5, 0.8, 0.1), 0.6, (2.2, 2.0, 1.8))])
    cam = Cam((0.35, 0.95, 0.45), (0.0, 0.02, 1.45), 40, 1000, 1000, focus=1.35, aperture=0.6)
    return Scene("aurel-pearls", cam, objs, mats, lights, env, (0.03, 0.03, 0.03), (0.01, 0.01, 0.01),
                 exposure=1.05, bloom=0.3, vignette=0.28, bounds=(-3, -0.1, 0, 3, 3, 3))


def scene_aurel_bangle():
    mats = [Mat((0.4, 0.37, 0.34), gloss=0.05, tex=tex_plaster(2.5, 0.08)),
            Mat((0.16, 0.15, 0.145), gloss=0.25, shine=60, tex=tex_marble((0.5, 0.46, 0.4))), GOLD_SOFT]
    objs = [
        (floor_wall_sweep(0.0, 2.6, 0.9), 0),
        (lambda x, y, z: sd_sphere(x, y, z, (0.18, 0.32, 1.45), 0.32), 1),
        (lambda x, y, z: sd_torus(x, y, z, (-0.22, 0.30, 1.38), 0.28, 0.035, tilt_z=1.15, yaw=0.2), 2),
    ]
    lights = [Light((2.0, 2.6, -0.2), (1.0, 0.85, 0.68), 16, soft=10, gobo=None),
              Light((-1.8, 1.4, 2.0), (0.7, 0.72, 0.8), 4, soft=4)]
    env = env_studio((0.03, 0.028, 0.027), [((0.7, 0.6, -0.3), 0.5, (2.6, 2.3, 1.9)), ((-0.6, 0.3, 0.5), 0.4, (0.8, 0.8, 0.9))])
    cam = Cam((0.0, 0.75, -0.2), (0.0, 0.36, 1.42), 30, 1000, 1000, focus=1.65, aperture=0.4)
    return Scene("aurel-bangle", cam, objs, mats, lights, env, (0.09, 0.085, 0.08), (0.03, 0.028, 0.025),
                 exposure=1.0, bloom=0.25, vignette=0.22, bounds=(-3, -0.1, -0.5, 3, 3, 2.8))


def _anar_room_objects():
    """Shared dining-room architecture for Anar: terracotta walls, arched windows, wood floor."""
    def room(px, py, pz):
        floor = np.maximum(py, pz - 6.4)
        back = np.maximum(6.0 - pz, pz - 6.4)  # a 0.4-thick slab, open beyond
        left = px + 4.0
        right = 4.0 - px
        ceil = 3.6 - py
        walls = np.minimum(np.minimum(np.minimum(floor, back), np.minimum(left, right)), ceil)
        # three arched windows through the back wall (thickness 0.4)
        holes = np.full(px.size, 1e9, F)
        for cx in (-2.2, 0.0, 2.2):
            a2 = sd_arch2d(px - cx, py - 0.55, 0.62, 1.55)
            holes = np.minimum(holes, np.maximum(a2, np.abs(pz - 6.2) - 0.45))
        return np.maximum(walls, -holes)
    return room


def _chair(c, side):
    """Bistro chair: round seat, curved back, four thin legs. side = +1 back to the left, -1 to the right."""
    def f(px, py, pz):
        seat = sd_cyl(px, py, pz, (c[0], 0.46, c[2]), 0.22, 0.025, 0.012)
        bx = c[0] - side * 0.2
        back = np.maximum(np.abs(np.sqrt((px - c[0]) ** 2 + (pz - c[2]) ** 2) - 0.21) - 0.018, np.abs(py - 0.78) - 0.12)
        back = np.maximum(back, side * (px - bx - side * 0.05))
        legs = np.full(px.size, 1e9, F)
        for ox, oz in ((0.14, 0.14), (-0.14, 0.14), (0.14, -0.14), (-0.14, -0.14)):
            legs = np.minimum(legs, sd_cyl(px, py, pz, (c[0] + ox, 0.23, c[2] + oz), 0.014, 0.23))
        return np.minimum(np.minimum(seat, back), legs)
    return f


def scene_anar_hero():
    mats = [
        Mat((0.52, 0.26, 0.18), gloss=0.02, tex=tex_plaster(1.2, 0.12, 5)),          # terracotta plaster (room)
        Mat((0.9, 0.88, 0.84), gloss=0.05, tex=tex_linen()),                          # tablecloth
        Mat((0.93, 0.92, 0.9), gloss=0.5, shine=80),                                  # porcelain
        Mat((0.36, 0.05, 0.06), gloss=0.25, shine=30, tex=tex_pomegranate()),         # pomegranate
        Mat((0.75, 0.78, 0.78), gloss=0.9, shine=200, reflect=0.25),                  # glass (opaque stand-in)
        Mat((0.0, 0.0, 0.0), emit=(5.0, 3.4, 1.9)),                                   # lamp / flame
        Mat((0.18, 0.11, 0.07), gloss=0.2, shine=30, tex=tex_wood()),                 # wood
        Mat((0.12, 0.1, 0.09), gloss=0.3, shine=40),                                  # dark metal cord / bowl
    ]
    room = _anar_room_objects()

    def floor_only(px, py, pz):
        return py + 0.0  # floor drawn with wood material: thin slab above room floor
    objs = [
        (room, 0),
        (lambda x, y, z: sd_box(x, y, z, (0, -0.01, 2.0), (4.0, 0.02, 4.2)), 6),
        # round table: linen-covered top on a dark pedestal
        (lambda x, y, z: sd_cyl(x, y, z, (0.0, 0.74, 2.6), 0.92, 0.025, 0.012), 1),
        (lambda x, y, z: np.minimum(sd_cyl(x, y, z, (0.0, 0.37, 2.6), 0.07, 0.37), sd_cyl(x, y, z, (0.0, 0.02, 2.6), 0.36, 0.02, 0.01)), 7),
        # plates
        (lambda x, y, z: sd_cyl(x, y, z, (-0.42, 0.775, 2.3), 0.17, 0.01, 0.007), 2),
        (lambda x, y, z: sd_cyl(x, y, z, (0.45, 0.775, 2.38), 0.17, 0.01, 0.007), 2),
        # bowl with pomegranates
        (lambda x, y, z: np.maximum(sd_sphere(x, y, z, (0.0, 0.95, 2.75), 0.24), y - 0.86) , 7),
        (pomegranate((-0.07, 0.9, 2.72), 0.09), 3),
        (pomegranate((0.1, 0.9, 2.78), 0.085), 3),
        (pomegranate((0.02, 0.98, 2.68), 0.08), 3),
        # glasses
        (lambda x, y, z: sd_cyl(x, y, z, (-0.2, 0.86, 2.05), 0.035, 0.085, 0.005), 4),
        (lambda x, y, z: sd_cyl(x, y, z, (0.62, 0.86, 2.12), 0.035, 0.085, 0.005), 4),
        # candles + flames
        (lambda x, y, z: sd_cyl(x, y, z, (0.32, 0.86, 2.9), 0.025, 0.09, 0.004), 2),
        (lambda x, y, z: sd_ellipsoid(x, y, z, (0.32, 0.975, 2.9), (0.009, 0.02, 0.009)), 5),
        (lambda x, y, z: sd_cyl(x, y, z, (-0.38, 0.84, 2.95), 0.025, 0.07, 0.004), 2),
        (lambda x, y, z: sd_ellipsoid(x, y, z, (-0.38, 0.935, 2.95), (0.009, 0.02, 0.009)), 5),
        # pendant lamp
        (lambda x, y, z: sd_sphere(x, y, z, (0.0, 2.15, 2.6), 0.09), 5),
        (lambda x, y, z: sd_cyl(x, y, z, (0.0, 2.9, 2.6), 0.006, 0.72), 7),
        # chairs (simple)
        (_chair((-1.2, 0.0, 2.45), 1.0), 6),
        (_chair((1.2, 0.0, 2.6), -1.0), 6),
    ]
    sun = (0.0, 2.6, 14.0)
    lights = [
        Light(sun, (1.0, 0.7, 0.42), 900, soft=30),
        Light((0.0, 2.0, 2.6), (1.0, 0.72, 0.42), 3.2, soft=8),
        Light((0.32, 1.0, 2.9), (1.0, 0.65, 0.35), 0.25, soft=20),
        Light((0.0, 2.4, -1.0), (0.6, 0.45, 0.4), 4.0, soft=3),
    ]
    env = env_sunset((3.4, 1.8, 0.85), (1.1, 0.62, 0.48))
    cam = Cam((0.9, 1.2, -0.6), (-0.2, 1.05, 4.0), 46, 1600, 900, focus=3.4, aperture=0.6)
    return Scene("anar-hero", cam, objs, mats, lights, env, (0.16, 0.09, 0.06), (0.07, 0.035, 0.02),
                 exposure=1.1, bloom=0.4, vignette=0.32, bounds=(-4.1, -0.1, -3, 4.1, 3.7, 6.6))


def scene_anar_dish():
    # top-down: saffron rice dome with barberries and herbs on a ceramic plate
    mats = [
        Mat((0.05, 0.045, 0.04), gloss=0.03, tex=tex_linen()),         # table linen (near black)
        Mat((0.17, 0.16, 0.15), gloss=0.35, shine=50, tex=tex_plaster(7, 0.08, 5)),  # stoneware plate
        Mat((0.96, 0.86, 0.62), gloss=0.7, shine=90, tex=lambda x, y, z: np.stack([0.97 + 0.03 * _hash2(np.floor(x * 260).astype(np.int64), np.floor((z + y) * 260).astype(np.int64), 3)] * 3)),  # rice grains
        Mat((0.95, 0.48, 0.06), gloss=0.8, shine=120, tex=lambda x, y, z: np.stack([0.97 + 0.03 * _hash2(np.floor(x * 260).astype(np.int64), np.floor((z + y) * 260).astype(np.int64), 9)] * 3)),  # saffron rice
        Mat((0.42, 0.02, 0.04), gloss=0.7, shine=90),                  # barberries
        Mat((0.1, 0.2, 0.07), gloss=0.15, shine=20),                   # herbs
        Mat((0.42, 0.55, 0.2), gloss=0.3, shine=40),                   # pistachio slivers
    ]
    rng = np.random.default_rng(4)
    berries = [(0.0 + math.cos(a) * r, 0.0, 0.0 + math.sin(a) * r) for a, r in zip(rng.uniform(0, 6.28, 12), rng.uniform(0.0, 0.05, 12))]
    herbs = [(math.cos(a) * r, math.sin(a) * r, b) for a, r, b in zip(rng.uniform(0, 6.28, 9), rng.uniform(0.19, 0.26, 9), rng.uniform(0, 3.1, 9))]
    nuts = [(math.cos(a) * r, math.sin(a) * r) for a, r in zip(rng.uniform(0, 6.28, 7), rng.uniform(0.02, 0.07, 7))]

    def rice(px, py, pz):
        dome = sd_ellipsoid(px, py, pz, (0, 0.022, 0), (0.15, 0.11, 0.15))
        return np.maximum(dome, 0.023 - py)

    def cap(px, py, pz):
        dome = sd_ellipsoid(px, py, pz, (0, 0.024, 0), (0.152, 0.112, 0.152))
        return np.maximum(dome, 0.112 - py)

    def berry_fn(px, py, pz):
        d = np.full(px.size, 1e9, F)
        for (bx, _, bz) in berries:
            r2 = bx * bx + bz * bz
            by = 0.022 + 0.11 * math.sqrt(max(0, 1 - r2 / 0.0225)) + 0.005
            d = np.minimum(d, sd_sphere(px, py, pz, (bx, by, bz), 0.008))
        return d

    def herb_fn(px, py, pz):
        d = np.full(px.size, 1e9, F)
        for hx, hz, ang in herbs:
            x, z = rot(px - hx, pz - hz, ang)
            d = np.minimum(d, sd_ellipsoid(x, py, z, (0, 0.03, 0), (0.035, 0.006, 0.014)))
        return d

    def nut_fn(px, py, pz):
        d = np.full(px.size, 1e9, F)
        for nx, nz in nuts:
            r2 = nx * nx + nz * nz
            ny = 0.022 + 0.11 * math.sqrt(max(0, 1 - r2 / 0.0225)) + 0.004
            d = np.minimum(d, sd_ellipsoid(px, py, pz, (nx, ny, nz), (0.014, 0.006, 0.008)))
        return d
    objs = [
        (lambda x, y, z: y + 0.012, 0),
        (lambda x, y, z: np.maximum(sd_cyl(x, y, z, (0, 0.0, 0), 0.36, 0.012, 0.01), -sd_cyl(x, y, z, (0, 0.02, 0), 0.3, 0.012)), 1),
        (rice, 2), (cap, 3), (berry_fn, 4), (herb_fn, 5), (nut_fn, 6),
    ]
    lights = [Light((-1.8, 1.4, 0.9), (1.0, 0.84, 0.66), 12, soft=12), Light((1.2, 1.0, -1.2), (0.5, 0.5, 0.6), 0.8, soft=4)]
    env = env_studio((0.02, 0.018, 0.016), [((-0.7, 0.6, 0.3), 0.5, (2.0, 1.7, 1.4))])
    cam = Cam((0.12, 0.62, -0.68), (0.0, 0.04, 0.02), 32, 1000, 1000, focus=0.9, aperture=0.5)
    return Scene("anar-dish", cam, objs, mats, lights, env, (0.03, 0.026, 0.022), (0.01, 0.009, 0.008),
                 exposure=1.05, bloom=0.2, vignette=0.45, bounds=(-2, -0.1, -2, 2, 0.5, 2), steps=260)


_TEA_GLASS, _TEA = estekan((0.4, 0.016, 1.3), 0.06, 0.18)


def scene_anar_still():
    mats = [
        Mat((0.16, 0.08, 0.06), gloss=0.02, tex=tex_plaster(2.0, 0.12, 9)),     # wall/table: deep clay
        Mat((0.36, 0.05, 0.06), gloss=0.25, shine=30, tex=tex_pomegranate()),
        Mat((0.2, 0.19, 0.18), gloss=0.35, shine=50, tex=tex_plaster(6, 0.08, 3)),  # charcoal stoneware plate
        Mat((0.36, 0.08, 0.012), gloss=0.9, shine=160, reflect=0.25),           # tea (deep amber)
        Mat((0.55, 0.57, 0.58), gloss=1.0, shine=260, reflect=0.4),             # glass
    ]
    objs = [
        (floor_wall_sweep(0.0, 2.2, 0.6), 0),
        (lambda x, y, z: sd_cyl(x, y, z, (-0.05, 0.012, 1.25), 0.34, 0.012, 0.008), 2),
        (pomegranate((-0.12, 0.024 + 0.11, 1.28), 0.12), 1),
        (pomegranate((0.14, 0.024 + 0.09, 1.16), 0.095), 1),
        (lambda x, y, z: sd_cyl(x, y, z, (0.4, 0.008, 1.3), 0.11, 0.008, 0.004), 2),   # saucer
        (_TEA_GLASS, 4), (_TEA, 3),
    ]
    lp = (-2.2, 1.9, 0.6)
    lights = [Light(lp, (1.0, 0.8, 0.58), 16, soft=18,
                    gobo=gobo_window('x', -1.2, (2, 2), (1.0, 1.2), (0.95, 1.1), 0.05, lp)),
              Light((1.5, 1.2, -0.8), (0.5, 0.45, 0.45), 1.2, soft=3)]
    env = env_studio((0.03, 0.02, 0.018), [((-0.8, 0.4, 0.2), 0.5, (2.2, 1.7, 1.2))])
    cam = Cam((0.05, 0.6, -0.45), (0.12, 0.14, 1.25), 32, 1000, 1250, focus=1.72, aperture=0.4)
    return Scene("anar-still", cam, objs, mats, lights, env, (0.07, 0.04, 0.03), (0.03, 0.015, 0.01),
                 exposure=1.05, bloom=0.3, vignette=0.3, bounds=(-3, -0.1, -1, 3, 3, 2.5))


def scene_lune_hero():
    # Lune Atelier — blush plaster salon: arched mirror over a travertine console, sage pouf,
    # window light from the left drawing its frame across the back wall
    mats = [
        Mat((0.8, 0.62, 0.55), gloss=0.02, tex=tex_plaster(1.4, 0.07, 13)),      # blush plaster room
        Mat((0.82, 0.78, 0.72), gloss=0.1, shine=30, tex=tex_travertine(2.4, 3)),  # travertine console
        Mat((0.86, 0.86, 0.88), reflect=0.85, gloss=0.0),                         # mirror
        Mat((0.72, 0.56, 0.36), metal=True, shine=60),                            # brass
        Mat((0.42, 0.48, 0.4), gloss=0.04, sheen=(0.14, 0.15, 0.12)),             # sage velvet
        Mat((0.36, 0.14, 0.04), gloss=0.9, shine=160, reflect=0.2),               # amber glass
        Mat((0.92, 0.89, 0.84), gloss=0.4, shine=50),                             # ceramic / caps
        Mat((0.62, 0.48, 0.38), gloss=0.15, shine=30, tex=tex_plaster(5, 0.1, 7)), # clay vase
        Mat((0.74, 0.7, 0.65), gloss=0.08, shine=30, tex=tex_floor()),           # stone floor
    ]
    mx = 0.35  # mirror axis

    def room(px, py, pz):
        walls = np.minimum(np.minimum(py, 5.0 - pz), np.minimum(px + 3.0, 3.6 - px))
        walls = np.minimum(np.minimum(walls, 3.3 - py), pz + 1.0)
        niche = np.maximum(sd_arch2d(px - mx, py - 0.95, 0.62, 1.05), np.abs(pz - 5.0) - 0.06)
        win = np.maximum(sd_arch2d(pz - 3.4, py - 0.75, 0.6, 1.35), np.abs(px + 3.0) - 0.35)
        return np.maximum(walls, -np.minimum(niche, win))

    def mirror(px, py, pz):
        return np.maximum(sd_arch2d(px - mx, py - 0.95, 0.58, 1.05), np.abs(pz - 5.03) - 0.01)

    def frame(px, py, pz):
        a = np.abs(sd_arch2d(px - mx, py - 0.95, 0.6, 1.05)) - 0.02
        return np.maximum(a, np.abs(pz - 4.99) - 0.025)

    def console(px, py, pz):
        top = sd_rbox(px, py, pz, (mx, 0.86, 4.76), (0.95, 0.05, 0.24), 0.01)
        legs = np.minimum(sd_rbox(px, py, pz, (mx - 0.7, 0.43, 4.76), (0.12, 0.43, 0.2), 0.01),
                          sd_rbox(px, py, pz, (mx + 0.7, 0.43, 4.76), (0.12, 0.43, 0.2), 0.01))
        return np.minimum(top, legs)

    b1, c1 = bottle((mx + 0.55, 0.91, 4.8), 0.06, 0.18, 0.02, 0.03, 0.055)
    b2, c2 = bottle((mx + 0.72, 0.91, 4.74), 0.045, 0.13, 0.016, 0.026, 0.045)
    objs = [
        (room, 0),
        (lambda x, y, z: sd_box(x, y, z, (0.3, -0.01, 2.5), (3.4, 0.02, 2.6)), 8),
        (mirror, 2), (frame, 3), (console, 1),
        (b1, 5), (c1, 6), (b2, 6), (c2, 3),
        (lambda x, y, z: smin(sd_sphere(x, y, z, (mx - 0.6, 1.04, 4.8), 0.13), sd_cyl(x, y, z, (mx - 0.6, 1.2, 4.8), 0.04, 0.09, 0.01), 0.06), 7),
        (lambda x, y, z: sd_cyl(x, y, z, (mx + 0.05, 0.22, 3.9), 0.36, 0.22, 0.11), 4),          # pouf
        (lambda x, y, z: smin(sd_ellipsoid(x, y, z, (-2.35, 0.42, 4.55), (0.26, 0.42, 0.26)), sd_cyl(x, y, z, (-2.35, 0.9, 4.55), 0.08, 0.12, 0.02), 0.1), 7),
    ]
    sun = (-10.0, 3.9, -2.0)
    lights = [
        Light(sun, (1.0, 0.86, 0.7), 520, soft=30,
              gobo=gobo_window('x', -3.0, (2, 3), (1.2, 2.2), (3.4, 1.6), 0.07, sun)),
        Light((0.4, 2.6, 1.0), (0.95, 0.85, 0.8), 6.5, soft=3),
        Light((2.6, 2.0, 0.0), (0.9, 0.8, 0.75), 3.0, soft=3),
    ]
    env = env_sunset((2.6, 2.4, 2.2), (1.6, 1.6, 1.7))
    cam = Cam((0.9, 1.22, 0.7), (0.05, 1.05, 5.0), 48, 1600, 900, focus=4.2, aperture=0.3)
    return Scene("lune-hero", cam, objs, mats, lights, env, (0.22, 0.18, 0.17), (0.1, 0.08, 0.07),
                 exposure=1.0, bloom=0.25, vignette=0.2, bounds=(-3.1, -0.1, -1.1, 3.7, 3.4, 5.4))


def scene_lune_bottles():
    mats = [
        Mat((0.8, 0.64, 0.57), gloss=0.02, tex=tex_plaster(3.0, 0.06, 17)),
        Mat((0.82, 0.78, 0.72), gloss=0.1, tex=tex_travertine(5.0, 9)),
        Mat((0.36, 0.14, 0.04), gloss=0.9, shine=180, reflect=0.22),
        Mat((0.93, 0.9, 0.85), gloss=0.4, shine=60),
        Mat((0.12, 0.11, 0.1), gloss=0.5, shine=80),
    ]
    b1, c1 = bottle((-0.22, 0.12, 1.3), 0.075, 0.24, 0.024, 0.04, 0.075)
    b2, c2 = bottle((0.02, 0.12, 1.38), 0.06, 0.18, 0.02, 0.035, 0.065)
    b3, c3 = bottle((0.22, 0.12, 1.26), 0.05, 0.13, 0.017, 0.03, 0.05)
    objs = [
        (floor_wall_sweep(0.0, 1.9, 0.5), 0),
        (lambda x, y, z: sd_rbox(x, y, z, (0.0, 0.06, 1.32), (0.55, 0.06, 0.28), 0.01), 1),
        (b1, 2), (c1, 4), (b2, 2), (c2, 3), (b3, 3), (c3, 4),
    ]
    lp = (-2.6, 2.3, 0.4)
    lights = [Light(lp, (1.0, 0.86, 0.7), 22, soft=26, gobo=gobo_window('x', -1.4, (2, 2), (1.2, 1.4), (1.0, 1.3), 0.05, lp)),
              Light((1.6, 1.0, -0.6), (0.8, 0.7, 0.7), 1.6, soft=3)]
    env = env_studio((0.25, 0.2, 0.18), [((-0.8, 0.5, 0.0), 0.6, (2.6, 2.3, 2.0))])
    cam = Cam((0.1, 0.42, -0.15), (0.0, 0.25, 1.3), 30, 1000, 1250, focus=1.48, aperture=0.35)
    return Scene("lune-bottles", cam, objs, mats, lights, env, (0.22, 0.18, 0.16), (0.1, 0.08, 0.07),
                 exposure=0.95, bloom=0.2, vignette=0.18, bounds=(-3, -0.1, -1, 3, 3, 2.2))


def scene_lune_jar():
    mats = [
        Mat((0.5, 0.56, 0.48), gloss=0.02, tex=tex_plaster(3.0, 0.06, 19)),   # sage backdrop
        Mat((0.93, 0.9, 0.85), gloss=0.5, shine=70),                          # jar
        Mat((0.72, 0.56, 0.36), metal=True, shine=80),                        # brass lid
        Mat((0.3, 0.29, 0.27), gloss=0.2, shine=30, tex=tex_plaster(8, 0.15, 3)),  # stones
    ]
    objs = [
        (floor_wall_sweep(0.0, 1.8, 0.5), 0),
        (lambda x, y, z: sd_cyl(x, y, z, (0.0, 0.09, 1.2), 0.15, 0.09, 0.03), 1),
        (lambda x, y, z: sd_cyl(x, y, z, (0.0, 0.2, 1.2), 0.152, 0.025, 0.012), 2),
        (lambda x, y, z: sd_ellipsoid(x, y, z, (0.3, 0.045, 1.08), (0.1, 0.05, 0.08)), 3),
        (lambda x, y, z: sd_ellipsoid(x, y, z, (-0.28, 0.035, 1.02), (0.07, 0.035, 0.06)), 3),
    ]
    lights = [Light((-2.0, 2.6, 0.2), (1.0, 0.88, 0.75), 16, soft=20), Light((1.5, 1.0, -0.5), (0.7, 0.75, 0.7), 1.6, soft=4)]
    env = env_studio((0.2, 0.22, 0.19), [((-0.6, 0.7, 0.0), 0.6, (2.4, 2.2, 2.0))])
    cam = Cam((0.05, 0.5, -0.05), (0.0, 0.12, 1.18), 30, 1000, 1000, focus=1.3, aperture=0.35)
    return Scene("lune-jar", cam, objs, mats, lights, env, (0.2, 0.22, 0.19), (0.08, 0.08, 0.07),
                 exposure=0.95, bloom=0.2, vignette=0.2, bounds=(-3, -0.1, -1, 3, 3, 2.1))


SCENES = {
    "aurel-hero": scene_aurel_hero, "aurel-ring": scene_aurel_ring, "aurel-pearls": scene_aurel_pearls,
    "aurel-bangle": scene_aurel_bangle, "anar-hero": scene_anar_hero, "anar-dish": scene_anar_dish,
    "anar-still": scene_anar_still, "lune-hero": scene_lune_hero, "lune-bottles": scene_lune_bottles,
    "lune-jar": scene_lune_jar,
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("names", nargs="+")
    ap.add_argument("--preview", action="store_true")
    ap.add_argument("--scale", type=float, default=None)
    ap.add_argument("--ss", type=int, default=2)
    a = ap.parse_args()
    names = list(SCENES) if a.names == ["all"] else a.names
    OUT.mkdir(parents=True, exist_ok=True)
    for nm in names:
        s = SCENES[nm]()
        ss = 1 if a.preview else a.ss
        scale = a.scale or (0.3 if a.preview else 1.0)
        img, depth = Studio(s).render(ss=ss, scale=scale)
        out = post(s, img, depth)
        save_rgb(out, OUT / f"{nm}{'-preview' if a.preview else ''}.png")


if __name__ == "__main__":
    main()

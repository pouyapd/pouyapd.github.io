"""
P. DESIGN — hero scene "The Portal" (v2).

An original, procedurally rendered landscape: a monumental stone slab with an
arched portal standing in a mirror-calm sea at sunset. The low sun shines
through the portal and lays a path of light across the water; volumetric
cumulus banks, hazy mountain ranges and a pale planet complete the scene.

Every pixel comes from this script (no photographs, no third-party imagery),
so the studio owns the artwork outright.

    python tools/scene/portal.py desktop            # full quality (~20-30 min)
    python tools/scene/portal.py desktop --preview  # quick low-res check
    python tools/scene/portal.py all

Outputs (tools/scene/out/, ignored by git; `npm run assets` optimises them):
    portal-<variant>.png         flattened image (also the source for og/posters)
    portal-<variant>-sky.png     sea, sky, clouds, mountains — no planet, no portal
    portal-<variant>-planet.png  the planet (RGBA)
    portal-<variant>-front.png   portal, plinth, rocks and their reflections (RGBA)
    portal-<variant>-rays.png    light shafts from the portal (add / screen blend)
Composited (sky → planet → front, rays screened on top) they reproduce the
flattened image.

How it works
  * Clouds are ray-marched once per camera into a direction-space "dome"
    (premultiplied colour + transmittance) and cached in out/, then looked up
    for primary and reflected rays alike.
  * Sky, sun, mountains and planet are analytic functions of direction.
  * Solid geometry is a signed distance field (render.py helpers); ambient
    light comes from an irradiance table integrated from the environment.
"""

from __future__ import annotations

import argparse
import hashlib
import inspect
import json
import math
import sys
import time
from dataclasses import asdict, dataclass, field
from pathlib import Path

import numpy as np
from scipy.ndimage import gaussian_filter, map_coordinates

sys.path.insert(0, str(Path(__file__).resolve().parent))
from render import (  # noqa: E402
    F, OUT, col3, dot, downsample, extrude, fbm, mix, norm, save_rgb, save_rgba, sd_box, sd_capsule,
    sd_sphere, smoothstep, _layer,
)


# --------------------------------------------------------------------------
# 3-D value noise
# --------------------------------------------------------------------------

def _hash3(ix, iy, iz, seed):
    h = (ix * 374761393 + iy * 668265263 + iz * 1274126177 + seed * 1442695041) & 0xFFFFFFFF
    h = ((h ^ (h >> 13)) * 1274126177) & 0xFFFFFFFF
    h = h ^ (h >> 16)
    return (h & 0xFFFFFF).astype(F) * F(1.0 / 0xFFFFFF)


def vnoise3(x, y, z, seed=0):
    xf, yf, zf = np.floor(x), np.floor(y), np.floor(z)
    ix, iy, iz = xf.astype(np.int64), yf.astype(np.int64), zf.astype(np.int64)
    fx, fy, fz = (x - xf).astype(F), (y - yf).astype(F), (z - zf).astype(F)
    ux, uy, uz = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy), fz * fz * (3 - 2 * fz)
    c000 = _hash3(ix, iy, iz, seed)
    c100 = _hash3(ix + 1, iy, iz, seed)
    c010 = _hash3(ix, iy + 1, iz, seed)
    c110 = _hash3(ix + 1, iy + 1, iz, seed)
    c001 = _hash3(ix, iy, iz + 1, seed)
    c101 = _hash3(ix + 1, iy, iz + 1, seed)
    c011 = _hash3(ix, iy + 1, iz + 1, seed)
    c111 = _hash3(ix + 1, iy + 1, iz + 1, seed)
    x00 = c000 + (c100 - c000) * ux
    x10 = c010 + (c110 - c010) * ux
    x01 = c001 + (c101 - c001) * ux
    x11 = c011 + (c111 - c011) * ux
    y0 = x00 + (x10 - x00) * uy
    y1 = x01 + (x11 - x01) * uy
    return y0 + (y1 - y0) * uz


# rotation between octaves hides the lattice
_R = np.array([[0.00, 0.80, 0.60], [-0.80, 0.36, -0.48], [-0.60, -0.48, 0.64]], F) * 2.02


def fbm3(x, y, z, octaves=4, seed=0, billow=False):
    s = np.zeros_like(x, dtype=F)
    amp, total = 0.5, 0.0
    for i in range(octaves):
        n = vnoise3(x, y, z, seed + i * 31)
        if billow:
            n = 1.0 - np.abs(2.0 * n - 1.0)
        s += amp * n
        total += amp
        x, y, z = (_R[0, 0] * x + _R[0, 1] * y + _R[0, 2] * z + 3.1,
                   _R[1, 0] * x + _R[1, 1] * y + _R[1, 2] * z + 7.7,
                   _R[2, 0] * x + _R[2, 1] * y + _R[2, 2] * z + 1.3)
        amp *= 0.5
    return s / total


def dir_from(az_deg, el_deg):
    a, e = math.radians(az_deg), math.radians(el_deg)
    return np.array([math.sin(a) * math.cos(e), math.sin(e), math.cos(a) * math.cos(e)], F)


# --------------------------------------------------------------------------
# scene description (world units ≈ metres; camera looks along +z)
# --------------------------------------------------------------------------

@dataclass
class Camera:
    pos: tuple
    yaw: float
    pitch: float
    vfov: float
    width: int
    height: int


@dataclass
class Look:
    zenith: tuple = (0.016, 0.021, 0.030)
    upper: tuple = (0.045, 0.060, 0.078)
    horizon_warm: tuple = (1.20, 0.76, 0.55)
    horizon_cool: tuple = (0.15, 0.16, 0.19)
    sun_color: tuple = (1.0, 0.70, 0.50)
    sun_az: float = 58.0         # beyond the right edge: lights the side face, the jamb and the crag
    sun_el: float = 4.0
    glow_az: float = 26.0        # centre of the broad warm glow (behind and right of the tower)
    glow_el: float = 3.0
    glow: float = 0.50
    cloud_light_az: float = 70.0  # clouds are lit from further right: warm, lit tops facing the camera
    sun_power: float = 3.0
    water: tuple = (0.004, 0.007, 0.010)
    haze: float = 0.0008
    exposure: float = 1.24


@dataclass
class Portal:
    """A deep polished tower with a tall round-topped opening near its left edge."""
    x: float = 30.3
    z: float = 120.8
    width: float = 21.0
    height: float = 61.0
    depth: float = 10.0
    turn: float = -45.0          # degrees about y; negative turns the lit right side face toward the camera
    arch_left: float = 2.7       # thickness of the thin left pier
    arch_w: float = 13.0
    arch_spring: float = 44.0    # height where the round top begins (above the plinth)
    cut_az: float = 17.4         # the opening runs along this azimuth, ~5° off the line of sight,
                                 # so it reads as a bright window with a sliver of lit left jamb
    cut_el: float = 12.0         # ...and rises with the line of sight, so its roof barely shows
    plinth_h: float = 0.2


@dataclass
class Planet:
    az: float = 10.6             # behind the tower's thin left pier, seen through the opening
    el: float = 15.4
    radius: float = 5.7          # degrees
    light: tuple = (-0.85, 0.25, 0.45)   # art-directed: a bright left limb, the face in soft shadow
    albedo: float = 0.62
    veil: float = 0.30           # atmosphere in front of it


@dataclass
class Cloud:
    """A cumulus heap: half-width w, height h, half-depth d, resting at `base`."""
    x: float
    z: float
    base: float
    w: float
    h: float
    d: float
    seed: int = 0
    density: float = 1.0
    bank: bool = False           # soft-based bank lying on the sea


def heap(az, el0, el1, dist, width_deg, seed, density=1.0, bank=False, depth=0.6):
    """A heap seen at azimuth `az`, spanning elevations el0..el1 (degrees) at distance `dist`."""
    a = math.radians(az)
    base = 1.6 + dist * math.tan(math.radians(el0))
    h = dist * (math.tan(math.radians(el1)) - math.tan(math.radians(el0)))
    w = dist * math.tan(math.radians(width_deg / 2))
    return Cloud(dist * math.sin(a), dist * math.cos(a), base, w, h, w * depth, seed, density, bank)


def clouds_default():
    """Composition follows the reference: tall sunlit heaps on the left horizon,
    small heaps drifting behind and through the opening, a large cloud upper right."""
    return [
        # left horizon: broad cumulus banks with flat bases just above the sea
        heap(-3.5, 0.2, 5.0, 640, 9.5, 1, 1.0, False, 0.45),
        heap(-11.0, 0.2, 2.8, 700, 7.5, 13, 0.95, False, 0.45),
        heap(-17.5, 0.2, 4.0, 760, 8.5, 2, 1.0, False, 0.45),
        heap(-24.0, 0.0, 1.8, 820, 7.0, 3, 0.9, True),
        heap(-31.0, 0.0, 2.8, 900, 9.0, 4, 0.9, False, 0.45),
        heap(2.5, 0.0, 1.5, 600, 5.5, 5, 0.85, True),
        # behind and through the opening
        heap(9.5, 14.0, 16.6, 380, 4.5, 21, 0.55),
        heap(12.5, 8.0, 11.0, 440, 6.0, 22, 0.6),
        heap(13.0, 1.6, 5.0, 520, 7.0, 24, 0.8),
        # the large cloud, upper right, at the ring's height
        heap(19.0, 14.6, 20.8, 420, 7.0, 7),
        heap(25.0, 14.0, 19.4, 430, 6.5, 8),
        # right horizon, around the crag
        heap(22.5, 2.2, 4.8, 620, 6.0, 9, 0.9),
        heap(29.5, 0.4, 3.0, 680, 6.5, 10, 0.9, True),
    ]


@dataclass
class Variant:
    name: str
    cam: Camera
    look: Look = field(default_factory=Look)
    portal: Portal = field(default_factory=Portal)
    planet: Planet = field(default_factory=Planet)
    clouds: list = field(default_factory=clouds_default)
    dome_ppd: float = 44.0       # dome pixels per degree (full quality)
    steps: int = 200


def variants():
    V = {}
    # desktop framing reproduces the reference frame at 2.44x, with extra sky on both sides
    V["desktop"] = Variant("portal-desktop", Camera((0.0, 1.6, 0.0), 0.0, 10.7, 40.0, 2560, 1440))
    V["mobile"] = Variant(
        "portal-mobile", Camera((21.0, 1.6, -6.0), 8.5, 4.2, 60.0, 1080, 1920),
        planet=Planet(az=3.2, el=19.5, radius=6.0), dome_ppd=32.0)
    return V


# --------------------------------------------------------------------------
# solid world
# --------------------------------------------------------------------------

ID_SLAB, ID_PLINTH, ID_ROCK, ID_PATH, ID_FIGURE, ID_SPHERE = 1, 2, 3, 4, 5, 6
STRUCT = (ID_SLAB, ID_PLINTH, ID_ROCK)


class World:
    def __init__(self, v: Variant):
        P = v.portal
        self.P = P
        a = math.radians(P.turn)
        self.c, self.s = math.cos(a), math.sin(a)
        # the crag at the tower's right base (world space): centre, radii, roughness
        self.rocks = [((47.5, 0.0, 132.0), (7.5, 11.5, 6.5), 1.3),
                      ((55.0, 0.0, 134.0), (8.5, 5.5, 6.5), 1.2),
                      ((64.0, 0.0, 131.0), (5.0, 2.4, 4.0), 0.8)]
        self.rock_bounds = [(c[0], 0.0, c[2], max(r) * 1.6) for c, r, _ in self.rocks]
        # walkway from the foreground toward the tower's left base, the figure on it
        self.path_a = (-4.9, 6.0)
        self.path_b = (22.0, 118.0)
        jx, jz = self.path_b[0] - self.path_a[0], self.path_b[1] - self.path_a[1]
        self.path_len = math.hypot(jx, jz)
        self.path_ang = math.atan2(jx, jz)
        self.path_c = ((self.path_a[0] + self.path_b[0]) / 2, (self.path_a[1] + self.path_b[1]) / 2)
        self.fig_k = 1.45                      # figure scale (reads at hero size)
        self.fig = (4.0, 0.26, 45.4)
        # a low floating platform beside the walkway
        self.platform = ((-3.0, 0.14, 56.0), (5.5, 0.14, 2.6))
        # two spheres hanging in the sky (they reflect in the sea)
        self.spheres = [((-38.0, 72.0, 533.0), 9.0), ((57.8, 17.6, 140.0), 1.0)]
        ca_ = math.radians(P.cut_az)
        self.cut_c, self.cut_s = math.cos(ca_), math.sin(ca_)
        self.cut_t = math.tan(math.radians(P.cut_el))
        oc = self.to_world(-P.width / 2 + P.arch_left + P.arch_w / 2, 0, -P.depth / 2)
        self.open_c = (oc[0], oc[2])
        # light pooled in the opening (bounce from the lit water): a soft point light
        self.portal_light = self.to_world(-P.width / 2 + P.arch_left + P.arch_w / 2, P.plinth_h + 2.5, 0.0)
        self.aabb_lo = np.array([-60.0, -1.0, 0.0], F)
        self.aabb_hi = np.array([80.0, max(P.height, 90.0) + 1.0, 560.0], F)

    def to_world(self, lx, ly, lz):
        P = self.P
        return (P.x + self.c * lx - self.s * lz, ly, P.z + self.s * lx + self.c * lz)

    def to_local(self, px, pz):
        P = self.P
        dx, dz = px - P.x, pz - P.z
        return self.c * dx + self.s * dz, -self.s * dx + self.c * dz

    def sdf(self, px, py, pz, struct=True, rest=True):
        P, n = self.P, px.size
        d = np.full(n, 1e9, F)
        mid = np.zeros(n, np.int8)

        def add(dd, i):
            nonlocal d
            sel = dd < d
            d = np.where(sel, dd, d)
            mid[sel] = i

        if struct:
            lx, lz = self.to_local(px, pz)
            r = 0.14
            y0 = P.plinth_h
            hh = (P.height - y0) / 2
            slab = sd_box(lx, py, lz, (0.0, y0 + hh, 0.0), (P.width / 2 - r, hh - r, P.depth / 2 - r)) - r
            # the opening (thin left pier) is a 2-D arch extruded along cut_az
            ox, oz = self.open_c
            qx = np.abs((px - ox) * self.cut_c - (pz - oz) * self.cut_s)
            along = (px - ox) * self.cut_s + (pz - oz) * self.cut_c
            qy = py - self.cut_t * along - (y0 + P.arch_spring)
            rect = np.maximum(qx - P.arch_w / 2, qy)
            circ = np.sqrt(qx * qx + np.maximum(qy, 0) ** 2) - P.arch_w / 2
            opening = np.maximum(np.minimum(rect, circ), np.abs(lz) - (P.depth / 2 + 2.0))
            add(np.maximum(slab, -opening), ID_SLAB)
            # a low base, barely above the water
            pl = sd_box(lx, py, lz, (0.0, -0.5, 0.0), (P.width / 2 + 0.6, 0.5 + y0, P.depth / 2 + 0.6)) - 0.03
            add(pl, ID_PLINTH)
            # rocks: displaced ellipsoids, evaluated only near their bounds
            for (c, rr, rough), (wx, _, wz, rad) in zip(self.rocks, self.rock_bounds):
                bound = np.sqrt((px - wx) ** 2 + py ** 2 + (pz - wz) ** 2) - rad
                near = bound < 1.0
                rd = np.maximum(bound, 0.5)
                if near.any():
                    qx_, qy_, qz_ = px[near] - c[0], py[near] - c[1], pz[near] - c[2]
                    # a cone-ish crag: narrower towards the top
                    taper = 1.0 - 0.7 * np.clip(qy_ / rr[1], 0, 1) ** 0.9
                    k = np.sqrt((qx_ / (rr[0] * taper)) ** 2 + (qy_ / rr[1]) ** 2 + (qz_ / (rr[2] * taper)) ** 2)
                    base = (k - 1.0) * min(rr) * 0.8
                    # facetted, wind-cut stone: ridged noise, stretched along y
                    nn = fbm3(qx_ * 0.30, qy_ * 0.45, qz_ * 0.30, 4, 61, billow=True)
                    fine = fbm3(qx_ * 1.3, qy_ * 1.6, qz_ * 1.3, 2, 67)
                    rd[near] = (base - rough * (1.9 * (nn - 0.55) + 0.45 * (fine - 0.5))) * 0.55
                add(rd, ID_ROCK)
        if rest:
            ca, sa = math.cos(self.path_ang), math.sin(self.path_ang)
            jx = ca * (px - self.path_c[0]) - sa * (pz - self.path_c[1])
            jz = sa * (px - self.path_c[0]) + ca * (pz - self.path_c[1])
            add(sd_box(jx, py, jz, (0, 0.04, 0), (0.45, 0.09, self.path_len / 2)) - 0.02, ID_PATH)
            (bx, by, bz), bh = self.platform
            add(sd_box(px, py, pz, (bx, by, bz), bh) - 0.02, ID_PATH)
            for c, rad in self.spheres:
                add(sd_sphere(px, py, pz, c, rad), ID_SPHERE)
            fx, fy, fz = self.fig
            k = self.fig_k
            bound = sd_capsule(px, py, pz, (fx, fy + 0.2 * k, fz), (fx, fy + 1.7 * k, fz), 0.6 * k)
            near = bound < 0.5 * k
            fd = bound.copy()
            if near.any():
                # built at human size around the origin, then scaled
                qx_, qy_, qz_ = (px[near] - fx) / k, (py[near] - fy) / k, (pz[near] - fz) / k
                legs = np.minimum(
                    sd_capsule(qx_, qy_, qz_, (-0.09, 0.05, 0), (-0.085, 0.85, 0), 0.07),
                    sd_capsule(qx_, qy_, qz_, (0.09, 0.05, 0), (0.085, 0.85, 0), 0.07))
                h = np.clip((qy_ - 0.62) / 0.95, 0, 1)
                coat = sd_capsule(qx_, qy_, qz_, (0, 0.60, 0), (0, 1.50, 0), 0.0) - (0.25 - 0.08 * h)
                shoulders = sd_capsule(qx_, qy_, qz_, (-0.17, 1.50, 0), (0.17, 1.50, 0), 0.09)
                head = sd_sphere(qx_, qy_, qz_, (0, 1.73, 0), 0.105)
                fd[near] = np.minimum(np.minimum(legs, coat), np.minimum(shoulders, head)) * k
            add(fd, ID_FIGURE)
        return d, mid

    def aabb(self, o, d):
        t0 = np.zeros_like(o[0])
        t1 = np.full_like(o[0], 1e9)
        for k in range(3):
            inv = 1.0 / np.where(np.abs(d[k]) < 1e-8, 1e-8, d[k])
            a = (self.aabb_lo[k] - o[k]) * inv
            b = (self.aabb_hi[k] - o[k]) * inv
            t0 = np.maximum(t0, np.minimum(a, b))
            t1 = np.minimum(t1, np.maximum(a, b))
        return t0, t1

    def march(self, o, d, t0, t1, struct, steps):
        n = o[0].size
        t = t0.astype(F).copy()
        hit = np.zeros(n, bool)
        mid = np.zeros(n, np.int8)
        act = np.nonzero(t0 < t1)[0]
        for _ in range(steps):
            if act.size == 0:
                break
            ta = t[act]
            dist, m = self.sdf(o[0][act] + d[0][act] * ta, o[1][act] + d[1][act] * ta,
                               o[2][act] + d[2][act] * ta, struct)
            done = dist < np.maximum(0.0005 * ta, 0.0012)
            hit[act[done]] = True
            mid[act[done]] = m[done]
            t[act] = ta + np.where(done, 0, dist * 0.92)
            keep = (~done) & (t[act] < t1[act])
            act = act[keep]
        return t, hit, mid

    def normal(self, px, py, pz, struct):
        e = 0.004
        nx, ny, nz = np.zeros_like(px), np.zeros_like(px), np.zeros_like(px)
        for a, b, c in ((1, -1, -1), (-1, -1, 1), (-1, 1, -1), (1, 1, 1)):
            dd, _ = self.sdf(px + a * e, py + b * e, pz + c * e, struct)
            nx += a * dd
            ny += b * dd
            nz += c * dd
        return norm((nx, ny, nz))

    def shadow(self, p, l, steps=80, tmax=400.0):
        """Soft shadow toward direction l. Everything casts shadows (also in the back layer)."""
        n = p[0].size
        res = np.ones(n, F)
        t = np.full(n, 0.06, F)
        act = np.arange(n)
        for _ in range(steps):
            if act.size == 0:
                break
            ta = t[act]
            dd, _ = self.sdf(p[0][act] + l[0] * ta, p[1][act] + l[1] * ta, p[2][act] + l[2] * ta)
            res[act] = np.minimum(res[act], 14.0 * dd / ta)
            t[act] = ta + np.clip(dd, 0.04, 6.0)
            keep = (res[act] > 0.002) & (t[act] < tmax)
            act = act[keep]
        return smoothstep(0.0, 1.0, np.clip(res, 0, 1))

    def ao(self, p, n, struct):
        occ = np.zeros_like(p[0])
        sca = 1.0
        for i in range(5):
            h = 0.06 + 0.55 * i
            dd, _ = self.sdf(p[0] + n[0] * h, p[1] + n[1] * h, p[2] + n[2] * h, struct)
            occ += (h - dd) * sca
            sca *= 0.72
        return np.clip(1.0 - 0.24 * occ, 0, 1)


# --------------------------------------------------------------------------
# clouds → direction-space dome
# --------------------------------------------------------------------------

class CloudHeap:
    def __init__(self, c: Cloud):
        self.c = c
        rng = np.random.default_rng(1000 + c.seed)
        B = []
        n0 = max(2, int(round(c.w / (0.4 * c.h))))
        tilt = rng.uniform(-0.35, 0.35)
        layers = ((n0, 0.46, 0.24, 1.0), (max(1, (n0 + 1) // 2), 0.37, 0.50, 0.62), (max(1, n0 // 3), 0.28, 0.74, 0.32))
        if c.bank:
            layers = ((n0 + 1, 0.50, 0.20, 1.0), (max(1, n0 // 2), 0.36, 0.45, 0.70))
        for k, (n, rf, yf, wf) in enumerate(layers):
            xs = np.linspace(-wf, wf, n) if n > 1 else np.array([0.0])
            for x in xs:
                r = rf * c.h * rng.uniform(0.6, 1.3)
                bx = c.x + (x + tilt * k * 0.4) * max(c.w - r, 0.0) + rng.uniform(-0.12, 0.12) * c.w / n
                by = c.base + yf * c.h * rng.uniform(0.7, 1.25)
                bz = c.z + rng.uniform(-0.6, 0.6) * max(c.d - r, 0.0)
                B.append((bx, by, bz, r))
        self.B = np.array(B, F)
        pad = 0.6 * max(c.h, 0.35 * c.w)   # billows reach well beyond the blobs
        self.lo = np.array([c.x - c.w - pad, max(c.base - 2.0, -1.0), c.z - c.d - pad], F)
        self.hi = np.array([c.x + c.w + pad, c.base + c.h * 1.15 + 0.6 * pad, c.z + c.d + pad], F)
        self.freq = 2.5 / c.h
        self.sigma = 20.0 / c.h

    def density(self, px, py, pz, octaves=4):
        c = self.c
        S = np.full(px.shape, -1.0, F)
        for bx, by, bz, r in self.B:
            dd = np.sqrt((px - bx) ** 2 + (py - by) ** 2 + (pz - bz) ** 2) / r
            S = np.maximum(S, 1.0 - dd)
        out = np.zeros(px.shape, F)
        sel = S > -0.45
        if sel.any():
            f = self.freq
            q = (px[sel] * f, py[sel] * f * 1.15, pz[sel] * f)
            # large billows shape the heap; small ones only erode its surface (cauliflower edges)
            nb = fbm3(*q, min(octaves, 3), c.seed * 13 + 5, billow=True)
            s = S[sel] + (nb - 0.60) * 1.25
            if octaves > 2:
                edge = 1.0 - smoothstep(0.0, 0.35, s)
                nd = fbm3(q[0] * 3.7 + 11.0, q[1] * 3.7, q[2] * 3.7, 2, c.seed * 7 + 3, billow=True)
                s = s - edge * (nd - 0.35) * 0.38
            yb = (py[sel] - c.base) / c.h
            base_soft = 0.30 if c.bank else 0.06
            s = s - (1.0 - smoothstep(0.0, base_soft, yb)) * 0.9
            out[sel] = smoothstep(0.0, 0.26, s) * c.density
        return out


class Dome:
    """Clouds integrated per direction (from one camera position)."""

    def __init__(self, az0, az1, el0, el1, ppd):
        self.az0, self.az1, self.el0, self.el1 = az0, az1, el0, el1
        self.W = int(math.ceil((az1 - az0) * ppd)) + 1
        self.H = int(math.ceil((el1 - el0) * ppd)) + 1
        self.C = np.zeros((3, self.H, self.W), F)
        self.T = np.ones((self.H, self.W), F)

    def dirs(self):
        az = np.radians(np.linspace(self.az0, self.az1, self.W, dtype=F))
        el = np.radians(np.linspace(self.el0, self.el1, self.H, dtype=F))
        A, E = np.meshgrid(az, el)
        ce = np.cos(E)
        return (np.sin(A) * ce).ravel(), np.sin(E).ravel(), (np.cos(A) * ce).ravel()

    def sample(self, d):
        az = np.degrees(np.arctan2(d[0], d[2]))
        el = np.degrees(np.arcsin(np.clip(d[1], -1, 1)))
        u = (az - self.az0) / (self.az1 - self.az0) * (self.W - 1)
        v = (el - self.el0) / (self.el1 - self.el0) * (self.H - 1)
        inside = (u >= 0) & (u <= self.W - 1) & (v >= 0) & (v <= self.H - 1)
        coords = np.stack([np.clip(v, 0, self.H - 1), np.clip(u, 0, self.W - 1)])
        T = map_coordinates(self.T, coords, order=1)
        C = np.stack([map_coordinates(self.C[k], coords, order=1) for k in range(3)])
        T = np.where(inside, T, 1.0).astype(F)
        C = np.where(inside, C, 0.0).astype(F)
        return C, T


def hg(cos, g):
    return (1 - g * g) / (4 * math.pi * (1 + g * g - 2 * g * cos) ** 1.5)


def render_dome(v: Variant, sky, ppd, bounds):
    az0, az1, el0, el1 = bounds
    dome = Dome(az0, az1, el0, el1, ppd)
    o = np.array(v.cam.pos, F)
    dx, dy, dz = dome.dirs()
    L = v.look
    sun = sky.sun_cloud
    sun_col = col3((1.0, 0.64, 0.47))   # clouds take the warmest light
    heaps = sorted((CloudHeap(c) for c in v.clouds), key=lambda h: h.c.z)
    amb_top = col3((0.085, 0.095, 0.140))   # average upper hemisphere: cool blue-grey
    t_start = time.time()
    Cflat = dome.C.reshape(3, -1)
    Tflat = dome.T.reshape(-1)
    for hi_, heap in enumerate(heaps):
        # ray / box
        t0 = np.zeros_like(dx)
        t1 = np.full_like(dx, 1e9)
        for k, dk in enumerate((dx, dy, dz)):
            inv = 1.0 / np.where(np.abs(dk) < 1e-8, 1e-8, dk)
            a = (heap.lo[k] - o[k]) * inv
            b = (heap.hi[k] - o[k]) * inv
            t0 = np.maximum(t0, np.minimum(a, b))
            t1 = np.minimum(t1, np.maximum(a, b))
        idx_all = np.nonzero((t0 < t1) & (Tflat > 0.01))[0]
        h = heap.c.h
        lsteps = np.array([0.04, 0.09, 0.17, 0.30, 0.52], F) * h
        # chunk along the dome so rays in a chunk have similar path lengths
        for s0 in range(0, idx_all.size, 60_000):
            idx = idx_all[s0:s0 + 60_000]
            rd = (dx[idx], dy[idx], dz[idx])
            ta, tb = t0[idx], t1[idx]
            N = int(np.clip(np.max(tb - ta) / (h / 36.0), 40, 170))
            dt = (tb - ta) / N
            hh = (idx.astype(np.int64) * 2654435761) & 0xFFFFFFFF
            hh = ((hh ^ (hh >> 15)) * 2246822519) & 0xFFFFFFFF
            jitter = ((hh ^ (hh >> 13)) & 0xFFFF).astype(F) / 65536.0
            T = Tflat[idx].copy()
            C = np.zeros((3, idx.size), F)
            cos = rd[0] * sun[0] + rd[1] * sun[1] + rd[2] * sun[2]
            phase = [0.75 * hg(cos, 0.62 * 0.55 ** i) + 0.25 * hg(cos, -0.18) for i in range(3)]
            sky_up = sky.base(norm((rd[0] * 0.3, np.full_like(rd[0], 0.9), rd[2] * 0.3)))
            sky_hz = sky.base((rd[0], np.full_like(rd[0], 0.02), rd[2]))
            act = np.arange(idx.size)
            for st in range(N):
                if act.size == 0:
                    break
                tt = ta[act] + (st + jitter[act]) * dt[act]
                px = o[0] + rd[0][act] * tt
                py = o[1] + rd[1][act] * tt
                pz = o[2] + rd[2][act] * tt
                dens = heap.density(px, py, pz)
                live = dens > 1e-3
                if live.any():
                    a = act[live]
                    qx, qy, qz, de = px[live], py[live], pz[live], dens[live]
                    tau = np.zeros_like(de)
                    prev = 0.0
                    for ls in lsteps:
                        dl = ls - prev
                        prev = ls
                        tau += heap.density(qx + sun[0] * ls, qy + sun[1] * ls, qz + sun[2] * ls, 2) * dl
                    tau *= heap.sigma
                    ms = sum((0.42 ** i) * phase[i][a] * np.exp(-tau * 0.6 ** i) for i in range(3))
                    yb = np.clip((qy - heap.c.base) / h, 0, 1)
                    # ambient: sky from above, warm sea bounce from below, both dimmer inside
                    amb = (amb_top * (0.35 + 0.9 * yb) + sky_hz[:, a] * 0.06 * (1 - yb) ** 2)
                    sig = de * heap.sigma
                    Tst = np.exp(-sig * dt[a])
                    Ls = sun_col * (L.sun_power * 7.0 * ms) + amb * (0.35 + 0.65 * np.exp(-tau * 0.25))
                    # aerial perspective: distant clouds fade into the horizon haze
                    fade = np.exp(-tt[live] / 5200.0)
                    Ls = Ls * fade + sky_hz[:, a] * (1 - fade) * 0.7
                    C[:, a] += T[a] * Ls * (1 - Tst)
                    T[a] *= Tst
                act = act[T[act] > 0.01]
            Cflat[:, idx] += C * 1.0
            # transmittance through this heap multiplies what lies behind it
            Tflat[idx] = T
        print(f"\r  dome {v.name}: heap {hi_ + 1}/{len(heaps)}  {time.time() - t_start:6.1f}s", end="", flush=True)
    print()
    # heaps are sorted near→far by z, but compositing above is order-free only
    # for non-overlapping heaps; ours barely overlap, which is fine visually.
    return dome


# --------------------------------------------------------------------------
# sky
# --------------------------------------------------------------------------

class Sky:
    def __init__(self, v: Variant):
        self.v = v
        L = v.look
        self.L = L
        self.sun = dir_from(L.sun_az, L.sun_el)
        self.sun_cloud = dir_from(L.cloud_light_az, L.sun_el + 10.0)
        self.glow_dir = dir_from(L.glow_az, L.glow_el)
        self.sun_az = math.radians(L.sun_az)
        P = v.planet
        self.pdir = dir_from(P.az, P.el)
        self.prad = math.radians(P.radius)
        self.plight = np.array(P.light, F) / np.linalg.norm(P.light)
        self.dome: Dome | None = None

    def base(self, d):
        """Sky colour without clouds, planet, mountains or sun disc."""
        L = self.L
        e = np.clip(d[1], -0.05, 1.0)
        az = np.arctan2(d[0], d[2])
        daz = np.angle(np.exp(1j * (az - self.sun_az))).astype(F)
        toward = np.exp(-(daz / 0.62) ** 2) * 0.85 + 0.12 * (0.5 + 0.5 * np.cos(daz))
        horizon = mix(col3(L.horizon_cool), col3(L.horizon_warm), toward)
        t_low = np.exp(-np.maximum(e, 0) * (11.0 - 7.5 * toward))
        t_high = smoothstep(0.08, 0.75, e)
        c = mix(col3(L.upper), horizon, t_low)
        c = mix(c, col3(L.zenith), t_high)
        # bright haze band hugging the horizon
        c = c + horizon * (0.16 * np.exp(-np.abs(e) * 70.0))
        g = dot(d, self.glow_dir)
        c = c + col3(L.horizon_warm) * (L.glow * np.exp(-(1 - g) / 0.05) * np.exp(-np.maximum(e, 0) * 2.5))
        cs = np.maximum(dot(d, self.sun), 0)
        low = np.exp(-np.maximum(e, 0) * 3.0)
        c = c + col3(L.sun_color) * (L.sun_power * ((0.02 * cs ** 3 + 0.09 * cs ** 14) * low + 0.30 * cs ** 110))
        return c

    def veil(self, d):
        """Glow that lies in front of the clouds (forward scattering in the air)."""
        cs = np.maximum(dot(d, self.sun), 0)
        return col3(self.L.sun_color) * (self.L.sun_power * (0.10 * cs ** 60 + 0.9 * cs ** 900))

    def disc(self, d):
        cs = dot(d, self.sun)
        return col3(self.L.sun_color) * (self.L.sun_power * 26.0 * smoothstep(0.99990, 0.99995, cs))

    def mountains(self, d, c):
        e = d[1]
        sel = (e > -0.004) & (e < 0.045)
        if not sel.any():
            return c
        az = np.arctan2(d[0][sel], d[2][sel])
        ee = e[sel]
        out = c[:, sel]
        L = self.L
        toward = np.maximum(np.cos(az - self.sun_az), 0) ** 6
        ranges = (  # (freq, base, amp, seed, haze, az mask)
            (5.0, 0.004, 0.012, 7, 0.62, None),
            (8.5, 0.002, 0.030, 91, 0.40, (-1.2, -0.10)),
            (11.0, 0.001, 0.026, 37, 0.34, (0.36, 1.2)),
        )
        for f, b0, amp, seed, haze, mask in ranges:
            n = fbm(az * f + seed, np.full_like(az, seed * 0.37), 6, seed)
            ridge = b0 + amp * np.clip(1.0 - np.abs(2 * n - 1), 0, 1) ** 2.6
            if mask:
                lo, hi = mask
                ridge *= smoothstep(lo - 0.12, lo + 0.06, az) * (1 - smoothstep(hi - 0.06, hi + 0.12, az))
            inside = ee < ridge
            depth = np.clip((ridge - ee) / np.maximum(ridge, 1e-4), 0, 1)
            body = mix(col3(L.horizon_cool) * 0.42, col3(L.horizon_warm) * 0.55, toward * 0.6)
            body = body * (0.85 + 0.25 * depth)
            m = mix(body, out, haze * (0.65 + 0.35 * depth))
            # backlit rim along the ridge near the sun
            rim = smoothstep(0.0012, 0.0, ridge - ee) * toward * 0.9
            m = m + col3(L.sun_color) * rim * 0.5
            out = np.where(inside, m, out)
        c[:, sel] = out
        return c

    def planet(self, d, c):
        """Composite the planet over c. Returns (c, coverage)."""
        P = self.v.planet
        cs = dot(d, self.pdir)
        cover = np.zeros(c.shape[1], F)
        m = cs > math.cos(self.prad * 1.01)
        if not m.any():
            return c, cover
        dd = (d[0][m], d[1][m], d[2][m])
        ang = np.arccos(np.clip(cs[m], -1, 1)) / self.prad
        up = np.array([0, 1, 0], F)
        right = np.cross(up, self.pdir)
        right /= np.linalg.norm(right)
        upv = np.cross(self.pdir, right)
        ox, oy = dot(dd, right), dot(dd, upv)
        l = np.sqrt(ox * ox + oy * oy) + 1e-9
        u, v = ox / l * ang, oy / l * ang
        w = np.sqrt(np.clip(1 - u * u - v * v, 0, 1))
        n = (u * right[0] + v * upv[0] - w * self.pdir[0],
             u * right[1] + v * upv[1] - w * self.pdir[1],
             u * right[2] + v * upv[2] - w * self.pdir[2])
        # surface: maria, craters with bright rims, fine regolith
        su, sv = u / (w + 0.35), v / (w + 0.35)
        maria = smoothstep(0.42, 0.66, fbm(su * 1.6 + 3.0, sv * 1.6 + 1.0, 5, 55))
        alb = 0.92 - 0.30 * maria + 0.08 * (fbm(su * 9.0, sv * 9.0, 4, 23) - 0.5)
        rng = np.random.default_rng(5)
        for _ in range(26):
            cx, cy = rng.uniform(-1.0, 1.0, 2)
            rr = rng.uniform(0.03, 0.14) ** 1.0
            dist = np.sqrt((su - cx) ** 2 + (sv - cy) ** 2) / rr
            alb = alb - 0.10 * smoothstep(1.0, 0.6, dist) + 0.07 * smoothstep(0.75, 1.0, dist) * smoothstep(1.3, 1.0, dist)
        ndl = np.clip(dot(n, self.plight), 0, 1)
        terminator = smoothstep(0.0, 0.25, dot(n, self.plight) + 0.05)
        L = self.L
        lit = col3((1.0, 0.93, 0.86)) * (1.7 * ndl ** 0.9 * terminator)
        earth = mix(col3(L.upper) * 2.6, col3(L.horizon_warm) * 0.35, 0.5 + 0.5 * (-v))
        pc = col3((0.94, 0.92, 0.90)) * (P.albedo * alb) * (lit * 0.85 + earth * 0.55)
        # limb darkening and the atmosphere in front of it
        pc = pc * (0.82 + 0.18 * w)
        base = c[:, m]
        pc = mix(pc, base, P.veil + 0.25 * (1 - w) ** 3)
        edge = smoothstep(1.0, 0.992, ang)
        c[:, m] = mix(base, pc, edge)
        cover[m] = edge
        return c, cover

    def cirrus(self, d, c):
        e = d[1]
        hi = e > 0.04
        if not hi.any():
            return c
        az = np.arctan2(d[0][hi], d[2][hi])
        px, pz = d[0][hi] / e[hi], d[2][hi] / e[hi]
        n = fbm(px * 0.6 + 4.0, pz * 3.0, 5, 140)
        streak = smoothstep(0.60, 0.86, n) * smoothstep(0.05, 0.14, e[hi]) * (1 - smoothstep(0.25, 0.55, e[hi]))
        toward = np.maximum(np.cos(az - self.sun_az), 0) ** 2
        col = mix(col3(self.L.horizon_cool) * 0.55, col3(self.L.horizon_warm) * 0.85, toward)
        c[:, hi] = mix(c[:, hi], col, streak * 0.20)
        return c

    def __call__(self, d, planet=True, disc=True):
        """Full sky radiance for directions d. Returns (colour, planet coverage)."""
        c = self.base(d)
        c = self.mountains(d, c)
        c = self.cirrus(d, c)
        cover = np.zeros(c.shape[1], F)
        if planet:
            c, cover = self.planet(d, c)
        if disc:
            above = d[1] > 0.0
            c[:, above] += self.disc(tuple(a[above] for a in d))
        if self.dome is not None:
            C, T = self.dome.sample(d)
            c = c * T + C
        c = c + self.veil(d)
        return c, cover


# --------------------------------------------------------------------------
# irradiance table (ambient light for any normal)
# --------------------------------------------------------------------------

class Irradiance:
    def __init__(self, sky: Sky, look: Look, n=4096, res=(48, 24)):
        rng = np.random.default_rng(3)
        v = rng.normal(size=(3, n)).astype(F)
        v /= np.linalg.norm(v, axis=0)
        d = (v[0], v[1], v[2])
        up = d[1] > 0
        rad = np.zeros((3, n), F)
        s_up, _ = sky(tuple(a[up] for a in d), planet=False, disc=False)
        rad[:, up] = s_up
        dn = ~up
        r = (d[0][dn], -d[1][dn], d[2][dn])
        s_r, _ = sky(r, planet=False, disc=False)
        fres = 0.02 + 0.98 * (1 - np.abs(d[1][dn])) ** 5
        rad[:, dn] = mix(col3(look.water), s_r, fres * 0.9 + 0.05)
        W, H = res
        th = np.linspace(-math.pi, math.pi, W, dtype=F)
        ph = np.linspace(-math.pi / 2, math.pi / 2, H, dtype=F)
        T, P = np.meshgrid(th, ph)
        nx, ny, nz = np.sin(T) * np.cos(P), np.sin(P), np.cos(T) * np.cos(P)
        N = np.stack([nx.ravel(), ny.ravel(), nz.ravel()])  # (3, W*H)
        cosw = np.clip(N.T @ v, 0, None)                     # (W*H, n)
        E = (cosw @ rad.T) / n * 4.4                         # ≈ E/π * π … scaled to taste
        self.E = E.T.reshape(3, H, W)
        self.W, self.H = W, H

    def __call__(self, n):
        th = np.arctan2(n[0], n[2])
        ph = np.arcsin(np.clip(n[1], -1, 1))
        u = (th + math.pi) / (2 * math.pi) * (self.W - 1)
        v = (ph + math.pi / 2) / math.pi * (self.H - 1)
        coords = np.stack([v, u])
        return np.stack([map_coordinates(self.E[k], coords, order=1, mode='nearest') for k in range(3)]).astype(F)


# --------------------------------------------------------------------------
# renderer
# --------------------------------------------------------------------------

class Renderer:
    def __init__(self, v: Variant, preview=False):
        self.v = v
        self.world = World(v)
        self.sky = Sky(v)
        self.preview = preview
        rng = np.random.default_rng(77)
        # calm sea: wave trains mostly travelling toward the camera (crests ∥ horizon)
        K = 48
        lam = np.exp(rng.uniform(math.log(0.3), math.log(6.0), K)).astype(F)
        ang = rng.normal(0.0, 0.42, K).astype(F) + math.pi / 2
        self.wk = (2 * math.pi / lam)
        self.wdx = np.cos(ang).astype(F)
        self.wdz = np.sin(ang).astype(F)
        self.wamp = (0.00022 * lam ** 1.08).astype(F)
        self.wph = rng.uniform(0, 2 * math.pi, K).astype(F)
        self.lam = lam

    def setup(self, dome: Dome | None):
        self.sky.dome = dome
        self.irr = Irradiance(self.sky, self.v.look)

    def fog(self, c, t, d):
        L = self.v.look
        f = 1.0 - np.exp(-t * L.haze)
        fc = self.sky.base((d[0], np.maximum(d[1], 0) * 0.3 + 0.005, d[2]))
        return mix(c, fc, f)

    def shade(self, o, d, t, mid, struct):
        w, sky, L = self.world, self.sky, self.v.look
        p = (o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t)
        n = w.normal(*p, struct)
        sun = sky.sun
        ndl = np.clip(dot(n, sun), 0, 1)
        sh = np.zeros_like(ndl)
        lit = ndl > 0
        if lit.any():
            i = np.nonzero(lit)[0]
            pp = tuple(p[k][i] + n[k][i] * 0.03 for k in range(3))
            sh[i] = w.shadow(pp, sun)
        occ = w.ao(p, n, struct)
        alb = np.zeros((3, t.size), F)
        gloss = np.zeros(t.size, F)
        L = self.v.look
        is_s = (mid == ID_SLAB) | (mid == ID_PLINTH)
        is_r = mid == ID_ROCK
        is_p = mid == ID_PATH
        is_f = mid == ID_FIGURE
        is_o = mid == ID_SPHERE
        if is_o.any():
            alb[:, is_o] = col3((0.05, 0.048, 0.047))
            gloss[is_o] = 0.65
        if is_s.any():
            lx, lz = w.to_local(p[0][is_s], p[2][is_s])
            gy = p[1][is_s]
            gx = lx + lz
            # polished, faintly brushed stone: soft vertical streaks, no visible joints
            brush = 0.93 + 0.10 * fbm(gx * 1.4, gy * 0.025, 4, 5) + 0.04 * fbm(gx * 6.0, gy * 0.3, 2, 9)
            stain = 1.0 - 0.10 * smoothstep(0.55, 0.85, fbm(gx * 0.5, gy * 0.04, 4, 13))
            alb[:, is_s] = col3((0.10, 0.108, 0.122)) * (brush * stain)
            pl = mid[is_s] == ID_PLINTH
            alb[:, np.nonzero(is_s)[0][pl]] *= 0.62
            gloss[is_s] = 0.42
        if is_r.any():
            q = p[0][is_r], p[1][is_r], p[2][is_r]
            alb[:, is_r] = col3((0.34, 0.31, 0.29)) * (0.7 + 0.6 * fbm(q[0] * 0.8 + q[2], q[1] * 1.6, 4, 3))
            gloss[is_r] = 0.18 * (1 - smoothstep(0.2, 1.6, q[1]))   # wet near the waterline
        if is_p.any():
            alb[:, is_p] = col3((0.022, 0.022, 0.024))
            gloss[is_p] = 0.22
        if is_f.any():
            alb[:, is_f] = col3((0.018, 0.017, 0.017))
            gloss[is_f] = 0.05
        amb = self.irr(n) * occ
        # warm light pooled under the arch (bounce from the lit water in its opening)
        pl_ = w.portal_light
        lv = (pl_[0] - p[0], pl_[1] - p[1], pl_[2] - p[2])
        dist2 = dot(lv, lv)
        lvn = norm(lv)
        pool = col3(L.sun_color) * (np.clip(dot(n, lvn), 0, 1) * 70.0 / (dist2 + 30.0))
        sunlight = col3(L.sun_color) * (L.sun_power * 1.4 * ndl * sh)
        # soft cool fill from the open sky on the camera's left (art-directed, no shadows)
        fdir = norm((np.full_like(t, -0.62), np.full_like(t, 0.42), np.full_like(t, -0.66)))
        fill = col3((0.30, 0.34, 0.42)) * (np.clip(dot(n, fdir), 0, 1) ** 1.3 * 0.05 * occ)
        c = alb * (sunlight + amb + pool + fill)
        vd = dot(d, n)
        ry = d[1] - 2 * vd * n[1]
        r = (d[0] - 2 * vd * n[0], np.abs(ry), d[2] - 2 * vd * n[2])
        fres = 0.04 + 0.96 * (1 - np.clip(-vd, 0, 1)) ** 5
        # reflections see the clouded sky above the horizon and the dark sea below it
        env, _ = sky(norm(r), planet=False, disc=False)
        env = np.where(ry < 0, env * 0.35 + col3(L.water), env) + sky.veil(r) * sh
        c = c + env * (np.clip(fres * 2.2 + 0.05, 0, 1) * gloss)
        return self.fog(c, t, d)

    def water_normal(self, x, z, t, d):
        # filter out waves smaller than ~2 pixels at this distance (anti-aliasing)
        H = self.Hpx
        pix = t * (2 * math.tan(math.radians(self.v.cam.vfov) / 2) / H) / np.maximum(np.abs(d[1]), 0.02)
        gx = np.zeros_like(x)
        gz = np.zeros_like(x)
        # cat's paws: wind patches where the surface is rougher or glassier
        patch = 0.35 + 1.3 * smoothstep(0.35, 0.75, fbm(x * 0.012 + 3.0, z * 0.03, 4, 202))
        for k in range(self.wk.size):
            fade = smoothstep(4.0, 1.5, pix / self.lam[k])
            ph = (x * self.wdx[k] + z * self.wdz[k]) * self.wk[k] + self.wph[k]
            g = self.wamp[k] * self.wk[k] * np.cos(ph) * fade
            gx += g * self.wdx[k]
            gz += g * self.wdz[k]
        gx *= patch
        gz *= patch
        return norm((-gx, np.ones_like(x), -gz))

    def trace(self, o, d, struct=True, planet=True, depth=0):
        w = self.world
        n = o[0].size
        c = np.zeros((3, n), F)
        inv = np.zeros(n, bool)       # touches the portal structure (front layer)
        pcov = np.zeros(n, F)         # planet coverage (planet layer)
        tw = np.where(d[1] < -1e-5, -o[1] / np.minimum(d[1], -1e-5), np.inf).astype(F)
        t0, t1 = w.aabb(o, d)
        t1 = np.minimum(t1, tw)
        t, hit, mid = w.march(o, d, t0, t1, struct, self.v.steps)
        if hit.any():
            i = np.nonzero(hit)[0]
            c[:, i] = self.shade(tuple(a[i] for a in o), tuple(a[i] for a in d), t[i], mid[i], struct)
            inv[i] = np.isin(mid[i], STRUCT)
        water = (~hit) & np.isfinite(tw) & (depth == 0)
        if water.any():
            i = np.nonzero(water)[0]
            cw, iv = self.shade_water(tuple(a[i] for a in o), tuple(a[i] for a in d), tw[i], struct, planet)
            c[:, i] = cw
            inv[i] = iv
        skym = (~hit) & ~water
        if skym.any():
            i = np.nonzero(skym)[0]
            dd = tuple(a[i] for a in d)
            if depth > 0:   # reflected rays never see below the horizon
                dd = (dd[0], np.maximum(dd[1], 0.0005), dd[2])
            sc, cov = self.sky(dd, planet=planet, disc=depth == 0)
            c[:, i] = sc
            pcov[i] = cov
        return c, inv, pcov

    def shade_water(self, o, d, t, struct, planet):
        L, sky = self.v.look, self.sky
        x, z = o[0] + d[0] * t, o[2] + d[2] * t
        n = self.water_normal(x, z, t, d)
        vd = dot(d, n)
        r = norm((d[0] - 2 * vd * n[0], np.maximum(d[1] - 2 * vd * n[1], 0.0008), d[2] - 2 * vd * n[2]))
        o2 = (x + r[0] * 0.01, np.full_like(x, 0.01), z + r[2] * 0.01)
        refl, inv, _ = self.trace(o2, r, struct, planet, depth=1)
        fres = 0.02 + 0.98 * (1 - np.clip(-vd, 0, 1)) ** 5
        k = np.clip(fres * 1.1 + 0.12, 0, 0.92)
        c = mix(col3(L.water), refl, k)
        # sun glitter: a sharp micro-facet lobe → the path of light on the water
        hv = norm((sky.sun[0] - d[0], sky.sun[1] - d[1], sky.sun[2] - d[2]))
        nh = np.clip(dot(n, hv), 0, 1)
        m2 = 0.0035
        tan2 = (1 - nh * nh) / np.maximum(nh * nh, 1e-6)
        spec = np.exp(-tan2 / m2) / (math.pi * m2 * np.maximum(nh, 1e-3) ** 4) * 0.02 * fres
        sel = spec > 0.002
        if sel.any():
            i = np.nonzero(sel)[0]
            sh = self.world.shadow((x[i], np.full(i.size, 0.02, F), z[i]), sky.sun, steps=90)
            spec_s = np.zeros_like(spec)
            spec_s[i] = spec[i] * sh
            c = c + col3(L.sun_color) * (L.sun_power * 0.9 * np.minimum(spec_s, 40.0))
        return self.fog(c, t, d), inv

    def rays(self, rows, W, H):
        cam = self.v.cam
        yaw, pitch = math.radians(cam.yaw), math.radians(cam.pitch)
        f = np.array([math.sin(yaw) * math.cos(pitch), math.sin(pitch), math.cos(yaw) * math.cos(pitch)], F)
        r = np.cross(np.array([0, 1, 0], F), f)
        r /= np.linalg.norm(r)
        u = np.cross(f, r)
        th = math.tan(math.radians(cam.vfov) / 2)
        xs = ((np.arange(W, dtype=F) + 0.5) / W * 2 - 1) * th * (W / H)
        ys = (1 - (rows.astype(F) + 0.5) / H * 2) * th
        X, Y = np.meshgrid(xs, ys)
        X, Y = X.ravel(), Y.ravel()
        d = norm((f[0] + X * r[0] + Y * u[0], f[1] + X * r[1] + Y * u[1], f[2] + X * r[2] + Y * u[2]))
        o = tuple(np.full_like(X, vv) for vv in cam.pos)
        return o, d

    def dome_bounds(self):
        """Direction bounds that primary and (slightly perturbed) reflected rays can reach."""
        cam = self.v.cam
        H = cam.height
        rows = np.array([0, H // 2, H - 1])
        o, d = self.rays(rows, cam.width, H)
        az = np.degrees(np.arctan2(d[0], d[2]))
        el = np.degrees(np.arcsin(d[1]))
        return (float(az.min()) - 4, float(az.max()) + 4, -1.0, float(max(el.max(), -el.min())) + 3)

    def render(self, ss, scale, chunk_rows=64):
        cam = self.v.cam
        W, H = int(cam.width * scale) * ss, int(cam.height * scale) * ss
        self.Hpx = H
        full = np.zeros((H, W, 3), F)
        back = np.zeros((H, W, 3), F)
        skyl = np.zeros((H, W, 3), F)
        mask = np.zeros((H, W), F)
        pmask = np.zeros((H, W), F)
        t0 = time.time()
        for y0 in range(0, H, chunk_rows):
            rows = np.arange(y0, min(H, y0 + chunk_rows))
            o, d = self.rays(rows, W, H)
            c, inv, pcov = self.trace(o, d, True, True)
            sl = slice(rows[0], rows[-1] + 1)
            full[sl] = c.T.reshape(len(rows), W, 3)
            cb = c.copy()
            if inv.any():
                i = np.nonzero(inv)[0]
                cb[:, i], _, pc2 = self.trace(tuple(a[i] for a in o), tuple(a[i] for a in d), False, True)
                pcov[i] = pc2
            back[sl] = cb.T.reshape(len(rows), W, 3)
            mask[sl] = inv.reshape(len(rows), W)
            # the planet layer holds only the planet in the sky; its reflection stays in the sea
            cs = cb.copy()
            pl = (pcov > 0) & (d[1] > 0)
            if pl.any():
                i = np.nonzero(pl)[0]
                cs[:, i], _, _ = self.trace(tuple(a[i] for a in o), tuple(a[i] for a in d), False, False)
            skyl[sl] = cs.T.reshape(len(rows), W, 3)
            pmask[sl] = pl.reshape(len(rows), W)
            print(f"\r  {self.v.name}: {min((y0 + chunk_rows) / H, 1) * 100:5.1f}%  {time.time() - t0:6.1f}s",
                  end="", flush=True)
        print()
        return full, back, skyl, mask, pmask


# --------------------------------------------------------------------------
# post
# --------------------------------------------------------------------------

def tonemap(x, exposure):
    x = x * exposure
    x = (x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14)
    x = np.clip(x, 0, 1)
    lum = (x[..., 0] * 0.2126 + x[..., 1] * 0.7152 + x[..., 2] * 0.0722)[..., None]
    # split tone: blue-grey shadows, warm highlights
    x = x + (np.array([-0.006, 0.0, 0.016], F) * (1 - lum) ** 2 + np.array([0.014, 0.004, -0.012], F) * lum)
    return np.clip(x, 0, 1) ** (1 / 2.2)


def bloom(hdr, strength=0.10):
    lum = hdr.mean(-1, keepdims=True)
    bright = hdr * smoothstep(1.5, 5.0, lum)
    H = hdr.shape[0]
    out = np.zeros_like(hdr)
    for s, w in ((H * 0.004, 0.5), (H * 0.016, 0.3), (H * 0.05, 0.12)):
        out += w * np.stack([gaussian_filter(bright[..., k], s) for k in range(3)], -1)
    return out * strength


def light_shafts(hdr, struct_cov, sun_px, strength=0.22, samples=90):
    """Screen-space radial blur of the bright sky seen through/around the portal."""
    H, W = hdr.shape[:2]
    sc = 0.25
    small = hdr[::4, ::4]
    occ = struct_cov[::4, ::4]
    lum = small.mean(-1)
    src = small * (smoothstep(0.9, 3.0, lum) * (1 - occ))[..., None]
    h, w = src.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(F)
    sx, sy = sun_px[0] * sc, sun_px[1] * sc
    acc = np.zeros_like(src)
    decay = 1.0
    for i in range(samples):
        f = 1.0 - i / samples * 0.85
        cx = sx + (xx - sx) * f
        cy = sy + (yy - sy) * f
        coords = np.stack([cy.ravel(), cx.ravel()])
        for k in range(3):
            acc[..., k] += map_coordinates(src[..., k], coords, order=1, mode='constant').reshape(h, w) * decay
        decay *= 0.975
    acc = acc / samples
    acc = np.stack([gaussian_filter(acc[..., k], 2.0) for k in range(3)], -1)
    up = np.kron(acc, np.ones((4, 4, 1), F))[:H, :W]
    return up * strength


def vignette(img, strength=0.22):
    H, W = img.shape[:2]
    y = (np.arange(H, dtype=F) / H - 0.5)[:, None]
    x = (np.arange(W, dtype=F) / W - 0.5)[None, :]
    v = 1 - strength * np.clip((x * x * 1.1 + y * y * 1.6) * 2.2, 0, 1) ** 1.5
    return img * v[..., None]


def finish(v: Variant, sky: Sky, renderer: Renderer, full, back, skyl, mask, pmask, ss, suffix):
    OUT.mkdir(parents=True, exist_ok=True)
    L = v.look
    full_d, back_d, sky_d = (downsample(a, ss) for a in (full, back, skyl))
    cov_d = downsample(mask, ss)
    # shared glow (bloom from the full image is used by every layer, so they stay consistent)
    gl = bloom(full_d)
    # where is the sun on screen?
    cam = v.cam
    Hh, Ww = full_d.shape[:2]
    s = sky.sun
    yaw, pitch = math.radians(cam.yaw), math.radians(cam.pitch)
    f = np.array([math.sin(yaw) * math.cos(pitch), math.sin(pitch), math.cos(yaw) * math.cos(pitch)])
    r = np.cross([0, 1, 0], f)
    r /= np.linalg.norm(r)
    u = np.cross(f, r)
    th = math.tan(math.radians(cam.vfov) / 2)
    sx = (np.dot(s, r) / np.dot(s, f)) / (th * Ww / Hh)
    sy = (np.dot(s, u) / np.dot(s, f)) / th
    sun_px = ((sx + 1) / 2 * Ww, (1 - sy) / 2 * Hh)
    shafts = light_shafts(full_d, cov_d, sun_px) if 0 <= sun_px[0] <= Ww and 0 <= sun_px[1] <= Hh else np.zeros_like(full_d)

    def look(a, add_shafts=False):
        x = a + gl
        if add_shafts:
            x = x + shafts
        return vignette(tonemap(x, L.exposure))

    tf, tb, ts = look(full_d), look(back_d), look(sky_d)
    comp_rays = look(full_d, True)
    # front layer: structure coverage, un-premultiplied
    a = np.clip(cov_d, 0, 1)
    front_rgb = np.where(a[..., None] > 1e-4, (tf - tb * (1 - a[..., None])) / np.maximum(a[..., None], 1e-4), 0)
    front_rgb = np.clip(front_rgb, 0, 1)
    pa = np.clip(downsample(pmask, ss), 0, 1)
    planet_rgb = np.where(pa[..., None] > 1e-4, (tb - ts * (1 - pa[..., None])) / np.maximum(pa[..., None], 1e-4), 0)
    planet_rgb = np.clip(planet_rgb, 0, 1)
    rays = np.clip(comp_rays - tf, 0, 1)
    # composite exactly as the site does: sky → planet → front, rays added on top
    back_c = planet_rgb * pa[..., None] + ts * (1 - pa[..., None])
    comp = front_rgb * a[..., None] + back_c * (1 - a[..., None])
    name = v.name + suffix
    save_rgb(np.clip(comp + rays, 0, 1), OUT / f"{name}.png")
    save_rgb(comp, OUT / f"{name}-norays.png")
    save_rgb(ts, OUT / f"{name}-sky.png")
    save_rgba(planet_rgb, pa, OUT / f"{name}-planet.png")
    save_rgba(front_rgb, a, OUT / f"{name}-front.png")
    save_rgb(rays, OUT / f"{name}-rays.png")
    info = {"sun_px": [sun_px[0] / Ww * 100, sun_px[1] / Hh * 100], "size": [Ww, Hh]}
    (OUT / f"{name}.json").write_text(json.dumps(info, indent=2))
    print("  sun at %.1f%% / %.1f%%" % tuple(info["sun_px"]))


def dome_for(v: Variant, r: Renderer, ppd):
    bounds = r.dome_bounds()
    code = inspect.getsource(CloudHeap) + inspect.getsource(render_dome) + inspect.getsource(Sky.base)
    key = hashlib.sha1(json.dumps([asdict(v.cam), asdict(v.look), [asdict(c) for c in v.clouds], ppd, bounds, code],
                                  sort_keys=True).encode()).hexdigest()[:12]
    path = OUT / f"dome-{v.name}-{key}.npz"
    if path.exists():
        z = np.load(path)
        dome = Dome(*bounds, ppd)
        dome.C, dome.T = z["C"], z["T"]
        print(f"  dome {v.name}: cached")
        return dome
    dome = render_dome(v, r.sky, ppd, bounds)
    OUT.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(path, C=dome.C, T=dome.T)
    return dome


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("names", nargs="+", help="desktop, mobile or all")
    ap.add_argument("--preview", action="store_true")
    ap.add_argument("--scale", type=float, default=None)
    ap.add_argument("--ss", type=int, default=2)
    a = ap.parse_args()
    V = variants()
    names = list(V) if a.names == ["all"] else a.names
    for nm in names:
        v = V[nm]
        r = Renderer(v, a.preview)
        ppd = 12.0 if a.preview else v.dome_ppd
        dome = dome_for(v, r, ppd)
        r.setup(dome)
        ss = 1 if a.preview else a.ss
        scale = a.scale if a.scale else (0.4 if a.preview else 1.0)
        out = r.render(ss, scale)
        finish(v, r.sky, r, *out, ss, "-preview" if a.preview else "")


if __name__ == "__main__":
    main()

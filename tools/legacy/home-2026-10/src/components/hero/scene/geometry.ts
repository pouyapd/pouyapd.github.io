/**
 * Meshes for the hero scene, in the toolkit's 9-float layout
 * (position 3, normal 3, uv 2, part 1). All are built once, in code.
 */
import type { Vec3 } from '../../stage/gl'

type V = number[]

function tri(v: V, a: Vec3, b: Vec3, c: Vec3, n: Vec3, part: number) {
  for (const p of [a, b, c]) v.push(p[0], p[1], p[2], n[0], n[1], n[2], 0, 0, part)
}
function quad(v: V, a: Vec3, b: Vec3, c: Vec3, d: Vec3, n: Vec3, part: number) {
  tri(v, a, b, c, n, part)
  tri(v, a, c, d, n, part)
}
const faceNormal = (a: Vec3, b: Vec3, c: Vec3): Vec3 => {
  const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
  const w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
  const n: Vec3 = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]
  const l = Math.hypot(...n) || 1
  return [n[0] / l, n[1] / l, n[2] / l]
}

export interface Slab {
  w: number
  h: number
  d: number
  /** arch: centre x, half-width, springing height (the semicircle's centre) */
  ax: number
  aw: number
  ay: number
}

/**
 * The slab with its arch: a box (base on y = 0, front facing +z) pierced by
 * an opening that runs from the base up to a semicircular head.
 * Parts: 0 front, 1 back, 2 outer sides and top, 3 inside of the arch.
 */
export function slab(s: Slab, seg = 56): V {
  const v: V = []
  const hw = s.w / 2
  const hd = s.d / 2
  const l = s.ax - s.aw
  const r = s.ax + s.aw
  for (const [z, n, part] of [
    [hd, 1, 0],
    [-hd, -1, 1],
  ] as const) {
    const N: Vec3 = [0, 0, n]
    const q = (a: Vec3, b: Vec3, c: Vec3, d: Vec3) => (n > 0 ? quad(v, a, b, c, d, N, part) : quad(v, a, d, c, b, N, part))
    q([-hw, 0, z], [l, 0, z], [l, s.h, z], [-hw, s.h, z])
    q([r, 0, z], [hw, 0, z], [hw, s.h, z], [r, s.h, z])
    // between the arch's head and the top
    for (let i = 0; i < seg; i++) {
      const a0 = Math.PI - (i / seg) * Math.PI
      const a1 = Math.PI - ((i + 1) / seg) * Math.PI
      const x0 = s.ax + Math.cos(a0) * s.aw
      const x1 = s.ax + Math.cos(a1) * s.aw
      q([x0, s.ay + Math.sin(a0) * s.aw, z], [x1, s.ay + Math.sin(a1) * s.aw, z], [x1, s.h, z], [x0, s.h, z])
    }
  }
  // outer sides and top
  quad(v, [hw, 0, hd], [hw, 0, -hd], [hw, s.h, -hd], [hw, s.h, hd], [1, 0, 0], 2)
  quad(v, [-hw, 0, -hd], [-hw, 0, hd], [-hw, s.h, hd], [-hw, s.h, -hd], [-1, 0, 0], 2)
  quad(v, [-hw, s.h, hd], [hw, s.h, hd], [hw, s.h, -hd], [-hw, s.h, -hd], [0, 1, 0], 2)
  // inside the arch: two jambs and the vault (normals point into the opening)
  quad(v, [l, 0, -hd], [l, 0, hd], [l, s.ay, hd], [l, s.ay, -hd], [1, 0, 0], 3)
  quad(v, [r, 0, hd], [r, 0, -hd], [r, s.ay, -hd], [r, s.ay, hd], [-1, 0, 0], 3)
  for (let i = 0; i < seg; i++) {
    const a0 = Math.PI - (i / seg) * Math.PI
    const a1 = Math.PI - ((i + 1) / seg) * Math.PI
    const p = (a: number, z: number): Vec3 => [s.ax + Math.cos(a) * s.aw, s.ay + Math.sin(a) * s.aw, z]
    const am = (a0 + a1) / 2
    quad(v, p(a0, hd), p(a0, -hd), p(a1, -hd), p(a1, hd), [-Math.cos(am), -Math.sin(am), 0], 3)
  }
  return smoothVault(v, s)
}

/** gives the vault smooth (per-vertex) normals so its curve shades as a curve */
function smoothVault(v: V, s: Slab): V {
  for (let i = 0; i < v.length; i += 9) {
    if (v[i + 8] !== 3 || v[i + 1] <= s.ay + 1e-4) continue
    const dx = v[i] - s.ax
    const dy = v[i + 1] - s.ay
    const l = Math.hypot(dx, dy) || 1
    v[i + 3] = -dx / l
    v[i + 4] = -dy / l
    v[i + 5] = 0
  }
  return v
}

export function sphere(r: number, rings = 72, segs = 128): V {
  const v: V = []
  const p = (i: number, j: number): [Vec3, Vec3] => {
    const th = (i / rings) * Math.PI
    const ph = (j / segs) * Math.PI * 2
    const n: Vec3 = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]
    return [[n[0] * r, n[1] * r, n[2] * r], n]
  }
  const push = ([a, n]: [Vec3, Vec3]) => v.push(a[0], a[1], a[2], n[0], n[1], n[2], 0, 0, 0)
  for (let i = 0; i < rings; i++)
    for (let j = 0; j < segs; j++) {
      const a = p(i, j), b = p(i + 1, j), c = p(i + 1, j + 1), d = p(i, j + 1)
      push(a); push(c); push(b)
      push(a); push(d); push(c)
    }
  return v
}

/** A box, centred on x and z, from y0 to y1. Part 0 is the top. */
export function box(w: number, y0: number, y1: number, d: number): V {
  const v: V = []
  const x = w / 2
  const z = d / 2
  quad(v, [-x, y1, z], [x, y1, z], [x, y1, -z], [-x, y1, -z], [0, 1, 0], 0)
  quad(v, [-x, y0, z], [x, y0, z], [x, y1, z], [-x, y1, z], [0, 0, 1], 1)
  quad(v, [x, y0, -z], [-x, y0, -z], [-x, y1, -z], [x, y1, -z], [0, 0, -1], 1)
  quad(v, [x, y0, z], [x, y0, -z], [x, y1, -z], [x, y1, z], [1, 0, 0], 1)
  quad(v, [-x, y0, -z], [-x, y0, z], [-x, y1, z], [-x, y1, -z], [-1, 0, 0], 1)
  return v
}

/** a surface of revolution around y with an elliptical section (depth = width · squash) */
function lathe(v: V, profile: [number, number][], cx: number, squash: number, segs = 28) {
  for (let i = 0; i < profile.length - 1; i++) {
    const [r0, y0] = profile[i]
    const [r1, y1] = profile[i + 1]
    for (let j = 0; j < segs; j++) {
      const a0 = (j / segs) * Math.PI * 2
      const a1 = ((j + 1) / segs) * Math.PI * 2
      const P = (r: number, y: number, a: number): Vec3 => [cx + Math.cos(a) * r, y, Math.sin(a) * r * squash]
      const slope = (r0 - r1) / Math.max(1e-4, y1 - y0)
      const n = (a: number): Vec3 => {
        const nn: Vec3 = [Math.cos(a), slope, (Math.sin(a) / squash)]
        const l = Math.hypot(...nn)
        return [nn[0] / l, nn[1] / l, nn[2] / l]
      }
      const pts: [Vec3, Vec3][] = [
        [P(r0, y0, a0), n(a0)],
        [P(r1, y1, a0), n(a0)],
        [P(r1, y1, a1), n(a1)],
        [P(r0, y0, a1), n(a1)],
      ]
      for (const k of [0, 2, 1, 0, 3, 2]) {
        const [p, nn] = pts[k]
        v.push(p[0], p[1], p[2], nn[0], nn[1], nn[2], 0, 0, 0)
      }
    }
  }
}

/** A person in a long coat, about 1.8 tall, standing on y = 0, facing −z (away from the camera). */
export function figure(): V {
  const v: V = []
  // legs below the coat
  for (const x of [-0.085, 0.085])
    lathe(v, [[0.0, 0.0], [0.055, 0.02], [0.06, 0.08], [0.07, 0.45], [0.08, 0.7]], x, 1.1, 12)
  // coat, shoulders, collar
  lathe(
    v,
    [
      [0.0, 0.52],
      [0.2, 0.53],
      [0.2, 0.62],
      [0.19, 0.85],
      [0.18, 1.1],
      [0.2, 1.3],
      [0.215, 1.4],
      [0.19, 1.46],
      [0.11, 1.5],
      [0.07, 1.53],
      [0.0, 1.535],
    ],
    0,
    0.62,
  )
  // neck and head
  lathe(v, [[0.0, 1.5], [0.055, 1.5], [0.05, 1.58], [0.0, 1.58]], 0, 1, 12)
  const head: [number, number][] = []
  for (let i = 0; i <= 12; i++) {
    const a = -Math.PI / 2 + (i / 12) * Math.PI
    head.push([Math.cos(a) * 0.1, 1.665 + Math.sin(a) * 0.115])
  }
  lathe(v, head, 0, 1.05, 16)
  return v
}

/** deterministic value noise for the rocks */
function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return s - Math.floor(s)
}
function vnoise(x: number, y: number) {
  const ix = Math.floor(x), iy = Math.floor(y)
  const fx = x - ix, fy = y - iy
  const u = fx * fx * (3 - 2 * fx), w = fy * fy * (3 - 2 * fy)
  const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1)
  return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w
}

/**
 * A spur of jagged rock: a faceted height field over [x0, x1] × [z0, z1],
 * highest near (peakX, peakZ) and sinking under the water at its edges.
 */
export function rocks(x0: number, x1: number, z0: number, z1: number, peak: [number, number, number], nx = 64, nz = 40): V {
  const v: V = []
  const [px, pz, ph] = peak
  const height = (x: number, z: number) => {
    const dx = (x - px) / (x1 - px > 0 ? (x > px ? x1 - px : px - x0) : 1)
    const dz = (z - pz) / ((z1 - z0) * 0.5)
    const mass = Math.max(0, 1 - Math.sqrt(dx * dx * 1.0 + dz * dz)) ** 1.35
    let ridged = 0
    let amp = 1
    let f = 0.35
    for (let o = 0; o < 4; o++) {
      ridged += (1 - Math.abs(vnoise(x * f + 3.1, z * f + 7.7) * 2 - 1)) * amp
      amp *= 0.5
      f *= 2.1
    }
    return mass * ph * (0.25 + 0.95 * ridged / 1.875) + (vnoise(x * 2.3, z * 2.3) - 0.5) * 0.5 * mass - 0.35
  }
  const P = (i: number, j: number): Vec3 => {
    const x = x0 + ((x1 - x0) * i) / nx
    const z = z0 + ((z1 - z0) * j) / nz
    return [x, height(x, z), z]
  }
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) {
      const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1)
      if (Math.max(a[1], b[1], c[1], d[1]) < 0) continue
      tri(v, a, c, b, faceNormal(a, c, b), 0)
      tri(v, a, d, c, faceNormal(a, d, c), 0)
    }
  return v
}

/** The orbit as a ribbon: per vertex, the angle (0..1) and the side (−1 or 1); the shader places it. */
export function ribbon(n = 720): V {
  const v: V = []
  const p = (i: number, side: number) => v.push(i / n, side, 0, 0, 0, 0, 0, 0, 0)
  for (let i = 0; i < n; i++) {
    p(i, -1); p(i + 1, -1); p(i + 1, 1)
    p(i, -1); p(i + 1, 1); p(i, 1)
  }
  return v
}

/** The sea: one large quad on y = 0, reaching to the horizon. */
export function sea(): V {
  const s = 9000
  const n: Vec3 = [0, 1, 0]
  const p = (x: number, z: number) => [x, 0, z, ...n, 0, 0, 0]
  return [...p(-s, 60), ...p(s, 60), ...p(s, -s), ...p(-s, 60), ...p(s, -s), ...p(-s, -s)]
}

import { createStage, frameLoop } from './gl'

/**
 * A diamond solitaire, ray traced in real time in one fragment shader (WebGL 1,
 * no library): the Stella ring from Maison Aurel. The stone is a round
 * brilliant of 57 flat facets traced exactly (refraction in, up to six
 * internal reflections, dispersion on the way out); the setting — a band that
 * parts round the stone, four claws and a gallery — is ray marched. Both reflect
 * one studio of soft boxes and two small hard lights, which is what makes the
 * stone sparkle as it turns.
 *
 * Drag to turn it (with inertia), hover to tilt it, arrow keys when focused.
 * It renders only while on screen; with reduced motion it does not turn on its
 * own. Resolution adapts to how fast the device draws it.
 */

export type Metal = 'yellow' | 'rose' | 'white'

/** Reflectance of each metal at normal incidence (linear RGB). */
const METAL_F0: Record<Metal, [number, number, number]> = {
  yellow: [1.0, 0.72, 0.31],
  rose: [0.96, 0.62, 0.5],
  white: [0.88, 0.87, 0.85],
}

/* ---- the stone's facets, worked out once (girdle radius 1, centred on the girdle) ---- */

const GT = 0.016 // half the girdle's thickness
const BEZEL = (34.5 * Math.PI) / 180 // crown angle
const PAV = (40.75 * Math.PI) / 180 // pavilion angle
const TABLE_V = 0.58 // radius of the table's corners
const STAR_R = 0.8 // where the star facets end, between two bezels
const LOWER_R = 0.22 // where the lower girdle facets end, towards the culet

type V3 = [number, number, number]
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const at = (r: number, y: number, az: number): V3 => [r * Math.cos(az), y, r * Math.sin(az)]

/** The plane through three points, as (outward normal, offset): the stone is where n·p ≤ offset. */
function plane(a: V3, b: V3, c: V3): number[] {
  const n = cross(sub(b, a), sub(c, a))
  const l = Math.hypot(...n)
  let v: V3 = [n[0] / l, n[1] / l, n[2] / l]
  let h = dot(v, a)
  if (h < 0) {
    v = [-v[0], -v[1], -v[2]]
    h = -h
  }
  return [...v, h]
}
const mirror = (f: number[]) => [f[0], f[1], -f[2], f[3]]

function facets() {
  const e = Math.PI / 8 // 22.5°
  const table = GT + (1 - TABLE_V) * Math.tan(BEZEL)
  const bezel = [Math.sin(BEZEL), Math.cos(BEZEL), 0, Math.sin(BEZEL) + Math.cos(BEZEL) * GT]
  const starTip = at(STAR_R, (bezel[3] - Math.sin(BEZEL) * STAR_R * Math.cos(e)) / Math.cos(BEZEL), e)
  const star = plane(at(TABLE_V, table, 0), at(TABLE_V, table, 2 * e), starTip)
  const upper = plane(at(1, GT, 0), at(1, GT, e), starTip)
  const main = [Math.sin(PAV), -Math.cos(PAV), 0, Math.sin(PAV) + Math.cos(PAV) * GT]
  const lowerTip = at(LOWER_R, (Math.sin(PAV) * LOWER_R * Math.cos(e) - main[3]) / Math.cos(PAV), e)
  const lower = plane(at(1, -GT, 0), at(1, -GT, e), lowerTip)
  // seven facets per eighth of the stone; the shader turns them round eight times (+ the table, + the girdle)
  return { table, list: [bezel, star, upper, mirror(upper), main, lower, mirror(lower)].flat() }
}

/* ---- the studio: soft boxes (centre, half size, softness, intensity, colour), in world directions ---- */

const LIGHTS: { dir: V3; size: [number, number]; soft: number; power: number; colour: V3; roll?: number }[] = [
  { dir: [-0.55, 0.72, 0.55], size: [0.5, 0.3], soft: 0.08, power: 3.2, colour: [1, 0.96, 0.9] }, // key, above front left
  { dir: [0.95, 0.18, 0.15], size: [0.07, 0.75], soft: 0.03, power: 5.5, colour: [1, 0.98, 0.95] }, // strip, right
  { dir: [-0.85, 0.06, -0.5], size: [0.85, 0.12], soft: 0.22, power: 2.4, colour: [1, 0.55, 0.24] }, // low warm panel, the sunset
  { dir: [0.15, 0.2, -0.95], size: [0.55, 0.05], soft: 0.04, power: 2.4, colour: [1, 0.94, 0.86] }, // rim, behind
  { dir: [0.35, 0.62, 0.7], size: [0.022, 0.022], soft: 0.008, power: 60, colour: [1, 1, 1] }, // hard light, front right
  { dir: [-0.22, 0.88, -0.42], size: [0.018, 0.04], soft: 0.008, power: 42, colour: [1, 0.97, 0.92] }, // hard light, above
]

function lightUniforms() {
  const c: number[] = [], u: number[] = [], v: number[] = [], s: number[] = [], k: number[] = []
  for (const l of LIGHTS) {
    const n = Math.hypot(...l.dir)
    const d: V3 = [l.dir[0] / n, l.dir[1] / n, l.dir[2] / n]
    let a = cross(d, [0, 1, 0])
    if (Math.hypot(...a) < 1e-3) a = [1, 0, 0]
    const al = Math.hypot(...a)
    a = [a[0] / al, a[1] / al, a[2] / al]
    const b = cross(a, d)
    c.push(...d)
    u.push(...a)
    v.push(...b)
    s.push(l.size[0], l.size[1], l.soft, l.power)
    k.push(...l.colour)
  }
  return { c, u, v, s, k }
}

const FRAGMENT = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform mat3 uRot;
uniform vec3 uMetal;
uniform vec4 uFacet[7];
uniform float uTable;
uniform vec3 uLc[6];
uniform vec3 uLu[6];
uniform vec3 uLv[6];
uniform vec4 uLs[6];
uniform vec3 uLk[6];

const vec3 EYE = vec3(0.0, 2.35, 4.35);
const vec3 TARGET = vec3(0.0, 0.5, 0.0);
const float FOCAL = 1.46;
const vec3 PIVOT = vec3(0.0, 0.26, 0.0);
const float RB = 1.0;            // the band's middle radius
const vec3 GEM = vec3(0.0, 1.47, 0.0);
const float GR = 0.46;           // the stone's girdle radius
const float IOR = 2.418;
const float C45 = 0.70710678;
const float FLOOR = -1.12;

/* ---------- the studio ---------- */
vec3 env(vec3 d, float rough) {
  vec3 col = vec3(0.012, 0.013, 0.015);
  col += vec3(0.07, 0.05, 0.034) * (1.0 - smoothstep(-0.7, 0.05, d.y));   // warm bounce from below
  col += vec3(0.025, 0.027, 0.032) * smoothstep(0.1, 1.0, d.y);            // a faint cool ceiling
  // soft boxes: a rectangle in the direction uLc[i], seen through a pinhole (WebGL 1 can only index arrays by the loop)
  for (int i = 0; i < 6; i++) {
    float k = dot(d, uLc[i]);
    if (k > 0.0) {
      vec2 q = abs(vec2(dot(d, uLu[i]), dot(d, uLv[i])) / k);
      vec4 s = uLs[i];
      float soft = s.z + rough;
      vec2 e = 1.0 - smoothstep(s.xy - soft, s.xy + soft, q);
      col += uLk[i] * (e.x * e.y * s.w);
    }
  }
  return col;
}

/* ---------- the setting (ray marched) ---------- */
float roundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
float capsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}
float band(vec3 p) {
  float q = length(p.xy) - RB;
  float th = abs(atan(p.x, p.y));                  // 0 at the top
  float k = 1.0 - smoothstep(0.1, 0.95, th);       // the band parts round the stone
  float oz = k * 0.092;
  float w = mix(0.112, 0.054, k);
  float d1 = roundBox(vec2(q, p.z - oz), vec2(0.056, w), 0.045);
  float d2 = roundBox(vec2(q, p.z + oz), vec2(0.056, w), 0.045);
  return min(d1, d2);
}
float head(vec3 p) {
  vec3 q = p - GEM;
  q.xz = abs(q.xz);                                 // four claws, one per quarter
  const vec3 A = vec3(0.075, -0.41, 0.075);         // low, between the rails
  const vec3 B = vec3(0.345, -0.012, 0.345);        // just outside the girdle
  const vec3 C = vec3(0.308, 0.06, 0.308);          // the tip, over the crown's edge
  float d = min(capsule(q, A, B, 0.038), capsule(q, B, C, 0.034));
  vec2 g = vec2(length(q.xz) - 0.29, q.y + 0.19);  // the gallery under the stone
  return min(d, length(g) - 0.023);
}
float metal(vec3 p) {
  float d = band(p);
  float h = length(p - GEM) - 0.66;
  if (h < 0.05) h = head(p);
  return min(d, h);
}
vec3 metalNormal(vec3 p) {
  const vec2 k = vec2(1.0, -1.0);
  const float e = 0.0008;
  return normalize(k.xyy * metal(p + k.xyy * e) + k.yyx * metal(p + k.yyx * e) + k.yxy * metal(p + k.yxy * e) + k.xxx * metal(p + k.xxx * e));
}

/* ---------- the stone (traced exactly: the intersection of its facet planes and the girdle) ---------- */
void slab(vec3 n, float h, vec3 ro, vec3 rd, inout float tin, inout float tout, inout vec3 nin, inout vec3 nout) {
  float dn = dot(rd, n);
  float d = h - dot(ro, n);
  if (abs(dn) < 1e-7) {
    if (d < 0.0) tin = 1e9;
    return;
  }
  float t = d / dn;
  if (dn < 0.0) {
    if (t > tin) { tin = t; nin = n; }
  } else if (t < tout) { tout = t; nout = n; }
}
void stone(vec3 ro, vec3 rd, out float tin, out float tout, out vec3 nin, out vec3 nout) {
  tin = -1e9; tout = 1e9;
  nin = vec3(0.0, 1.0, 0.0); nout = nin;
  slab(vec3(0.0, 1.0, 0.0), uTable, ro, rd, tin, tout, nin, nout);
  vec2 cs = vec2(1.0, 0.0);
  for (int k = 0; k < 8; k++) {
    for (int j = 0; j < 7; j++) {
      vec4 f = uFacet[j];
      slab(vec3(cs.x * f.x - cs.y * f.z, f.y, cs.y * f.x + cs.x * f.z), f.w, ro, rd, tin, tout, nin, nout);
    }
    cs = vec2(cs.x * C45 - cs.y * C45, cs.y * C45 + cs.x * C45);
  }
  float a = dot(rd.xz, rd.xz), b = dot(ro.xz, rd.xz), c = dot(ro.xz, ro.xz) - 1.0;
  if (a > 1e-8) {
    float disc = b * b - a * c;
    if (disc < 0.0) { tin = 1e9; return; }
    float s = sqrt(disc);
    float t0 = (-b - s) / a, t1 = (-b + s) / a;
    if (t0 > tin) { tin = t0; vec3 p = ro + rd * t0; nin = vec3(p.x, 0.0, p.z); }
    if (t1 < tout) { tout = t1; vec3 p = ro + rd * t1; nout = vec3(p.x, 0.0, p.z); }
  } else if (c > 0.0) tin = 1e9;
}
float schlick(float c) {
  return 0.172 + 0.828 * pow(1.0 - clamp(c, 0.0, 1.0), 5.0);
}
vec3 shadeStone(vec3 ro, vec3 rd, float t, vec3 n) {
  vec3 p = ro + rd * t;
  float F = schlick(-dot(rd, n));
  vec3 col = F * env(uRot * reflect(rd, n), 0.0);
  vec3 d = refract(rd, n, 1.0 / IOR);
  float thr = 1.0 - F;
  vec3 q = p - n * 1e-4;
  for (int i = 0; i < 6; i++) {
    float tin, tout;
    vec3 nin, nout;
    stone(q, d, tin, tout, nin, nout);
    q += d * tout;
    vec3 m = normalize(nout);
    vec3 o = refract(d, -m, IOR);
    if (dot(o, o) > 0.0) {
      float Fi = schlick(dot(o, m));
      // each colour leaves at its own angle: the fire
      vec3 oR = refract(d, -m, IOR - 0.026);
      vec3 oB = refract(d, -m, IOR + 0.042);
      vec3 e = vec3(env(uRot * oR, 0.0).r, env(uRot * o, 0.0).g, dot(oB, oB) > 0.0 ? env(uRot * oB, 0.0).b : 0.0);
      col += thr * (1.0 - Fi) * e;
      thr *= Fi;
    }
    d = reflect(d, m);
    q -= m * 1e-4;
  }
  return col + thr * env(uRot * d, 0.3) * 0.6;
}

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec3 fw = normalize(TARGET - EYE);
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, fw);
  vec3 rdw = normalize(fw * FOCAL + uv.x * rt + uv.y * up);
  // into the ring's own space: v * M is the transpose of M times v
  vec3 ro = (EYE - PIVOT) * uRot + PIVOT;
  vec3 rd = rdw * uRot;

  vec4 outc = vec4(0.0);
  // the contact shadow on an unseen floor
  if (rdw.y < 0.0) {
    float tf = (FLOOR - EYE.y) / rdw.y;
    vec2 f = (EYE + rdw * tf).xz;
    vec2 ax = normalize((uRot * vec3(1.0, 0.0, 0.0)).xz + vec2(1e-4, 0.0));
    float u = dot(f, ax), v = dot(f, vec2(-ax.y, ax.x));
    float a = 0.42 * exp(-v * v / 0.03 - u * u * u * u / 0.9) + 0.16 * exp(-(u * u + v * v) / 0.9);
    outc = vec4(0.0, 0.0, 0.0, a);
  }

  // the bounding sphere of the whole ring
  vec3 oc = ro - vec3(0.0, 0.25, 0.0);
  float b = dot(oc, rd), c = dot(oc, oc) - 1.52 * 1.52;
  float disc = b * b - c;
  if (disc > 0.0) {
    float s = sqrt(disc);
    float t = max(-b - s, 0.0), tEnd = -b + s;
    // the stone
    float tin, tout;
    vec3 nin, nout;
    vec3 go = (ro - GEM) / GR;
    stone(go, rd, tin, tout, nin, nout);
    float tg = (tin < tout && tin > 0.0) ? tin * GR : 1e9;
    // the metal
    float tm = 1e9;
    float tt = t;
    for (int i = 0; i < 96; i++) {
      if (tt > min(tEnd, tg)) break;
      float d = metal(ro + rd * tt);
      if (d < 0.0006 * tt) { tm = tt; break; }
      tt += d * 0.85;
    }
    vec3 col;
    bool hit = true;
    if (tm < tg) {
      vec3 p = ro + rd * tm;
      vec3 n = metalNormal(p);
      float ndv = clamp(dot(n, -rd), 0.0, 1.0);
      vec3 F = uMetal + (1.0 - uMetal) * pow(1.0 - ndv, 5.0);
      float ao = clamp(0.35 + 0.65 * (metal(p + n * 0.05) / 0.05), 0.0, 1.0);
      col = F * env(uRot * reflect(rd, n), 0.05) * mix(0.55, 1.0, ao);
    } else if (tg < 1e8) {
      col = shadeStone(go, rd, tin, normalize(nin));
    } else hit = false;
    if (hit) outc = vec4(aces(col * 1.05), 1.0);
  }
  // to display gamma (alpha is premultiplied: the shadow is black)
  gl_FragColor = vec4(pow(outc.rgb, vec3(1.0 / 2.2)), outc.a);
}
`

export interface Solitaire {
  setMetal: (m: Metal) => void
  /** Turn by an angle (radians), e.g. from the keyboard. */
  turn: (by: number) => void
  /** The current turn, 0–360°. */
  angle: () => number
  destroy: () => void
}

export async function createSolitaire(
  canvas: HTMLCanvasElement,
  {
    metal = 'rose',
    still = false,
    yaw: startYaw = 0.55,
    spin: rest = 0.36,
    tones,
    onTurn,
  }: {
    metal?: Metal
    still?: boolean
    yaw?: number
    /** The resting turn, radians a second. */
    spin?: number
    /** Golds the metal drifts through as the ring turns (reflectance, linear RGB), one after another round each turn. */
    tones?: [number, number, number][]
    onTurn?: (deg: number) => void
  } = {},
): Promise<Solitaire | null> {
  const stage = await createStage(canvas, FRAGMENT, { alpha: true })
  if (!stage) return null
  const { gl, u } = stage
  const f = facets()
  gl.uniform4fv(u('uFacet'), new Float32Array(f.list))
  gl.uniform1f(u('uTable'), f.table)
  const L = lightUniforms()
  gl.uniform3fv(u('uLc'), new Float32Array(L.c))
  gl.uniform3fv(u('uLu'), new Float32Array(L.u))
  gl.uniform3fv(u('uLv'), new Float32Array(L.v))
  gl.uniform4fv(u('uLs'), new Float32Array(L.s))
  gl.uniform3fv(u('uLk'), new Float32Array(L.k))
  gl.clearColor(0, 0, 0, 0)

  // state: turn (yaw), its speed, the hover tilt, the metal (eased between choices)
  let yaw = startYaw
  let spin = 0
  let pending = 0 // a turn asked for by the buttons, eased in
  let tiltX = 0, tiltY = 0, aimX = 0, aimY = 0
  let dragging = false
  let lastX = 0
  const col = [...(tones?.[0] ?? METAL_F0[metal])]
  let goal = [...col]
  const target = Math.min(2, Math.max(1.25, devicePixelRatio || 1))
  let scale = target
  let slow = 0
  let fast = 0
  let dirty = true

  const rotation = () => {
    const cy = Math.cos(yaw), sy = Math.sin(yaw)
    const p = 0.1 + tiltY * 0.16
    const cp = Math.cos(p), sp = Math.sin(p)
    const r = tiltX * 0.3
    const cr = Math.cos(r), sr = Math.sin(r)
    // object → world: tilt about x, then a little turn from the pointer, after the ring's own yaw
    const Ry = [cy, 0, -sy, 0, 1, 0, sy, 0, cy]
    const Rr = [cr, 0, -sr, 0, 1, 0, sr, 0, cr]
    const Rx = [1, 0, 0, 0, cp, sp, 0, -sp, cp]
    const mul = (a: number[], b: number[]) => {
      const o = new Array(9).fill(0)
      for (let c = 0; c < 3; c++) for (let rr = 0; rr < 3; rr++) for (let k = 0; k < 3; k++) o[c * 3 + rr] += a[k * 3 + rr] * b[c * 3 + k]
      return o
    }
    return new Float32Array(mul(Rx, mul(Rr, Ry)))
  }

  const loop = frameLoop(canvas, (_now, dt) => {
    const s = dt / 1000
    const step = pending * Math.min(1, s * 7)
    yaw += step
    pending -= step
    if (!dragging) {
      yaw += spin * s
      spin *= Math.pow(0.04, s) // inertia after a drag
      if (!still && Math.abs(spin) < rest) spin += (rest - spin) * Math.min(1, s * 0.8)
    }
    tiltX += (aimX - tiltX) * Math.min(1, s * 5)
    tiltY += (aimY - tiltY) * Math.min(1, s * 5)
    if (tones?.length) {
      // the gold follows the turn: between neighbouring tones, eased, so it changes as the light would
      const x = ((((yaw / (Math.PI * 2)) * tones.length) % tones.length) + tones.length) % tones.length
      const a = tones[Math.floor(x)]
      const b = tones[(Math.floor(x) + 1) % tones.length]
      const f = x - Math.floor(x)
      const k = f * f * (3 - 2 * f)
      goal = [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * k)
    }
    for (let i = 0; i < 3; i++) col[i] += (goal[i] - col[i]) * Math.min(1, s * 6)
    // resolution follows the device: drop when frames run long, recover slowly
    if (dt > 26) slow++
    else slow = Math.max(0, slow - 0.25)
    if (dt < 18) fast++
    else fast = 0
    if (slow > 12 && scale > 0.6) {
      scale *= 0.82
      slow = 0
      dirty = true
    } else if (fast > 240 && scale < target) {
      scale = Math.min(target, scale * 1.1)
      fast = 0
      dirty = true
    }
    if (stage.resize(scale)) dirty = true
    gl.uniform2f(u('uRes'), canvas.width, canvas.height)
    gl.uniformMatrix3fv(u('uRot'), false, rotation())
    gl.uniform3fv(u('uMetal'), col)
    gl.clear(gl.COLOR_BUFFER_BIT)
    stage.draw()
    onTurn?.(((((yaw * 180) / Math.PI) % 360) + 360) % 360)
    const moving = dragging || Math.abs(pending) > 0.001 || Math.abs(spin) > 0.002 || Math.abs(aimX - tiltX) > 0.002 || Math.abs(aimY - tiltY) > 0.002 || Math.abs(goal[0] - col[0]) + Math.abs(goal[2] - col[2]) > 0.002
    const keep = !still || moving || dirty
    dirty = false
    return keep
  })

  // pointer: drag to turn (horizontal drags only on touch, so the page still scrolls), hover to tilt
  const down = (e: PointerEvent) => {
    dragging = true
    lastX = e.clientX
    spin = 0
    canvas.setPointerCapture(e.pointerId)
    loop.wake()
  }
  const move = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect()
    if (e.pointerType === 'mouse') {
      aimX = ((e.clientX - r.left) / r.width) * 2 - 1
      aimY = ((e.clientY - r.top) / r.height) * 2 - 1
    }
    if (dragging) {
      const dx = e.clientX - lastX
      lastX = e.clientX
      yaw += (dx / r.width) * Math.PI * 1.6
      spin = (dx / r.width) * Math.PI * 1.6 * 60
    }
    loop.wake()
  }
  const up = () => {
    dragging = false
    loop.wake()
  }
  const leave = () => {
    aimX = 0
    aimY = 0
    loop.wake()
  }
  canvas.addEventListener('pointerdown', down)
  canvas.addEventListener('pointermove', move)
  canvas.addEventListener('pointerup', up)
  canvas.addEventListener('pointercancel', up)
  canvas.addEventListener('pointerleave', leave)
  const lost = (e: Event) => {
    e.preventDefault()
    loop.stop()
  }
  canvas.addEventListener('webglcontextlost', lost)
  const resize = new ResizeObserver(() => {
    dirty = true
    loop.wake()
  })
  resize.observe(canvas)

  return {
    setMetal(m) {
      goal = [...METAL_F0[m]]
      loop.wake()
    },
    turn(by) {
      pending += by
      loop.wake()
    },
    angle: () => ((((yaw * 180) / Math.PI) % 360) + 360) % 360,
    destroy() {
      loop.stop()
      resize.disconnect()
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
      canvas.removeEventListener('pointerleave', leave)
      canvas.removeEventListener('webglcontextlost', lost)
      stage.destroy()
    },
  }
}

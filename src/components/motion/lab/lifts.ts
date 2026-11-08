import { createStage, frameLoop } from './gl'

/**
 * Tensile's technique demonstrations: a plain mannequin performing a back
 * squat, a bench press or a deadlift, drawn by one ray-marched shader (no
 * library, no model files).
 *
 * The movement is computed, not keyframed by eye. The joints are placed from
 * the segment lengths of a 1.78 m adult and the rules a coach checks:
 *   squat     the bar stays over the middle of the foot (the torso lean is
 *             solved for it), knees track forward over the toes, the hip
 *             crease ends below the knee;
 *   bench     shoulders and hips stay on the bench, feet on the floor; the
 *             bar travels from over the shoulders to the lower chest, the
 *             forearms near vertical underneath it;
 *   deadlift  the bar rises in a straight line over the middle of the foot,
 *             arms hang straight from the shoulders, shins move back to
 *             vertical as the bar passes the knees, the hips extend last.
 * Knees and elbows are placed by two-bone inverse kinematics. The figure
 * faces +x; z is left and right, so each lift is symmetric.
 */

export type Lift = 'squat' | 'bench' | 'deadlift'

export interface Lifts {
  setLift: (lift: Lift) => void
  /** Hold the lift at one point of its range (0 top, 1 bottom), or null to play it. */
  hold: (at: number | null) => void
  play: (on: boolean) => void
  destroy: () => void
}

type V = [number, number, number]
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const mul = (a: V, s: number): V => [a[0] * s, a[1] * s, a[2] * s]
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const len = (a: V) => Math.hypot(a[0], a[1], a[2])
const norm = (a: V): V => mul(a, 1 / (len(a) || 1))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const rad = (d: number) => (d * Math.PI) / 180
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// segment lengths, metres
const SHIN = 0.44
const THIGH = 0.43
const TORSO = 0.5 // hip joint to shoulder joint
const UPPER = 0.3
const FORE = 0.34 // elbow to the middle of the grip
const ANKLE_Y = 0.08
const HIP_Z = 0.095
const SHOULDER_Z = 0.19

/** The middle joint of a two-bone chain from `a` to `t`, bent towards `pole`. */
function ik(a: V, t: V, l1: number, l2: number, pole: V): V {
  const d = sub(t, a)
  const dir = norm(d)
  const dist = Math.min(Math.max(len(d), Math.abs(l1 - l2) + 1e-4), l1 + l2 - 1e-4)
  const cos = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist)
  const sin = Math.sqrt(Math.max(0, 1 - cos * cos))
  const perp = norm(sub(pole, mul(dir, dot(pole, dir))))
  return add(a, add(mul(dir, l1 * cos), mul(perp, l1 * sin)))
}

interface Pose {
  /** 20 joints, see the shader's body() for the order. */
  j: V[]
  bar: [number, number]
}

/** Feet flat: heel and toe from the ankle, the toe pointing along `fwd` (±1 on x). */
const foot = (ankle: V, fwd: number): [V, V] => [
  [ankle[0] + 0.17 * fwd, 0.04, ankle[2] + Math.sign(ankle[2]) * 0.02],
  [ankle[0] - 0.05 * fwd, 0.045, ankle[2]],
]

/** Torso, neck, head and arms from the hips, the shoulders and the hands. */
function upper(j: V[], hipC: V, shoulderC: V, hands: [V, V], elbowPole: (side: number) => V, headUp: number) {
  const d = norm(sub(shoulderC, hipC))
  j[10] = add(hipC, mul(d, 0.07))
  j[11] = sub(shoulderC, mul(d, 0.16))
  const neck = add(shoulderC, mul(d, 0.085))
  j[18] = neck
  j[19] = add(neck, mul(norm(add(mul(d, 1 - headUp), [0.12 * headUp, headUp, 0])), 0.13))
  for (const [i, side] of [
    [12, 1],
    [15, -1],
  ] as const) {
    const s: V = [shoulderC[0], shoulderC[1], side * SHOULDER_Z]
    const hand = hands[side === 1 ? 0 : 1]
    j[i] = s
    j[i + 1] = ik(s, hand, UPPER, FORE, elbowPole(side))
    j[i + 2] = hand
  }
}

function squat(u: number): Pose {
  const j: V[] = new Array(20)
  const s = rad(lerp(3, 27, u)) // shin forward
  const h = rad(lerp(2, 102, u)) // thigh, from upright to just below parallel
  const kx = SHIN * Math.sin(s)
  const ky = ANKLE_Y + SHIN * Math.cos(s)
  const hip: V = [kx - THIGH * Math.sin(h), ky + THIGH * Math.cos(h), 0]
  for (const [i, side] of [
    [0, 1],
    [3, -1],
  ] as const) {
    const ankle: V = [0, ANKLE_Y, side * 0.16]
    j[i] = ankle
    j[i + 1] = [kx, ky, side * (0.16 + 0.04 * u)] // knees out over the toes
    j[i + 2] = [hip[0], hip[1], side * HIP_Z]
    const [toe, heel] = foot(ankle, 1)
    j[i === 0 ? 6 : 8] = toe
    j[i === 0 ? 7 : 9] = heel
  }
  // the bar sits on the upper back, behind and a little below the shoulder joints;
  // lean the torso so that it stays over the middle of the foot
  const mid = 0.06
  const back = 0.065
  const down = 0.04
  const A = TORSO - down
  const R = Math.hypot(A, back)
  const c = Math.atan2(back, A) + Math.asin(Math.min(1, Math.max(-1, (mid - hip[0]) / R)))
  const d: V = [Math.sin(c), Math.cos(c), 0]
  const nb: V = [-Math.cos(c), Math.sin(c), 0]
  const shoulderC = add(hip, mul(d, TORSO))
  const bar = add(add(shoulderC, mul(nb, back)), mul(d, -down))
  const hands: [V, V] = [
    [bar[0], bar[1], 0.42],
    [bar[0], bar[1], -0.42],
  ]
  upper(j, hip, shoulderC, hands, (side) => norm(add(add(mul(d, -1), mul(nb, 0.7)), [0, 0, side * 0.35])), 0.45)
  return { j, bar: [bar[0], bar[1]] }
}

function bench(u: number): Pose {
  const j: V[] = new Array(20)
  const hipC: V = [-0.2, 0.53, 0]
  const shoulderC: V = [0.3, 0.55, 0]
  for (const [i, side] of [
    [0, 1],
    [3, -1],
  ] as const) {
    const ankle: V = [-0.66, ANKLE_Y, side * 0.24]
    const hip: V = [hipC[0], hipC[1], side * HIP_Z]
    j[i] = ankle
    j[i + 1] = ik(hip, ankle, THIGH, SHIN, norm([-0.3, 1, side * 0.25]))
    j[i + 2] = hip
    const [toe, heel] = foot(ankle, -1)
    j[i === 0 ? 6 : 8] = toe
    j[i === 0 ? 7 : 9] = heel
  }
  // from over the shoulders (arms straight) to the lower chest: a slight curve, not a straight line
  const bar: V = [lerp(0.31, 0.22, u), lerp(1.14, 0.745, u), 0]
  const hands: [V, V] = [
    [bar[0], bar[1], 0.4],
    [bar[0], bar[1], -0.4],
  ]
  upper(j, hipC, shoulderC, hands, (side) => norm([-0.35, -1, side * 0.8]), 0.12)
  j[11] = add(j[11], [0, 0.02, 0]) // a small arch through the upper back
  return { j, bar: [bar[0], bar[1]] }
}

function deadlift(depth: number): Pose {
  const u = 1 - depth // 0 bar on the floor, 1 standing tall
  const j: V[] = new Array(20)
  const barX = 0.07
  const barY = lerp(0.225, 0.8, u)
  const s = rad(11 * (1 - smooth(0, 0.6, u))) // shins come back to vertical as the bar passes the knees
  const knee: V = [SHIN * Math.sin(s), ANKLE_Y + SHIN * Math.cos(s), 0]
  // arms hang straight: shoulders a little ahead of the bar at the floor, over it at the top
  const arm = UPPER + FORE - 0.005
  const dx = lerp(0.07, -0.02, smooth(0, 1, u))
  const shoulderC: V = [barX + dx, barY + Math.sqrt(arm * arm - dx * dx), 0]
  const hip = ik(knee, shoulderC, THIGH, TORSO, [-1, 0.2, 0])
  for (const [i, side] of [
    [0, 1],
    [3, -1],
  ] as const) {
    const ankle: V = [0, ANKLE_Y, side * 0.13]
    j[i] = ankle
    j[i + 1] = [knee[0], knee[1], side * 0.14]
    j[i + 2] = [hip[0], hip[1], side * HIP_Z]
    const [toe, heel] = foot(ankle, 1)
    j[i === 0 ? 6 : 8] = toe
    j[i === 0 ? 7 : 9] = heel
  }
  const hands: [V, V] = [
    [barX, barY, 0.25],
    [barX, barY, -0.25],
  ]
  upper(j, hip, shoulderC, hands, (side) => norm([-1, 0, side * 0.3]), 0.3)
  return { j, bar: [barX, barY] }
}

const POSE: Record<Lift, (depth: number) => Pose> = { squat, bench, deadlift }

/** One repetition: [seconds, depth from, depth to], eased. */
const CYCLE: Record<Lift, [number, number, number][]> = {
  squat: [
    [1.7, 0, 1],
    [0.35, 1, 1],
    [1.2, 1, 0],
    [0.9, 0, 0],
  ],
  bench: [
    [1.6, 0, 1],
    [0.4, 1, 1],
    [1.1, 1, 0],
    [0.9, 0, 0],
  ],
  deadlift: [
    [1.3, 1, 0],
    [0.6, 0, 0],
    [1.5, 0, 1],
    [0.8, 1, 1],
  ],
}

function depthAt(lift: Lift, t: number) {
  const steps = CYCLE[lift]
  const total = steps.reduce((n, s) => n + s[0], 0)
  let x = t % total
  for (const [d, a, b] of steps) {
    if (x <= d) {
      const k = x / d
      return lerp(a, b, 0.5 - 0.5 * Math.cos(Math.PI * k))
    }
    x -= d
  }
  return steps[0][1]
}

/** Where each lift is best seen: yaw from the figure's left side towards its front, pitch, distance, target. */
const VIEW: Record<Lift, { yaw: number; pitch: number; dist: number; target: V }> = {
  squat: { yaw: 0.6, pitch: 0.14, dist: 3.05, target: [0, 0.88, 0] },
  bench: { yaw: 0.7, pitch: 0.46, dist: 2.85, target: [-0.04, 0.64, 0] },
  deadlift: { yaw: 0.55, pitch: 0.12, dist: 2.95, target: [0, 0.78, 0] },
}

const FRAGMENT = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform vec3 uEye;
uniform vec3 uTgt;
uniform vec3 uJ[20];
uniform vec2 uBar;
uniform float uBench;

float sdCap(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}
// a capsule whose radius changes from r1 at a to r2 at b (after Inigo Quilez)
float sdCone(vec3 p, vec3 a, vec3 b, float r1, float r2) {
  vec3 ba = b - a;
  float l2 = dot(ba, ba);
  float rr = r1 - r2;
  float a2 = l2 - rr * rr;
  float il2 = 1.0 / l2;
  vec3 pa = p - a;
  float y = dot(pa, ba);
  float z = y - l2;
  vec3 xv = pa * l2 - ba * y;
  float x2 = dot(xv, xv);
  float y2 = y * y * l2;
  float z2 = z * z * l2;
  float k = sign(rr) * rr * rr * x2;
  if (sign(z) * a2 * z2 > k) return sqrt(x2 + z2) * il2 - r2;
  if (sign(y) * a2 * y2 < k) return sqrt(x2 + y2) * il2 - r1;
  return (sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
// a cylinder along z, centred on c in xy
float sdCylZ(vec3 p, vec2 c, float z0, float z1, float r) {
  vec2 d = vec2(length(p.xy - c) - r, abs(p.z - 0.5 * (z0 + z1)) - 0.5 * (z1 - z0));
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}
float sdBox(vec3 p, vec3 c, vec3 b, float r) {
  vec3 q = abs(p - c) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}

// joints: 0-2 ankle, knee, hip (left) · 3-5 the same (right) · 6/7 toe, heel (left) · 8/9 (right)
// 10 pelvis · 11 chest · 12-14 shoulder, elbow, hand (left) · 15-17 (right) · 18 neck · 19 head
float body(vec3 p) {
  float k = 0.035;
  float d = sdCone(p, uJ[0], uJ[1], 0.045, 0.056);
  d = smin(d, sdCone(p, uJ[1], uJ[2], 0.06, 0.088), k);
  d = smin(d, sdCap(p, uJ[7], uJ[6], 0.038), k);
  d = smin(d, sdCone(p, uJ[3], uJ[4], 0.045, 0.056), k);
  d = smin(d, sdCone(p, uJ[4], uJ[5], 0.06, 0.088), k);
  d = smin(d, sdCap(p, uJ[9], uJ[8], 0.038), k);
  d = smin(d, sdCap(p, uJ[2], uJ[5], 0.1), k);
  d = smin(d, sdCone(p, uJ[10], uJ[11], 0.112, 0.12), k);
  vec3 side = vec3(0.0, 0.0, 0.075);
  d = smin(d, sdCap(p, uJ[11] - side, uJ[11] + side, 0.122), k);
  d = smin(d, sdCap(p, uJ[12], uJ[15], 0.058), k);
  d = smin(d, sdCap(p, 0.5 * (uJ[12] + uJ[15]), uJ[18], 0.05), k);
  d = smin(d, length(p - uJ[19]) - 0.1, 0.02);
  d = smin(d, sdCone(p, uJ[12], uJ[13], 0.052, 0.043), k);
  d = smin(d, sdCone(p, uJ[13], uJ[14], 0.041, 0.032), k);
  d = smin(d, length(p - uJ[14]) - 0.042, 0.02);
  d = smin(d, sdCone(p, uJ[15], uJ[16], 0.052, 0.043), k);
  d = smin(d, sdCone(p, uJ[16], uJ[17], 0.041, 0.032), k);
  d = smin(d, length(p - uJ[17]) - 0.042, 0.02);
  return d;
}

// distance and material: 1 figure, 2 steel, 3 plates, 4 bench
vec2 map(vec3 p) {
  vec2 r = vec2(body(p), 1.0);
  vec3 q = vec3(p.xy, abs(p.z));
  float steel = min(sdCap(q, vec3(uBar, 0.0), vec3(uBar, 0.79), 0.0145), sdCylZ(q, uBar, 0.76, 1.0, 0.026));
  if (steel < r.x) r = vec2(steel, 2.0);
  float plate = sdCylZ(q, uBar, 0.8, 0.865, 0.221) - 0.004;
  if (plate < r.x) r = vec2(plate, 3.0);
  if (uBench > 0.5) {
    float b = sdBox(p, vec3(-0.05, 0.395, 0.0), vec3(0.62, 0.045, 0.145), 0.03);
    b = min(b, sdBox(p, vec3(-0.55, 0.18, 0.0), vec3(0.03, 0.18, 0.12), 0.01));
    b = min(b, sdBox(p, vec3(0.45, 0.18, 0.0), vec3(0.03, 0.18, 0.12), 0.01));
    if (b < r.x) r = vec2(b, 4.0);
  }
  return r;
}

vec3 normalAt(vec3 p) {
  vec2 e = vec2(0.0015, -0.0015);
  return normalize(e.xyy * map(p + e.xyy).x + e.yyx * map(p + e.yyx).x + e.yxy * map(p + e.yxy).x + e.xxx * map(p + e.xxx).x);
}
float shadow(vec3 ro, vec3 rd) {
  float res = 1.0;
  float t = 0.02;
  for (int i = 0; i < 28; i++) {
    float h = map(ro + rd * t).x;
    res = min(res, 9.0 * h / t);
    t += clamp(h, 0.02, 0.2);
    if (res < 0.02 || t > 2.5) break;
  }
  return clamp(res, 0.0, 1.0);
}
float occlusion(vec3 p, vec3 n) {
  float o = 0.0;
  float s = 1.0;
  for (int i = 1; i <= 4; i++) {
    float h = 0.03 * float(i);
    o += (h - map(p + n * h).x) * s;
    s *= 0.6;
  }
  return clamp(1.0 - 2.5 * o, 0.0, 1.0);
}

void main() {
  vec2 uv = (2.0 * gl_FragCoord.xy - uRes) / uRes.y;
  vec3 ww = normalize(uTgt - uEye);
  vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
  vec3 vv = cross(uu, ww);
  vec3 rd = normalize(uv.x * uu + uv.y * vv + 2.4 * ww);
  vec3 ro = uEye;
  vec3 L = normalize(vec3(0.45, 0.85, 0.6));

  // march only inside the sphere that holds the figure, the bar and the bench
  vec3 c0 = vec3(0.0, 0.8, 0.0);
  vec3 oc = ro - c0;
  float b = dot(oc, rd);
  float h = b * b - dot(oc, oc) + 1.35 * 1.35;
  float tHit = -1.0;
  float mat = 0.0;
  if (h > 0.0) {
    h = sqrt(h);
    float t = max(-b - h, 0.0);
    float tMax = -b + h;
    for (int i = 0; i < 110; i++) {
      vec2 m = map(ro + rd * t);
      if (m.x < 0.0012 * t) {
        tHit = t;
        mat = m.y;
        break;
      }
      t += m.x;
      if (t > tMax) break;
    }
  }
  float tFloor = rd.y < 0.0 ? -ro.y / rd.y : -1.0;

  vec3 col = vec3(0.0);
  float alpha = 0.0;
  if (tHit > 0.0 && (tFloor < 0.0 || tHit < tFloor)) {
    vec3 p = ro + rd * tHit;
    {
      vec3 n = normalAt(p);
      vec3 alb = vec3(0.74, 0.71, 0.66);
      float spec = 0.12;
      float gloss = 24.0;
      if (mat > 1.5 && mat < 2.5) { alb = vec3(0.5, 0.52, 0.55); spec = 0.9; gloss = 70.0; }
      else if (mat > 2.5 && mat < 3.5) {
        // black rubber bumper plates; the club's orange on the hub
        float rr = length(p.xy - uBar);
        alb = rr < 0.075 ? vec3(0.86, 0.27, 0.08) : vec3(0.045, 0.047, 0.05);
        spec = 0.35;
        gloss = 40.0;
      }
      else if (mat > 3.5) { alb = vec3(0.075, 0.08, 0.085); spec = 0.2; }
      float ao = occlusion(p, n);
      float dif = clamp(dot(n, L), 0.0, 1.0) * shadow(p + n * 0.004, L);
      float fill = clamp(dot(n, normalize(vec3(-0.7, 0.35, -0.4))) * 0.5 + 0.5, 0.0, 1.0);
      float sky = 0.5 + 0.5 * n.y;
      float rim = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 3.0);
      vec3 hv = normalize(L - rd);
      float sp = pow(clamp(dot(n, hv), 0.0, 1.0), gloss) * spec * dif;
      vec3 lin = dif * vec3(1.3, 1.22, 1.1) + fill * vec3(0.15, 0.17, 0.21) * ao + sky * vec3(0.13, 0.13, 0.14) * ao + rim * vec3(0.22) * ao;
      col = alb * lin + sp;
      alpha = 1.0;
    }
  } else if (tFloor > 0.0) {
    // a pool of floor under the lift, fading into the page
    vec3 p = ro + rd * tFloor;
    float fade = smoothstep(2.1, 0.4, length(p.xz - vec2(0.0, 0.0)));
    if (fade > 0.01) {
      float sh = shadow(p + vec3(0.0, 0.002, 0.0), L);
      col = vec3(0.115, 0.12, 0.125) * (0.3 + 0.7 * sh);
      alpha = fade * 0.95;
    }
  }
  col = col / (1.0 + col * 0.55);
  col = pow(col, vec3(1.0 / 2.2));
  gl_FragColor = vec4(col * alpha, alpha);
}
`

export async function createLifts(canvas: HTMLCanvasElement, { lift: first = 'squat', still = false, onDepth }: { lift?: Lift; still?: boolean; onDepth?: (depth: number) => void } = {}): Promise<Lifts | null> {
  const stage = await createStage(canvas, FRAGMENT, { alpha: true })
  if (!stage) return null
  const { gl, u } = stage
  gl.clearColor(0, 0, 0, 0)

  let lift: Lift = first
  let t = 0
  let playing = !still
  let held: number | null = still ? 1 : null
  let yaw = VIEW[lift].yaw
  let aimYaw = yaw
  let pitch = VIEW[lift].pitch
  let dist = VIEW[lift].dist
  let target: V = [...VIEW[lift].target]
  let dragging = false
  let lastX = 0
  const top = Math.min(2, Math.max(1, devicePixelRatio || 1))
  let scale = top
  let slow = 0
  let fast = 0
  let dirty = true
  const joints = new Float32Array(60)

  const loop = frameLoop(canvas, (_now, dt) => {
    const s = dt / 1000
    if (playing && held === null) t += s
    const depth = held ?? depthAt(lift, t)
    const pose = POSE[lift](depth)
    pose.j.forEach((v, i) => joints.set(v, i * 3))
    // the camera eases to each lift's own view; a drag turns it
    const view = VIEW[lift]
    const k = Math.min(1, s * 4)
    if (!dragging) yaw += (aimYaw - yaw) * k
    pitch += (view.pitch - pitch) * k
    dist += (view.dist - dist) * k
    target = target.map((x, i) => x + (view.target[i] - x) * k) as V
    const cp = Math.cos(pitch)
    const eye = add(target, mul([Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp], dist))
    // resolution follows the device: drop when frames run long, recover slowly
    if (dt > 26) slow++
    else slow = Math.max(0, slow - 0.25)
    if (dt < 18) fast++
    else fast = 0
    if (slow > 12 && scale > 0.5) {
      scale *= 0.82
      slow = 0
    } else if (fast > 240 && scale < top) {
      scale = Math.min(top, scale * 1.1)
      fast = 0
    }
    stage.resize(scale)
    gl.uniform2f(u('uRes'), canvas.width, canvas.height)
    gl.uniform3fv(u('uEye'), eye)
    gl.uniform3fv(u('uTgt'), target)
    gl.uniform3fv(u('uJ'), joints)
    gl.uniform2f(u('uBar'), pose.bar[0], pose.bar[1])
    gl.uniform1f(u('uBench'), lift === 'bench' ? 1 : 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    stage.draw()
    onDepth?.(depth)
    const settling = Math.abs(aimYaw - yaw) > 0.001 || Math.abs(view.pitch - pitch) > 0.001 || Math.abs(view.dist - dist) > 0.002
    const keep = (playing && held === null) || dragging || settling || dirty
    dirty = false
    return keep
  })

  // drag to walk round the lift (horizontal drags only on touch, so the page still scrolls)
  const down = (e: PointerEvent) => {
    dragging = true
    lastX = e.clientX
    canvas.setPointerCapture(e.pointerId)
    loop.wake()
  }
  const move = (e: PointerEvent) => {
    if (!dragging) return
    const dx = e.clientX - lastX
    lastX = e.clientX
    yaw += (dx / canvas.getBoundingClientRect().width) * Math.PI * 1.4
    aimYaw = yaw
    loop.wake()
  }
  const up = () => {
    dragging = false
    loop.wake()
  }
  canvas.addEventListener('pointerdown', down)
  canvas.addEventListener('pointermove', move)
  canvas.addEventListener('pointerup', up)
  canvas.addEventListener('pointercancel', up)
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
    setLift(next) {
      if (next === lift) return
      lift = next
      t = 0
      aimYaw = VIEW[next].yaw
      dirty = true
      loop.wake()
    },
    hold(at) {
      held = at
      dirty = true
      loop.wake()
    },
    play(on) {
      playing = on
      if (on) held = null
      dirty = true
      loop.wake()
    },
    destroy() {
      loop.stop()
      resize.disconnect()
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', up)
      canvas.removeEventListener('webglcontextlost', lost)
      stage.destroy()
    },
  }
}

/**
 * A very small WebGL2 toolkit for the studio's two real-time pieces (the hero
 * screens and the kinetic type drum). No library: column-major 4x4 matrices,
 * shader compilation, a mesh builder and the shared "stage" — a dark,
 * reflective floor under one key light — so both pieces live in the same
 * physical world.
 */

export type Mat4 = Float32Array
export type Vec3 = [number, number, number]

export const mat4 = {
  identity(): Mat4 {
    const m = new Float32Array(16)
    m[0] = m[5] = m[10] = m[15] = 1
    return m
  },
  perspective(fovy: number, aspect: number, near: number, far: number): Mat4 {
    const f = 1 / Math.tan(fovy / 2)
    const m = new Float32Array(16)
    m[0] = f / aspect
    m[5] = f
    m[10] = (far + near) / (near - far)
    m[11] = -1
    m[14] = (2 * far * near) / (near - far)
    return m
  },
  lookAt(eye: Vec3, target: Vec3, up: Vec3 = [0, 1, 0]): Mat4 {
    const z = norm(sub(eye, target))
    const x = norm(cross(up, z))
    const y = cross(z, x)
    const m = new Float32Array(16)
    m.set([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1])
    return m
  },
  multiply(a: Mat4, b: Mat4): Mat4 {
    const o = new Float32Array(16)
    for (let c = 0; c < 4; c++)
      for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]
    return o
  },
  /** translate · rotateY · rotateX · scale, the only model transform the pieces need */
  model(t: Vec3, yaw = 0, pitch = 0, s: Vec3 = [1, 1, 1]): Mat4 {
    const cy = Math.cos(yaw)
    const sy = Math.sin(yaw)
    const cp = Math.cos(pitch)
    const sp = Math.sin(pitch)
    const m = new Float32Array(16)
    // R = Ry · Rx
    m.set([cy * s[0], 0, -sy * s[0], 0, sy * sp * s[1], cp * s[1], cy * sp * s[1], 0, sy * cp * s[2], -sp * s[2], cy * cp * s[2], 0, t[0], t[1], t[2], 1])
    return m
  },
}

export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
export const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1
  return [a[0] / l, a[1] / l, a[2] / l]
}

export const ease = {
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  inOutQuart: (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2),
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)),
}

/** Resolves on the next animation frame: lets the browser paint between pieces of set-up work. */
export const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

/**
 * Compiles several programs without blocking the main thread where the driver
 * allows it (KHR_parallel_shader_compile): the shaders compile in the
 * background and their status is checked once per frame.
 */
export async function programs(gl: WebGL2RenderingContext, sources: [string, string][]) {
  const ext = gl.getExtension('KHR_parallel_shader_compile')
  const made = sources.map(([v, f]) => program(gl, v, f, Boolean(ext)))
  if (ext) {
    while (!made.every((m) => gl.getProgramParameter(m.p, ext.COMPLETION_STATUS_KHR))) await nextFrame()
    made.forEach((m) => m.check())
  }
  return made
}

export function program(gl: WebGL2RenderingContext, vert: string, frag: string, deferCheck = false) {
  const make = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    return s
  }
  const p = gl.createProgram()!
  const vs = make(gl.VERTEX_SHADER, vert)
  const fs = make(gl.FRAGMENT_SHADER, frag)
  gl.attachShader(p, vs)
  gl.attachShader(p, fs)
  gl.linkProgram(p)
  // querying the status waits for the compiler, so it is done only when needed (or after parallel compilation)
  const check = () => {
    if (gl.getProgramParameter(p, gl.LINK_STATUS)) return
    throw new Error(gl.getShaderInfoLog(vs) || gl.getShaderInfoLog(fs) || gl.getProgramInfoLog(p) || 'link')
  }
  if (!deferCheck) check()
  const cache = new Map<string, WebGLUniformLocation | null>()
  const u = (name: string) => {
    if (!cache.has(name)) cache.set(name, gl.getUniformLocation(p, name))
    return cache.get(name)!
  }
  return { p, u, check }
}

export interface Mesh {
  vao: WebGLVertexArrayObject
  count: number
}

/** Interleaved position (3), normal (3), uv (2), plus a per-vertex "part" id (1): 9 floats. */
export function mesh(gl: WebGL2RenderingContext, data: number[]): Mesh {
  const vao = gl.createVertexArray()!
  gl.bindVertexArray(vao)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW)
  const stride = 9 * 4
  ;[3, 3, 2, 1].reduce((offset, size, i) => {
    gl.enableVertexAttribArray(i)
    gl.vertexAttribPointer(i, size, gl.FLOAT, false, stride, offset * 4)
    return offset + size
  }, 0)
  gl.bindVertexArray(null)
  return { vao, count: data.length / 9 }
}

/**
 * A rounded rectangle slab, centred on the origin, facing +z: width w,
 * height h, depth d, corner radius r. Parts: 0 front, 1 sides, 2 back.
 * The front face's uv runs 0 → 1 across the whole slab (top-left = 0,0).
 */
export function roundedSlab(w: number, h: number, d: number, r: number, seg = 10): number[] {
  const out: [number, number][] = []
  const corners: [number, number, number][] = [
    [w / 2 - r, h / 2 - r, 0],
    [-w / 2 + r, h / 2 - r, Math.PI / 2],
    [-w / 2 + r, -h / 2 + r, Math.PI],
    [w / 2 - r, -h / 2 + r, (3 * Math.PI) / 2],
  ]
  for (const [cx, cy, a0] of corners)
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (i / seg) * (Math.PI / 2)
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
    }
  const v: number[] = []
  const uv = (x: number, y: number): [number, number] => [x / w + 0.5, 0.5 - y / h]
  const push = (x: number, y: number, z: number, n: Vec3, part: number) => v.push(x, y, z, n[0], n[1], n[2], ...uv(x, y), part)
  const n = out.length
  for (let i = 0; i < n; i++) {
    const [x1, y1] = out[i]
    const [x2, y2] = out[(i + 1) % n]
    // front (+z) and back (-z) fans
    push(0, 0, d / 2, [0, 0, 1], 0)
    push(x1, y1, d / 2, [0, 0, 1], 0)
    push(x2, y2, d / 2, [0, 0, 1], 0)
    push(0, 0, -d / 2, [0, 0, -1], 2)
    push(x2, y2, -d / 2, [0, 0, -1], 2)
    push(x1, y1, -d / 2, [0, 0, -1], 2)
    // side strip
    const nx = (y2 - y1) / Math.hypot(x2 - x1, y2 - y1)
    const ny = -(x2 - x1) / Math.hypot(x2 - x1, y2 - y1)
    const nn: Vec3 = [nx, ny, 0]
    push(x1, y1, d / 2, nn, 1)
    push(x1, y1, -d / 2, nn, 1)
    push(x2, y2, d / 2, nn, 1)
    push(x2, y2, d / 2, nn, 1)
    push(x1, y1, -d / 2, nn, 1)
    push(x2, y2, -d / 2, nn, 1)
  }
  return v
}

/** A flat quad on the floor plane (y = 0), size s, for the floor pass. */
export function floorQuad(s: number): number[] {
  const n: Vec3 = [0, 1, 0]
  const p = (x: number, z: number) => [x, 0, z, ...n, x, z, 0]
  return [...p(-s, -s), ...p(s, -s), ...p(-s, s), ...p(-s, s), ...p(s, -s), ...p(s, s)]
}

/** The stage's colours and light, shared by both pieces. */
export const STAGE = {
  bg: [0.063, 0.075, 0.082] as Vec3, // #101315, the page colour
  light: norm([-0.45, 0.85, 0.55]), // key light: high, left, in front
}

/** GLSL shared by the pieces: the soft overhead softbox the glass reflects, and the fog to the page colour. */
export const GLSL_STAGE = /* glsl */ `
uniform vec3 uBg;
uniform vec3 uEye;
uniform vec3 uLight;
float softbox(vec3 r) {
  // a broad overhead light with a long, soft edge, and a faint strip lower down
  float top = smoothstep(0.35, 0.95, r.y) * 0.9;
  float strip = exp(-pow((r.y - 0.12) * 9.0, 2.0)) * smoothstep(-0.6, 0.2, r.x) * 0.18;
  return top + strip;
}
vec3 fogged(vec3 c, vec3 world, float k) {
  float d = length(world - uEye);
  return mix(c, uBg, 1.0 - exp(-max(0.0, d - 3.5) * k));
}`

/** Background: the page colour itself, so the scene has no edges and the floor dissolves into the page. */
export const BG_FRAG = /* glsl */ `#version 300 es
precision highp float;
uniform vec3 uBg;
in vec2 vUv;
out vec4 o;
void main() { o = vec4(uBg, 1.0); }`

export const BG_VERT = /* glsl */ `#version 300 es
layout(location = 0) in vec3 aPos;
out vec2 vUv;
void main() { vUv = aPos.xy * 0.5 + 0.5; gl_Position = vec4(aPos.xy, 0.0, 1.0); }`

/** Full-screen triangle pair for the background pass (positions only, in the same 9-float layout). */
export function screenQuad(): number[] {
  const p = (x: number, y: number) => [x, y, 0, 0, 0, 1, 0, 0, 0]
  return [...p(-1, -1), ...p(1, -1), ...p(-1, 1), ...p(-1, 1), ...p(1, -1), ...p(1, 1)]
}

/** Object vertex shader with an optional mirror in the floor plane (for reflections). */
export const OBJ_VERT = /* glsl */ `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUv;
layout(location = 3) in float aPart;
uniform mat4 uProj, uView, uModel;
uniform float uMirror;
uniform float uFloorY;
out vec3 vWorld;
out vec3 vNormal;
out vec2 vUv;
out float vPart;
void main() {
  vec4 w = uModel * vec4(aPos, 1.0);
  vec3 n = mat3(uModel) * aNormal;
  if (uMirror > 0.5) { w.y = 2.0 * uFloorY - w.y; n.y = -n.y; }
  vWorld = w.xyz;
  vNormal = n;
  vUv = aUv;
  vPart = aPart;
  gl_Position = uProj * uView * w;
}`

/** The floor: a dark lacquer that shows the reflections drawn before it, a light pool, soft contact shadows. */
export const FLOOR_FRAG = /* glsl */ `#version 300 es
precision highp float;
${GLSL_STAGE}
uniform vec3 uPool;           // centre (x, z) and radius of the light pool
uniform vec4 uShadows[4];     // x, z, half-width, yaw of each object's footprint
uniform vec2 uShadowSize[4];  // half-depth, strength
uniform int uShadowCount;
in vec3 vWorld;
out vec4 o;
float sdBox(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
void main() {
  vec2 xz = vWorld.xz;
  float pool = exp(-dot(xz - uPool.xy, xz - uPool.xy) / (uPool.z * uPool.z)) * 0.05;
  vec3 c = uBg * 0.9 + pool;
  float shade = 0.0;
  for (int i = 0; i < 4; i++) {
    if (i >= uShadowCount) break;
    vec4 s = uShadows[i];
    vec2 d = xz - s.xy;
    float cs = cos(s.w), sn = sin(s.w);
    vec2 local = vec2(cs * d.x - sn * d.y, sn * d.x + cs * d.y);
    float dist = sdBox(local, vec2(s.z, uShadowSize[i].x));
    shade = max(shade, (1.0 - smoothstep(-0.05, 0.42, dist)) * uShadowSize[i].y);
  }
  c *= 1.0 - shade * 0.75;
  // the floor dissolves into the page colour with distance (no visible horizon line)
  c = fogged(c, vWorld, 0.32);
  float a = mix(0.58, 1.0, smoothstep(4.0, 11.0, length(vWorld - uEye)));
  o = vec4(c, a);
}`

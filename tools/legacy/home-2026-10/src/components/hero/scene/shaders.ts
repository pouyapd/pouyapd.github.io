/**
 * GLSL for the hero scene: a monumental arched slab standing in a calm sea
 * at dusk, a pale sphere set into it, a thin orbit sweeping around it, and a
 * figure on a causeway for scale. Everything is computed here — sky, clouds,
 * water, light — no images.
 *
 * Shading is done in linear light and tone-mapped at the end of every pass
 * (`finish`), so the passes can be blended directly into the canvas.
 */

export const COMMON = /* glsl */ `
precision highp float;
uniform vec3 uSun;          // direction to the sun
uniform vec3 uEye;
uniform float uTime;
uniform sampler2D uClouds;  // cloud layer in (azimuth, elevation) space, see skyUv
uniform vec4 uSkyMap;       // az0, az1, elMax, vPow
uniform mat4 uMonoInv;      // world -> slab space
uniform vec4 uMono;         // slab width, height, depth, arch half-width
uniform vec2 uArch;         // arch centre x, springing height
uniform float uCloudEnc;    // 1: the cloud texture is 8-bit (square-root encoded), 0: half float

const vec3 SUN = vec3(5.2, 3.5, 2.3);

float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float hash13(vec3 p3) { p3 = fract(p3 * 0.1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash12(i), b = hash12(i + vec2(1, 0)), c = hash12(i + vec2(0, 1)), d = hash12(i + vec2(1, 1));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p, int oct) {
  float s = 0.0, a = 0.5, n = 0.0;
  for (int i = 0; i < 7; i++) {
    if (i >= oct) break;
    s += a * vnoise(p); n += a;
    p = mat2(1.62, 1.18, -1.18, 1.62) * p + 17.3;
    a *= 0.5;
  }
  return s / n;
}

vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
vec3 finish(vec3 c) {
  c = aces(c * 0.92);
  // grade: cool shadows, warm highlights
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c *= mix(vec3(0.90, 0.97, 1.12), vec3(1.04, 1.0, 0.95), smoothstep(0.02, 0.5, l));
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  // a little noise below one 8-bit step, so the long gradients never band
  return c + (hash12(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) / 255.0;
}

/* ---- sky ---- */

float ridge(float az) {
  // two low ranges far away on the horizon, either side of the slab
  float m = smoothstep(-0.70, -0.52, az) * (1.0 - smoothstep(-0.30, -0.16, az)) * 0.8
          + smoothstep(0.34, 0.46, az) * (1.0 - smoothstep(0.80, 0.95, az));
  float n = fbm(vec2(az * 26.0, 3.7), 4);
  return m * (0.0025 + 0.011 * n * n);
}

/** the sky without the sun's glow: also the colour of the haze over the sea */
vec3 skyGradient(vec3 d) {
  float el = max(d.y, 0.0);
  float side = max(dot(normalize(d.xz + 1e-5), normalize(uSun.xz)), 0.0);   // 1 towards the sun's bearing
  float e = pow(el, 0.7);
  vec3 zen = vec3(0.009, 0.015, 0.030);
  vec3 mid = vec3(0.030, 0.042, 0.068);
  vec3 low = vec3(0.088, 0.094, 0.118);
  vec3 c = mix(low, mid, smoothstep(0.0, 0.3, e));
  c = mix(c, zen, smoothstep(0.25, 0.95, el));
  float s = pow(side, 3.0);
  // a warm band along the horizon, deeper towards the sun
  c += vec3(0.62, 0.36, 0.20) * s * exp(-el * mix(24.0, 10.0, s)) * 0.8;
  c += vec3(0.13, 0.11, 0.12) * pow(side, 4.0) * exp(-el * 4.0);
  c += vec3(0.09, 0.08, 0.078) * exp(-el * 60.0);
  return c;
}

vec3 skyBase(vec3 d) {
  float mu = max(dot(d, uSun), 0.0);
  vec3 c = skyGradient(d);
  c += vec3(0.78, 0.46, 0.25) * pow(mu, 80.0) * 0.95;
  c += vec3(1.0, 0.74, 0.48) * pow(mu, 1400.0) * 6.0;
  // far mountains, lost in haze
  float m = ridge(atan(d.x, -d.z));
  if (d.y < m) {
    float side = pow(max(dot(normalize(d.xz + 1e-5), normalize(uSun.xz)), 0.0), 3.0);
    c = mix(c, vec3(0.05, 0.055, 0.068) + vec3(0.16, 0.10, 0.06) * side, 0.6 * (1.0 - d.y / max(m, 1e-4) * 0.35));
  }
  return c;
}

vec2 skyUv(vec3 d) {
  float az = atan(d.x, -d.z);
  float el = asin(clamp(d.y, -1.0, 1.0));
  return vec2((az - uSkyMap.x) / (uSkyMap.y - uSkyMap.x), pow(clamp(el / uSkyMap.z, 0.0, 1.0), uSkyMap.w));
}

/** premultiplied cloud colour + coverage */
vec4 clouds(vec3 d, float lod) {
  vec4 t = textureLod(uClouds, skyUv(d), lod);
  return uCloudEnc > 0.5 ? vec4(t.rgb * t.rgb * 4.0, t.a) : t;
}

vec3 sky(vec3 d, float lod) {
  vec4 c = clouds(d, lod);
  return skyBase(d) * (1.0 - c.a) + c.rgb;
}

/** what a surface sees in direction d: the sky above, its reflection in the sea below */
vec3 env(vec3 d, float lod) {
  if (d.y >= 0.0) return sky(d, lod);
  return sky(vec3(d.x, -d.y, d.z), lod + 1.0) * 0.6 + vec3(0.006, 0.008, 0.011);
}

/** diffuse light from the whole sky and the sea */
vec3 irradiance(vec3 n) {
  vec3 up = vec3(0.045, 0.058, 0.085);
  vec3 hor = vec3(0.20, 0.18, 0.185);
  vec3 down = vec3(0.075, 0.072, 0.078);
  vec3 c = n.y > 0.0 ? mix(hor, up, n.y) : mix(hor, down, -n.y);
  float s = max(dot(normalize(n.xz + 1e-5), normalize(uSun.xz)), 0.0);
  c += vec3(0.70, 0.42, 0.25) * pow(s, 3.0) * (1.0 - abs(n.y)) * 0.8;
  return c;
}

vec3 aerial(vec3 c, vec3 p) {
  vec3 v = p - uEye;
  float dist = length(v);
  vec3 fogC = skyGradient(normalize(vec3(v.x, length(v.xz) * 0.05, v.z)));
  return mix(c, fogC, 1.0 - exp(-dist * 0.0026));
}

/* ---- the slab ---- */

/** signed distance to the slab's outline seen from the front (negative = solid) */
float slabShape(vec2 q) {
  vec2 b = vec2(uMono.x * 0.5, uMono.y * 0.5);
  vec2 dq = abs(q - vec2(0.0, b.y)) - b;
  float outer = length(max(dq, 0.0)) + min(max(dq.x, dq.y), 0.0);
  vec2 r = q - vec2(uArch.x, uArch.y);
  float hole = r.y < 0.0 ? abs(r.x) - uMono.w : length(r) - uMono.w;
  return max(outer, -hole);
}

/** how much of the sun reaches p past the slab: through the arch, or around it */
float sunVis(vec3 p) {
  vec3 lp = (uMonoInv * vec4(p, 1.0)).xyz;
  vec3 ld = mat3(uMonoInv) * uSun;
  if (abs(ld.z) < 1e-4) return 1.0;
  float hd = uMono.z * 0.5;
  float t1 = (hd - lp.z) / ld.z, t2 = (-hd - lp.z) / ld.z;
  float tn = max(min(t1, t2), 0.0), tf = max(t1, t2);
  if (tf <= 0.0) return 1.0;
  float m = 1e3;
  for (int i = 0; i < 3; i++) {
    float t = mix(tn, tf, float(i) * 0.5);
    m = min(m, slabShape((lp + ld * t).xy));
  }
  float pen = 0.04 + tn * 0.012;
  return smoothstep(-pen, pen, m);
}
`

/** Full-screen pass: reconstructs the view ray of each pixel. */
export const QUAD_VERT = /* glsl */ `#version 300 es
layout(location = 0) in vec3 aPos;
out vec2 vUv;
void main() { vUv = aPos.xy * 0.5 + 0.5; gl_Position = vec4(aPos.xy, 0.0, 1.0); }`

export const SKY_FRAG = /* glsl */ `#version 300 es
${COMMON}
uniform mat4 uInvViewProj;
uniform float uMirror;
in vec2 vUv;
out vec4 o;
void main() {
  vec4 a = uInvViewProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
  vec3 d = normalize(a.xyz / a.w - uEye);
  if (uMirror > 0.5) d.y = -d.y;
  vec3 c = sky(d, 0.0);
  float mu = dot(d, uSun);
  // the sun's disc, behind any cloud in front of it
  float disc = smoothstep(cos(0.0105), cos(0.0085), mu);
  c += vec3(26.0, 19.0, 13.0) * disc * (1.0 - clouds(d, 0.0).a);
  o = vec4(finish(c), 1.0);
}`

/**
 * A tileable 3-D noise volume for the clouds, rendered one slice at a time:
 * r = Perlin-Worley (the billowing body), g, b, a = Worley at rising
 * frequencies (to erode the edges).
 */
export const NOISE_FRAG = /* glsl */ `#version 300 es
precision highp float;
uniform float uSlice;
uniform float uSize;
out vec4 o;
vec3 h33(vec3 p) {
  p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
  return fract(sin(p) * 43758.5453);
}
float worley(vec3 p, float period) {
  vec3 i = floor(p), f = fract(p);
  float d = 1.0;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 c = vec3(x, y, z);
    vec3 r = c + h33(mod(i + c, period)) - f;
    d = min(d, dot(r, r));
  }
  return 1.0 - sqrt(d);
}
float grad(vec3 i, vec3 f, vec3 c, float period) {
  vec3 g = h33(mod(i + c, period)) * 2.0 - 1.0;
  return dot(normalize(g + 1e-4), f - c);
}
float perlin(vec3 p, float period) {
  vec3 i = floor(p), f = fract(p);
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(mix(grad(i, f, vec3(0, 0, 0), period), grad(i, f, vec3(1, 0, 0), period), u.x),
                 mix(grad(i, f, vec3(0, 1, 0), period), grad(i, f, vec3(1, 1, 0), period), u.x), u.y),
             mix(mix(grad(i, f, vec3(0, 0, 1), period), grad(i, f, vec3(1, 0, 1), period), u.x),
                 mix(grad(i, f, vec3(0, 1, 1), period), grad(i, f, vec3(1, 1, 1), period), u.x), u.y), u.z);
}
float remap(float v, float a, float b, float c, float d) { return c + (v - a) / (b - a) * (d - c); }
void main() {
  vec3 p = vec3(gl_FragCoord.xy, uSlice + 0.5) / uSize;
  float pf = 0.0, amp = 1.0, tot = 0.0;
  for (int k = 0; k < 4; k++) {
    float fr = 4.0 * pow(2.0, float(k));
    pf += perlin(p * fr, fr) * amp; tot += amp; amp *= 0.5;
  }
  pf = clamp(pf / tot * 0.9 + 0.5, 0.0, 1.0);
  float w1 = worley(p * 4.0, 4.0), w2 = worley(p * 8.0, 8.0), w3 = worley(p * 16.0, 16.0), w4 = worley(p * 32.0, 32.0);
  float wf = w1 * 0.625 + w2 * 0.25 + w3 * 0.125;
  float pw = clamp(remap(pf, 0.0, 1.0, wf, 1.0), 0.0, 1.0);
  o = vec4(pw, w2 * 0.625 + w3 * 0.25 + w4 * 0.125, w3 * 0.75 + w4 * 0.25, w4);
}`

/**
 * The cloud layer, rendered into a texture in direction space and refreshed a
 * strip at a time. Each cloud is a volume in the world — a heap with a flat
 * base and a domed top, eroded by the noise volume — ray-marched from the eye
 * and lit by the low sun (forward-scattering rims, warm undersides from the
 * glowing sea, a powdery falloff in the thin edges).
 */
export const CLOUD_FRAG = /* glsl */ `#version 300 es
${COMMON}
precision highp sampler3D;
#define HEAPS 12
uniform sampler3D uNoise;
uniform vec4 uHeapA[HEAPS];   // centre x, z, horizontal radius, base height
uniform vec4 uHeapB[HEAPS];   // height, seed, density, noise scale
in vec2 vUv;
out vec4 o;

float remap(float v, float a, float b, float c, float d) { return c + (v - a) / (b - a) * (d - c); }

float density(vec3 p, vec4 a, vec4 b, bool detail) {
  vec2 q = (p.xz - a.xy) / a.z;
  float r2 = dot(q, q);
  float y = (p.y - a.w) / b.x;
  if (r2 >= 1.0 || y <= 0.0 || y >= 1.0) return 0.0;
  vec3 uvw = p / (b.x * b.w) + b.y * 0.37 + vec3(uTime * 0.004, 0.0, 0.0);
  // large lumps decide where the heap towers, the fine noise gives it billows
  float lump = smoothstep(0.55, 0.95, texture(uNoise, uvw * 0.3 + 0.21).r);
  float top = (0.25 + 0.85 * lump) * (1.0 - r2 * 0.85);
  float shape = smoothstep(0.0, 0.05, y) * (1.0 - smoothstep(top * 0.5, top, y)) * (1.0 - smoothstep(0.5, 1.0, r2));
  float body = smoothstep(0.6, 0.97, texture(uNoise, uvw).r);
  float d = clamp(remap(body, 1.0 - shape, 1.0, 0.0, 1.0), 0.0, 1.0);
  if (detail && d > 0.0) {
    float e = texture(uNoise, uvw * 2.7 + 0.5).g;
    d = clamp(remap(d, mix(1.0 - e, e, clamp(y * 2.0, 0.0, 1.0)) * 0.5, 1.0, 0.0, 1.0), 0.0, 1.0);
  }
  return d * b.z;
}

float hg(float c, float g) { float g2 = g * g; return (1.0 - g2) / (4.0 * 3.14159 * pow(1.0 + g2 - 2.0 * g * c, 1.5)); }

void main() {
  float az = mix(uSkyMap.x, uSkyMap.y, vUv.x);
  float el = pow(vUv.y, 1.0 / uSkyMap.w) * uSkyMap.z;
  vec3 rd = vec3(sin(az) * cos(el), sin(el), -cos(az) * cos(el));
  vec3 ro = vec3(0.0, 1.5, 0.0);
  // the clouds are lit by the sun raised a little, so their faces read
  vec3 L = normalize(uSun + vec3(0.0, 0.16, 0.0));
  float mu = dot(rd, uSun);
  float phase = mix(hg(mu, 0.62), hg(mu, -0.15), 0.35) * 4.0 * 3.14159;
  vec3 sunC = vec3(1.0, 0.66, 0.42) * 1.35;
  float jitter = hash12(gl_FragCoord.xy + fract(uTime) * 13.0);

  vec3 acc = vec3(0.0);
  float T = 1.0;
  // heaps are listed far to near; march each one the ray crosses
  for (int i = 0; i < HEAPS; i++) {
    vec4 a = uHeapA[i];
    vec4 b = uHeapB[i];
    if (a.z <= 0.0 || T < 0.02) continue;
    // ray vs. the heap's bounding box
    vec3 lo = vec3(a.x - a.z, a.w, a.y - a.z), hi = vec3(a.x + a.z, a.w + b.x, a.y + a.z);
    vec3 inv = 1.0 / rd;
    vec3 t0 = (lo - ro) * inv, t1 = (hi - ro) * inv;
    vec3 tmin = min(t0, t1), tmax = max(t0, t1);
    float tn = max(max(tmin.x, tmin.y), max(tmin.z, 0.0));
    float tf = min(min(tmax.x, tmax.y), tmax.z);
    if (tf <= tn) continue;
    const int STEPS = 44;
    float dt = (tf - tn) / float(STEPS);
    float sigma = 3.2 / (b.x * 0.35);
    for (int s = 0; s < STEPS; s++) {
      vec3 p = ro + rd * (tn + (float(s) + jitter) * dt);
      float d = density(p, a, b, true);
      if (d <= 0.001) continue;
      // light: a few steps towards the sun through the same heap
      float od = 0.0;
      float ls = b.x * 0.07;
      for (int k = 1; k <= 5; k++) od += density(p + L * ls * float(k) * float(k) * 0.5, a, b, false) * ls * float(k) * 0.5;
      float y = clamp((p.y - a.w) / b.x, 0.0, 1.0);
      float beer = exp(-od * sigma * 1.5);
      float powder = 1.0 - exp(-d * 6.0);
      vec3 amb = mix(vec3(0.075, 0.058, 0.052), vec3(0.070, 0.080, 0.108), smoothstep(0.0, 0.8, y));
      vec3 lum = sunC * beer * mix(1.0, powder, 0.7) * phase + sunC * exp(-od * sigma * 0.25) * 0.10 + amb;
      float ext = d * sigma;
      float st = exp(-ext * dt);
      acc += T * lum * (1.0 - st);
      T *= st;
      if (T < 0.02) break;
    }
  }
  float alpha = 1.0 - T;
  // far clouds sink into the haze over the sea
  float haze = exp(-max(el, 0.0) * 32.0) * 0.6;
  vec3 bg = skyBase(rd);
  acc = mix(acc, bg * alpha, haze);
  o = uCloudEnc > 0.5 ? vec4(sqrt(min(acc / 4.0, vec3(1.0))), alpha) : vec4(acc, alpha);
}`

/** Shared vertex shader for the solid objects; with uMirror it draws their reflection in the sea (y = 0). */
export const OBJ_VERT = /* glsl */ `#version 300 es
layout(location = 0) in vec3 aPos;
layout(location = 1) in vec3 aNormal;
layout(location = 2) in vec2 aUv;
layout(location = 3) in float aPart;
uniform mat4 uProj, uView, uModel;
uniform float uMirror;
out vec3 vWorld;
out vec3 vNormal;
out vec3 vLocal;
out vec2 vUv;
out float vPart;
void main() {
  vec4 w = uModel * vec4(aPos, 1.0);
  vec3 n = mat3(uModel) * aNormal;
  vWorld = w.xyz;
  if (uMirror > 0.5) w.y = -w.y;
  vNormal = n;
  vLocal = aPos;
  vUv = aUv;
  vPart = aPart;
  gl_Position = uProj * uView * w;
}`

/**
 * Materials: 0 the slab (pale, satin-finished stone), 1 the sphere, 2 the
 * causeway (polished dark stone), 3 the figure, 4 the rocks.
 */
export const OBJ_FRAG = /* glsl */ `#version 300 es
${COMMON}
uniform int uMat;
uniform float uMirror;
uniform mat3 uSpin;         // the sphere's rotation
in vec3 vWorld;
in vec3 vNormal;
in vec3 vLocal;
in vec2 vUv;
in float vPart;
out vec4 o;

float vnoise3(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash13(i), hash13(i + vec3(1, 0, 0)), u.x), mix(hash13(i + vec3(0, 1, 0)), hash13(i + vec3(1, 1, 0)), u.x), u.y),
             mix(mix(hash13(i + vec3(0, 0, 1)), hash13(i + vec3(1, 0, 1)), u.x), mix(hash13(i + vec3(0, 1, 1)), hash13(i + vec3(1, 1, 1)), u.x), u.y), u.z);
}
float fbm3(vec3 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { s += a * vnoise3(p); p = p * 2.03 + 11.7; a *= 0.5; }
  return s;
}
/** craters: bowls with raised rims, three sizes */
float craters(vec3 p) {
  float h = 0.0;
  for (int k = 0; k < 3; k++) {
    vec3 s = p * (3.0 + float(k) * 4.5);
    vec3 i = floor(s), f = fract(s);
    for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec3 c = vec3(x, y, z);
      float r = hash13(i + c + float(k) * 7.0);
      if (r > 0.42) continue;
      vec3 o3 = c + vec3(hash13(i + c + 1.3), hash13(i + c + 2.9), hash13(i + c + 5.1)) - f;
      float d = length(o3) / (0.25 + r);
      h += (smoothstep(0.75, 1.0, d) * (1.0 - smoothstep(1.0, 1.35, d)) * 0.5 - (1.0 - smoothstep(0.0, 0.95, d)) * 0.6) * (1.0 - float(k) * 0.28);
    }
  }
  return h;
}

float ggx(float ndh, float r) { float a = r * r; float a2 = a * a; float d = ndh * ndh * (a2 - 1.0) + 1.0; return a2 / (3.14159 * d * d); }

void main() {
  if (uMirror > 0.5 && vWorld.y < -0.02) discard;
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uEye - vWorld);
  vec3 L = uSun;
  vec3 H = normalize(L + V);
  float ndl = max(dot(N, L), 0.0);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float vis = (uMat == 1) ? 1.0 : sunVis(vWorld + N * 0.06);
  vec3 c;

  if (uMat == 0) {
    // slab: pale stone with a fine vertical grain, edges catching the light
    vec2 g = vPart < 1.5 ? vLocal.xy : vec2(vLocal.z, vLocal.y);
    float grain = fbm(vec2(g.x * 3.0, g.y * 0.12), 4) * 0.6 + fbm(vec2(g.x * 18.0, g.y * 0.6), 3) * 0.4;
    vec3 albedo = vec3(0.34, 0.335, 0.33) * (0.82 + 0.3 * grain);
    float rough = 0.42 - grain * 0.08;
    vec3 R = reflect(-V, N);
    float F = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
    c = albedo * (SUN * ndl * vis * 0.9 + irradiance(N) * 1.05);
    c += env(R, rough * 7.0) * mix(0.05, 0.5, F);
    c += SUN * ggx(max(dot(N, H), 0.0), rough) * ndl * vis * 0.12;
    // a soft glow where sunlight is thrown back inside the arch
    if (vPart > 2.5 && vPart < 3.5) c += vec3(0.95, 0.55, 0.30) * 0.14 * smoothstep(-uMono.z * 0.5, uMono.z * 0.5, -vLocal.z);
    // light thrown back around the arch's mouth, and up the face from the sea
    if (vPart < 1.5) {
      vec2 r = vLocal.xy - uArch;
      float hd = r.y < 0.0 ? abs(r.x) - uMono.w : length(r) - uMono.w;
      c += vec3(0.85, 0.52, 0.32) * exp(-max(hd, 0.0) * 0.55) * 0.05 * (vPart < 0.5 ? 1.0 : 2.0);
    }
    // the vertical edges carry a thin highlight
    float ex = uMono.x * 0.5 - abs(vLocal.x);
    float ez = uMono.z * 0.5 - abs(vLocal.z);
    float edge = vPart < 1.5 ? ex : ez;
    c += vec3(0.65, 0.48, 0.36) * exp(-max(edge, 0.0) * 9.0) * 0.18 * (0.4 + vis);
    // ambient occlusion where the slab meets the water
    c *= mix(0.55, 1.0, smoothstep(0.0, 3.0, vWorld.y));
  } else if (uMat == 1) {
    // the sphere: a pale moon, its maria and craters turning slowly
    vec3 sp = uSpin * normalize(vLocal);
    float maria = smoothstep(0.48, 0.64, fbm3(sp * 1.6 + 2.0));
    float cr = craters(sp);
    float detail = fbm3(sp * 9.0);
    vec3 albedo = vec3(0.60, 0.59, 0.58) * (0.78 + 0.35 * detail) * (1.0 - maria * 0.32) + cr * 0.11;
    vec3 fill = normalize(vec3(0.45, 0.62, 0.64));
    float wrap = max((dot(N, fill) + 0.25) / 1.25, 0.0);
    c = albedo * (SUN * ndl * 0.6 + vec3(0.46, 0.44, 0.44) * wrap * wrap + irradiance(N) * 0.55);
    // a warm limb on the side facing the sun
    c += vec3(0.9, 0.62, 0.42) * pow(1.0 - ndv, 3.0) * max(dot(N, normalize(vec3(L.x, 0.2, L.z))), 0.0) * 0.8;
  } else if (uMat == 2) {
    // causeway: polished dark stone that mirrors the sky
    vec3 R = reflect(-V, N);
    float F = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
    vec3 albedo = vec3(0.026, 0.028, 0.032);
    c = albedo * (SUN * ndl * vis + irradiance(N));
    c += env(R, 2.5) * mix(0.03, 0.55, F) * (vPart < 0.5 ? 1.0 : 0.35);
    c += SUN * ggx(max(dot(N, H), 0.0), 0.16) * ndl * vis * 0.6;
  } else if (uMat == 3) {
    // the figure: a dark coat, edged with the light in front of it
    vec3 albedo = vec3(0.028, 0.030, 0.036);
    c = albedo * (irradiance(N) * 1.4 + SUN * ndl * vis);
    float back = max(dot(-V, L), 0.0);
    c += vec3(1.0, 0.68, 0.45) * pow(1.0 - ndv, 3.5) * (0.15 + 0.9 * back) * (0.3 + 0.7 * vis) * 0.9;
  } else {
    // rocks: dark, faceted, warm on the faces turned to the sun
    float n = fbm3(vLocal * 0.9);
    vec3 albedo = vec3(0.16, 0.145, 0.135) * (0.6 + 0.6 * n);
    c = albedo * (SUN * ndl * vis * 0.9 + irradiance(N) * 1.2);
    c += vec3(0.6, 0.4, 0.28) * pow(1.0 - ndv, 4.0) * 0.12;
    c *= mix(0.6, 1.0, smoothstep(0.0, 1.5, vWorld.y));
  }

  o = vec4(finish(aerial(c, vWorld)), 1.0);
}`

/** The sea: a mirror (the reflection pass, rippled), dark depths, and the sun's glitter where it is not blocked. */
export const WATER_VERT = /* glsl */ `#version 300 es
layout(location = 0) in vec3 aPos;
uniform mat4 uProj, uView;
out vec3 vWorld;
void main() { vWorld = aPos; gl_Position = uProj * uView * vec4(aPos, 1.0); }`

export const WATER_FRAG = /* glsl */ `#version 300 es
${COMMON}
uniform sampler2D uRefl;
uniform vec2 uViewport;
in vec3 vWorld;
out vec4 o;

/** slope of the swell: long, slow waves crossing the view, and a fine chop */
vec2 swell(vec2 p, float t) {
  vec2 g = vec2(0.0);
  const int N = 6;
  vec2 dirs[N] = vec2[N](vec2(0.10, 1.0), vec2(-0.32, 0.95), vec2(0.45, 0.89), vec2(-0.12, 1.0), vec2(0.25, 0.97), vec2(-0.55, 0.83));
  float lens[N] = float[N](9.0, 5.3, 3.4, 2.1, 1.3, 0.8);
  for (int i = 0; i < N; i++) {
    float k = 6.2832 / lens[i];
    float a = 0.0032 * lens[i];
    float ph = dot(dirs[i], p) * k + t * sqrt(9.8 * k) * 0.55 + float(i) * 1.7;
    g += dirs[i] * (a * k * cos(ph));
  }
  float n1 = vnoise(p * vec2(0.9, 2.2) + t * 0.15), n2 = vnoise(p * vec2(0.9, 2.2) + vec2(0.4, 0.0) + t * 0.15);
  g.x += (n2 - n1) * 0.05;
  return g;
}

void main() {
  vec3 p = vWorld;
  vec3 v = uEye - p;
  float dist = length(v);
  vec3 V = v / dist;
  float fade = 1.0 / (1.0 + dist * 0.028);
  vec2 g = swell(p.xz, uTime) * fade;
  vec3 N = normalize(vec3(-g.x, 1.0, -g.y));
  float ndv = max(dot(N, V), 0.0);
  float F = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);

  vec2 suv = gl_FragCoord.xy / uViewport;
  vec2 off = vec2(N.x * 0.35, N.z * 1.0) * 0.09;
  vec3 refl = (texture(uRefl, suv + off).rgb + texture(uRefl, suv + off * 1.6 + vec2(0.0, 0.002)).rgb) * 0.5;
  // the reflection is already tone-mapped: mix in display-linear light, darkened by the water
  refl = pow(max(refl, 0.0), vec3(2.2));
  vec3 deep = vec3(0.003, 0.0045, 0.007);
  float r = mix(0.42, 0.95, F);
  vec3 c = mix(deep, refl, r);
  // glitter of the sun, only where the slab lets it through
  vec3 H = normalize(uSun + V);
  float ndh = max(dot(N, H), 0.0);
  float spec = pow(ndh, 900.0) * 18.0 + pow(ndh, 120.0) * 0.5;
  c += aces(vec3(1.0, 0.72, 0.5) * spec * sunVis(p));
  o = vec4(pow(c, vec3(1.0 / 2.2)) + (hash12(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) / 255.0, 1.0);
}`

/**
 * The orbit: a thin wire around the slab, drawn as a screen-aligned ribbon a
 * pixel or two wide, depth-tested against the solid objects. A brighter
 * stretch of light runs along it.
 */
export const RING_VERT = /* glsl */ `#version 300 es
layout(location = 0) in vec3 aPos;     // x: angle (0..1), y: side (-1, 1)
uniform mat4 uProj, uView;
uniform vec3 uRingC, uRingU, uRingV;
uniform float uWidth;
uniform float uGlint;   // angle of the travelling light
uniform vec2 uViewport;
uniform float uMirror;
out float vSide;
out float vHalf;
out float vGlint;
out vec3 vWorld;
vec3 ringAt(float a) {
  vec3 p = uRingC + uRingU * cos(a) + uRingV * sin(a);
  if (uMirror > 0.5) p.y = -p.y;
  return p;
}
void main() {
  float a = aPos.x * 6.2831853;
  vec3 p = ringAt(a);
  vec4 c0 = uProj * uView * vec4(p, 1.0);
  vec4 c1 = uProj * uView * vec4(ringAt(a + 0.002), 1.0);
  vec2 s0 = c0.xy / c0.w * uViewport, s1 = c1.xy / c1.w * uViewport;
  vec2 t = normalize(s1 - s0 + 1e-6);
  vec2 nrm = vec2(-t.y, t.x);
  // light runs around the orbit: a bright head and a long fading tail
  float d = mod(uGlint - a + 6.2831853, 6.2831853);
  float g = exp(-d * 1.4) * smoothstep(0.0, 0.04, d) + exp(-pow((6.2831853 - d) / 0.04, 2.0));
  float w = uWidth * (1.0 + g * 1.3);
  float half_ = w * 0.5 + 1.0;
  c0.xy += nrm * aPos.y * half_ * 2.0 / uViewport * c0.w;
  vSide = aPos.y * half_;
  vHalf = w * 0.5;
  vGlint = g;
  vWorld = uRingC + uRingU * cos(a) + uRingV * sin(a);
  gl_Position = c0;
}`

export const RING_FRAG = /* glsl */ `#version 300 es
${COMMON}
uniform float uMirror;
in float vSide;
in float vHalf;
in float vGlint;
in vec3 vWorld;
out vec4 o;
void main() {
  float cover = 1.0 - smoothstep(vHalf - 0.5, vHalf + 0.75, abs(vSide));
  vec3 wire = vec3(0.17, 0.165, 0.17);
  vec3 c = wire + vec3(4.2, 2.9, 1.8) * vGlint;
  vec3 col = finish(aerial(c, vWorld));
  o = vec4(col, cover * (uMirror > 0.5 ? 0.55 : 0.92));
}`

/** A soft bloom of the sun where it shows through the arch, laid over everything. */
export const GLOW_FRAG = /* glsl */ `#version 300 es
${COMMON}
uniform vec2 uSunPx;      // the sun on screen (pixels)
uniform vec2 uViewport;
uniform float uStrength;
in vec2 vUv;
out vec4 o;
void main() {
  vec2 d = (gl_FragCoord.xy - uSunPx) / uViewport.y;
  float r = length(d * vec2(1.0, 1.25));
  vec3 g = vec3(1.0, 0.70, 0.46) * (exp(-r * 22.0) * 0.16 + exp(-r * 6.0) * 0.035) * uStrength * sunVis(uEye);
  o = vec4(g, 0.0);
}`

// Grades the hero renders (tools/scene/out/gateway-<variant>.png → gateway-<variant>-graded.png)
// like a photographer's graduated filter: the sky darkens and cools towards the top and the left,
// where the headline sits, while the sun in the arch and its path on the water stay untouched.
//   node tools/scene/grade.mjs [desktop|mobile ...]
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out')

// where the horizon and the sun fall in each framing (fractions of width and height, from tools/scene/gateway.py)
const FRAMES = {
  desktop: { horizon: 0.676, sun: [0.633, 0.67], left: 0.66, top: 0.62, sideDark: 0.58 },
  mobile: { horizon: 0.47, sun: [0.734, 0.465], left: 0.9, top: 0.5, sideDark: 0.18 },
}

// a cheap, stable per-pixel hash in [0, 1)
const hash = (x, y) => {
  const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return h - Math.floor(h)
}

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

async function grade(variant) {
  const f = FRAMES[variant]
  const src = path.join(out, `gateway-${variant}.png`)
  const { data, info } = await sharp(src).removeAlpha().toColourspace('rgb16').raw({ depth: 'ushort' }).toBuffer({ resolveWithObject: true })
  const px = new Uint16Array(data.buffer, data.byteOffset, data.length / 2)
  const { width: W, height: H } = info
  const o = new Uint8Array(W * H * 3)
  const toLin = new Float32Array(65536)
  for (let i = 0; i < 65536; i++) toLin[i] = Math.pow(i / 65535, 2.2)
  for (let y = 0; y < H; y++) {
    const v = y / H
    const sky = smooth(0, 1, (f.horizon - v) / f.horizon) // 0 at the horizon, 1 at the top
    for (let x = 0; x < W; x++) {
      const u = x / W
      let gain = 1 - f.top * Math.pow(smooth(0.04, 1, sky), 0.85)
      const side = smooth(0, 1, (f.left - u) / f.left)
      gain *= 1 - f.sideDark * side * (v < f.horizon ? 1 : 0.75)
      // keep the sun, the arch and the light path untouched
      const dx = (u - f.sun[0]) * (W / H)
      const dy = v - f.sun[1]
      const near = Math.exp(-(dx * dx + dy * dy) / 0.045)
      const path_ = Math.exp(-(dx * dx) / 0.004) * (v > f.horizon ? 1 : 0)
      gain = gain + (1 - gain) * Math.max(near, path_ * 0.8)
      const cool = 1 - gain
      const i = (y * W + x) * 3
      const r = toLin[px[i]] * gain * (1 - 0.07 * cool)
      const g = toLin[px[i + 1]] * gain * (1 - 0.03 * cool)
      const b = toLin[px[i + 2]] * gain * (1 + 0.05 * cool)
      // back to 8-bit with a half-step of noise, so the long sky gradients do not band
      const n = (hash(x, y) - 0.5) * 0.9
      o[i] = Math.max(0, Math.min(255, Math.round(Math.pow(Math.min(1, r), 1 / 2.2) * 255 + n)))
      o[i + 1] = Math.max(0, Math.min(255, Math.round(Math.pow(Math.min(1, g), 1 / 2.2) * 255 + n)))
      o[i + 2] = Math.max(0, Math.min(255, Math.round(Math.pow(Math.min(1, b), 1 / 2.2) * 255 + n)))
    }
  }
  const dst = path.join(out, `gateway-${variant}-graded.png`)
  await sharp(Buffer.from(o.buffer), { raw: { width: W, height: H, channels: 3 } }).png({ compressionLevel: 6 }).toFile(dst)
  console.log('graded', path.basename(dst))
}

for (const v of process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(FRAMES)) await grade(v)

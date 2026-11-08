import { useEffect, useRef } from 'react'
import { asset } from '../../app/paths'
import media from '../../content/generated/media.json'
import { hasFinePointer, prefersReducedMotion } from '../motion/media'
import { BG_FRAG, BG_VERT, ease, FLOOR_FRAG, floorQuad, GLSL_STAGE, mat4, mesh, OBJ_VERT, programs, screenQuad, STAGE, type Vec3 } from '../stage/gl'
import './type-drum.css'

/**
 * Creative motion & interactive 3-D: a kinetic type drum. Five bands of type
 * wrap a cylinder above the same dark, reflective floor as the hero. On a
 * steady beat each band turns one step — the bands follow one another from
 * top to bottom, alternating direction — then everything holds. The far side
 * of the drum reads faintly through it, so the volume is legible; the key
 * light darkens the letters as they turn away. One word is lime.
 *
 *   beat      a step every 3 s; each band moves for 1.3 s, 0.12 s after the one above
 *   scroll    the drum turns a little with the page
 *   pointer   the camera leans a few degrees
 *
 * Off screen nothing runs. Reduced motion, no WebGL2 or no JavaScript show a
 * still of the drum (scripts/posters.mjs). `?stage=poster` renders that still.
 */

const BANDS = [
  { words: ['DESIGN', 'DEPTH', 'DETAIL', 'DIRECTION'], lime: '' },
  { words: ['SCROLL', 'STORY', 'STAGE', 'SEQUENCE'], lime: '' },
  { words: ['MOTION', 'MOMENT', 'MEANING', 'METHOD'], lime: 'MOTION' },
  { words: ['LIGHT', 'LAYER', 'LENS', 'LOOP'], lime: '' },
  { words: ['TYPE', 'TIME', 'TEMPO', 'TOUCH'], lime: '' },
]
const RADIUS = 1
const BAND_H = 0.33
const GAP = 0.05
const FLOOR_Y = -1.32
const STEP = (Math.PI * 2) / 8
const BEAT = 3
const MOVE = 1.3

const DRUM_FRAG = /* glsl */ `#version 300 es
precision highp float;
${GLSL_STAGE}
uniform sampler2D uTex;
uniform float uTurn;
uniform float uInside;
uniform float uMirror;
uniform float uFloorY;
in vec3 vWorld;
in vec3 vNormal;
in vec2 vUv;
out vec4 o;
void main() {
  vec4 t = texture(uTex, vec2(vUv.x + uTurn, vUv.y));
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uEye - vWorld);
  float facing = dot(N, V);
  // letters turning away from the camera fall into shadow; the inside of the drum is dim
  float lit = uInside > 0.5 ? 0.16 : (0.2 + 0.8 * pow(max(facing, 0.0), 0.9)) * (0.7 + 0.3 * max(dot(N, normalize(uLight)), 0.0));
  vec3 c = fogged(t.rgb * lit, vWorld, 0.08);
  float a = t.a * (uInside > 0.5 ? 0.32 : 1.0);
  if (uMirror > 0.5) a *= 0.22 * exp(-(uFloorY - vWorld.y) * 1.2);
  o = vec4(c, a);
}`

/** One band of the drum: a cylinder strip, uv.x around (0 → 1), uv.y top → bottom. */
function band(y: number, h: number, seg = 160): number[] {
  const v: number[] = []
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2
    const a1 = ((i + 1) / seg) * Math.PI * 2
    const p = (a: number, yy: number, u: number, vv: number) => [Math.sin(a) * RADIUS, yy, Math.cos(a) * RADIUS, Math.sin(a), 0, Math.cos(a), u, vv, 0]
    const top = y + h / 2
    const bot = y - h / 2
    v.push(...p(a0, top, i / seg, 0), ...p(a0, bot, i / seg, 1), ...p(a1, top, (i + 1) / seg, 0))
    v.push(...p(a1, top, (i + 1) / seg, 0), ...p(a0, bot, i / seg, 1), ...p(a1, bot, (i + 1) / seg, 1))
  }
  return v
}

/** The type for one band, words spaced evenly so the strip closes without a seam or any stretching. */
function bandTexture(words: string[], lime: string) {
  const c = document.createElement('canvas')
  c.width = 4096
  c.height = 256
  const g = c.getContext('2d')!
  g.font = "600 176px 'Geist Variable', 'Geist', sans-serif"
  g.textBaseline = 'middle'
  const widths = words.map((w) => g.measureText(w).width)
  const sep = '·'
  const sepW = g.measureText(sep).width
  const total = widths.reduce((a, b) => a + b, 0)
  // even gaps that close the loop; never tighter than two separators' width
  const gap = Math.max(sepW * 2.5, (c.width - total) / words.length)
  let x = gap / 2
  words.forEach((w, i) => {
    g.fillStyle = w === lime ? '#c5f05c' : '#f2f0e9'
    g.fillText(w, x, 136)
    g.fillStyle = 'rgba(242, 240, 233, 0.32)'
    g.fillText(sep, x + widths[i] + gap / 2 - sepW / 2, 136)
    x += widths[i] + gap
  })
  return c
}

function Poster() {
  const e = (media.stage as Record<string, { width: number; height: number; widths: number[] }>).drum
  if (!e) return null
  const set = (ext: string) => e.widths.map((w) => `${asset(`media/stage/drum-${w}.${ext}`)} ${w}w`).join(', ')
  return (
    <picture className="drum__poster">
      <source type="image/avif" srcSet={set('avif')} sizes="(max-width: 900px) 92vw, 56vw" />
      <source type="image/webp" srcSet={set('webp')} sizes="(max-width: 900px) 92vw, 56vw" />
      <img src={asset(`media/stage/drum-${e.widths[0]}.webp`)} alt="" width={e.width} height={e.height} loading="lazy" decoding="async" />
    </picture>
  )
}

export function TypeDrum() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = ref.current
    const canvas = root?.querySelector('canvas')
    if (!root || !canvas) return
    const posterMode = new URLSearchParams(location.search).get('stage') === 'poster'
    if (prefersReducedMotion() && !posterMode) return

    let raf = 0
    let visible = false
    let started = false
    let cancelled = false
    let resume: () => void = () => undefined
    const cleanup: (() => void)[] = []

    const start = async () => {
      const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, preserveDrawingBuffer: posterMode })
      if (!gl) return
      await document.fonts?.load("600 176px 'Geist Variable'").catch(() => undefined)
      if (cancelled) return
      const [drum, bg, floor] = await programs(gl, [
        [OBJ_VERT, DRUM_FRAG],
        [BG_VERT, BG_FRAG],
        [OBJ_VERT, FLOOR_FRAG],
      ])
      if (cancelled) return
      const quad = mesh(gl, screenQuad())
      const plane = mesh(gl, floorQuad(12))
      const top = ((BANDS.length - 1) * (BAND_H + GAP)) / 2
      const bands = BANDS.map((b, i) => {
        const tex = gl.createTexture()
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bandTexture(b.words, b.lime))
        gl.generateMipmap(gl.TEXTURE_2D)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        const aniso = gl.getExtension('EXT_texture_filter_anisotropic')
        if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8)
        return { tex, mesh: mesh(gl, band(top - i * (BAND_H + GAP), BAND_H)), dir: i % 2 ? -1 : 1 }
      })

      let aspect = 1
      const resize = () => {
        const r = canvas.getBoundingClientRect()
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        canvas.width = Math.max(2, Math.round(r.width * dpr))
        canvas.height = Math.max(2, Math.round(r.height * dpr))
        aspect = r.width / Math.max(1, r.height)
        gl.viewport(0, 0, canvas.width, canvas.height)
      }
      resize()
      const ro = new ResizeObserver(resize)
      ro.observe(canvas)
      cleanup.push(() => ro.disconnect())

      const target = { x: 0, y: 0 }
      const lean = { x: 0, y: 0 }
      const onMove = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return
        const r = root.getBoundingClientRect()
        target.x = ((e.clientX - r.left) / r.width) * 2 - 1
        target.y = ((e.clientY - r.top) / r.height) * 2 - 1
      }
      const onLeave = () => {
        target.x = 0
        target.y = 0
      }
      if (!posterMode && hasFinePointer()) {
        root.addEventListener('pointermove', onMove, { passive: true })
        root.addEventListener('pointerleave', onLeave)
        cleanup.push(() => root.removeEventListener('pointermove', onMove), () => root.removeEventListener('pointerleave', onLeave))
      }

      const t0 = performance.now()
      const draw = (now: number) => {
        raf = 0
        const t = posterMode ? 2.4 : (now - t0) / 1000 // the poster: every band at rest after the first step
        lean.x += (target.x - lean.x) * 0.05
        lean.y += (target.y - lean.y) * 0.05
        const r = root.getBoundingClientRect()
        const pass = posterMode ? 0 : (r.top + r.height / 2 - window.innerHeight / 2) / window.innerHeight

        const dist = 6.3 * Math.max(1, 1.45 / aspect)
        const yaw = lean.x * 0.12
        const pitch = 0.2 + lean.y * 0.05
        const centre: Vec3 = [0, -0.05, 0]
        const eye: Vec3 = [Math.sin(yaw) * Math.cos(pitch) * dist, centre[1] + Math.sin(pitch) * dist, Math.cos(yaw) * Math.cos(pitch) * dist]
        const view = mat4.lookAt(eye, centre)
        const proj = mat4.perspective(0.48, aspect, 0.1, 40)
        proj[9] = 0.04

        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
        gl.disable(gl.DEPTH_TEST)
        gl.clearColor(...STAGE.bg, 1)
        gl.clear(gl.COLOR_BUFFER_BIT)

        gl.useProgram(bg.p)
        gl.uniform3fv(bg.u('uBg'), STAGE.bg)
        gl.bindVertexArray(quad.vao)
        gl.drawArrays(gl.TRIANGLES, 0, quad.count)

        // the beat: steps counted from the start, each band moving a little after the one above it
        const turnOf = (i: number) => {
          const local = t - i * 0.12
          const beats = Math.floor(local / BEAT)
          const within = Math.min(1, Math.max(0, (local - beats * BEAT) / MOVE))
          return (beats + ease.inOutQuart(within)) * STEP + pass * 0.5
        }

        const drawDrum = (mirror: boolean) => {
          gl.useProgram(drum.p)
          gl.uniformMatrix4fv(drum.u('uProj'), false, proj)
          gl.uniformMatrix4fv(drum.u('uView'), false, view)
          gl.uniformMatrix4fv(drum.u('uModel'), false, mat4.identity())
          gl.uniform3fv(drum.u('uEye'), eye)
          gl.uniform3fv(drum.u('uLight'), STAGE.light)
          gl.uniform3fv(drum.u('uBg'), STAGE.bg)
          gl.uniform1f(drum.u('uMirror'), mirror ? 1 : 0)
          gl.uniform1f(drum.u('uFloorY'), FLOOR_Y)
          gl.uniform1i(drum.u('uTex'), 0)
          gl.enable(gl.CULL_FACE)
          // far side first (seen through the drum), then the near side
          // culling front faces leaves the inside of the far wall; culling back faces, the outside of the near one
          for (const [face, inside] of [[gl.FRONT, 1], [gl.BACK, 0]] as const) {
            gl.cullFace(mirror ? (face === gl.BACK ? gl.FRONT : gl.BACK) : face)
            gl.uniform1f(drum.u('uInside'), inside)
            bands.forEach((b, i) => {
              gl.activeTexture(gl.TEXTURE0)
              gl.bindTexture(gl.TEXTURE_2D, b.tex)
              gl.uniform1f(drum.u('uTurn'), (b.dir * turnOf(i)) / (Math.PI * 2))
              gl.bindVertexArray(b.mesh.vao)
              gl.drawArrays(gl.TRIANGLES, 0, b.mesh.count)
            })
          }
          gl.disable(gl.CULL_FACE)
        }

        drawDrum(true)
        gl.useProgram(floor.p)
        gl.uniformMatrix4fv(floor.u('uProj'), false, proj)
        gl.uniformMatrix4fv(floor.u('uView'), false, view)
        gl.uniformMatrix4fv(floor.u('uModel'), false, mat4.model([0, FLOOR_Y, 0]))
        gl.uniform1f(floor.u('uMirror'), 0)
        gl.uniform3fv(floor.u('uEye'), eye)
        gl.uniform3fv(floor.u('uBg'), STAGE.bg)
        gl.uniform3f(floor.u('uPool'), 0, 0, 1.8)
        gl.uniform4fv(floor.u('uShadows'), new Float32Array([0, 0, RADIUS * 0.8, 0]))
        gl.uniform2fv(floor.u('uShadowSize'), new Float32Array([RADIUS * 0.8, 0.28]))
        gl.uniform1i(floor.u('uShadowCount'), 1)
        gl.bindVertexArray(plane.vao)
        gl.drawArrays(gl.TRIANGLES, 0, plane.count)
        drawDrum(false)

        root.dataset.live = 'true'
        if (posterMode) document.documentElement.dataset.drumReady = 'true'
        if (!posterMode && visible && !document.hidden) raf = requestAnimationFrame(draw)
      }
      resume = () => {
        if (!raf && visible && !document.hidden) raf = requestAnimationFrame(draw)
      }
      document.addEventListener('visibilitychange', resume)
      cleanup.push(() => document.removeEventListener('visibilitychange', resume))
      raf = requestAnimationFrame(draw)
    }

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting
        if (visible && !started) {
          started = true
          start().catch(() => delete root.dataset.live)
        } else resume()
      },
      { rootMargin: '20% 0px' },
    )
    io.observe(root)
    if (posterMode) {
      visible = true
      started = true
      start()
    }

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      io.disconnect()
      cleanup.forEach((f) => f())
    }
  }, [])

  return (
    <div className="drum" ref={ref}>
      <Poster />
      <canvas className="drum__canvas" aria-hidden="true" />
      <p className="drum__label" aria-hidden="true">
        <span>Kinetic type study</span>
        <span>Real-time WebGL</span>
      </p>
    </div>
  )
}

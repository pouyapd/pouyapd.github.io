import { useEffect, useRef } from 'react'
import { asset } from '../../app/paths'
import media from '../../content/generated/media.json'
import { hasFinePointer, prefersReducedMotion } from '../motion/media'
import { BG_FRAG, BG_VERT, ease, FLOOR_FRAG, floorQuad, GLSL_STAGE, mat4, mesh, nextFrame, OBJ_VERT, programs, roundedSlab, screenQuad, STAGE, type Vec3 } from './gl'

/**
 * Selected Work's opening: the three concept websites as physical screens,
 * standing in a receding cascade above a dark lacquered floor. Real geometry
 * and light (WebGL2, no library): glass fronts reflect a soft overhead light,
 * graphite edges catch the key light, each screen casts a contact shadow and
 * is mirrored in the floor. The pages inside scroll in a calm "browse, pause"
 * rhythm.
 *
 *   idle      the camera drifts very slowly
 *   pointer   the camera leans towards the mouse (a few degrees, eased)
 *   scroll    the cascade opens as the band comes into view
 *
 * It starts only when the band nears the screen. A still frame of this scene
 * (scripts/posters.mjs) is shown until then, and stays for reduced motion,
 * no WebGL2 or no JavaScript. `?stage=poster` renders the fixed frame.
 */

const W = 1.6
const H = 1.0
const BEZEL = 0.024
const FLOOR_Y = -0.66

interface Screen {
  preview: string
  lightUi: boolean
  pos: Vec3
  yaw: number
  phase: number
}

const SCREENS: Screen[] = [
  { preview: 'anar', lightUi: false, pos: [1.62, 0.3, -1.62], yaw: -0.38, phase: 2.6 },
  { preview: 'maison-aurel', lightUi: false, pos: [0.72, 0.16, -0.78], yaw: -0.38, phase: 1.3 },
  { preview: 'lune', lightUi: true, pos: [-0.2, 0.02, 0.06], yaw: -0.38, phase: 0 },
]

const SCREEN_FRAG = /* glsl */ `#version 300 es
precision highp float;
${GLSL_STAGE}
uniform sampler2D uTex;
uniform float uScroll;
uniform float uVh;
uniform vec2 uSize;
uniform float uBezel;
uniform float uLightUi;
uniform float uMirror;
uniform float uFloorY;
in vec3 vWorld;
in vec3 vNormal;
in vec2 vUv;
in float vPart;
out vec4 o;
float sdRound(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(uEye - vWorld);
  vec3 L = normalize(uLight);
  vec3 Hh = normalize(L + V);
  float ndl = max(dot(N, L), 0.0);
  float ndh = max(dot(N, Hh), 0.0);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  vec3 R = reflect(-V, N);
  float fres = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
  vec3 c;
  if (vPart < 0.5) {
    vec2 p = (vUv - 0.5) * uSize;
    p.y = -p.y;
    vec2 inner = uSize * 0.5 - uBezel;
    float d = sdRound(p, inner, 0.022);
    vec2 iuv = (p + inner) / (2.0 * inner);
    iuv.y = 1.0 - iuv.y;
    float bar = 0.052 / (2.0 * inner.y);
    vec3 scr;
    if (iuv.y < bar) {
      vec3 barC = uLightUi > 0.5 ? vec3(0.905, 0.89, 0.865) : vec3(0.1, 0.11, 0.125);
      vec3 dotC = uLightUi > 0.5 ? vec3(0.72, 0.7, 0.67) : vec3(0.26, 0.28, 0.31);
      vec3 pillC = uLightUi > 0.5 ? vec3(0.845, 0.83, 0.8) : vec3(0.15, 0.165, 0.185);
      float dx = iuv.x * 2.0 * inner.x;
      float dy = (iuv.y - bar * 0.5) * 2.0 * inner.y;
      float dots = 0.0;
      for (int i = 0; i < 3; i++) dots = max(dots, 1.0 - smoothstep(0.0065, 0.0095, length(vec2(dx - 0.032 - float(i) * 0.026, dy))));
      float pill = 1.0 - smoothstep(-0.002, 0.002, sdRound(vec2((iuv.x - 0.5) * 2.0 * inner.x, dy), vec2(0.21, 0.012), 0.012));
      scr = mix(mix(barC, pillC, pill), dotC, dots);
    } else {
      float v = (iuv.y - bar) / (1.0 - bar);
      scr = texture(uTex, vec2(iuv.x, uScroll + v * uVh)).rgb;
    }
    // glass: the overhead light, mostly at grazing angles, and a very faint sheen
    vec3 glass = scr + softbox(R) * fres * 0.22;
    vec3 bez = vec3(0.03, 0.033, 0.038) + softbox(R) * fres * 0.55 + pow(ndh, 90.0) * 0.22;
    float aa = fwidth(d) * 1.2;
    c = mix(glass, bez, smoothstep(-aa, aa, d));
  } else {
    // graphite edges and back
    vec3 base = vec3(0.1, 0.106, 0.116);
    c = base * (0.22 + 0.78 * ndl) + pow(ndh, 48.0) * 0.32 + softbox(R) * fres * 0.22;
  }
  c = fogged(c, vWorld, 0.07);
  float a = 1.0;
  if (uMirror > 0.5) a = 0.34 * exp(-(uFloorY - vWorld.y) * 1.8);
  o = vec4(c, a);
}`

/** A screen's texture: the top of its concept page (media.json → stage: screen-<name>), smaller on small screens. */
function screenTexture(name: string, small: boolean) {
  const e = (media.stage as Record<string, { widths: number[] }>)[`screen-${name}`]
  if (!e) return null
  const w = small ? e.widths[0] : e.widths[e.widths.length - 1]
  return asset(`media/stage/screen-${name}-${w}.avif`)
}

/** Content scroll for one screen: browse down four screens, pausing at each, then glide back to the top. */
function scrollAt(t: number, phase: number) {
  const hold = 2.6
  const move = 1.5
  const steps = 4
  const cycle = steps * (hold + move) + 2.4
  const k = (t + phase) % cycle
  const stepLen = hold + move
  const i = Math.floor(k / stepLen)
  if (i >= steps) return steps * (1 - ease.inOutCubic(Math.min(1, (k - steps * stepLen) / 2.4)))
  const local = k - i * stepLen
  return i + (local < hold ? 0 : ease.inOutCubic((local - hold) / move))
}

export function ScreensStage() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const root = canvas?.closest<HTMLElement>('[data-stage-root]')
    if (!canvas || !root) return
    const posterMode = new URLSearchParams(location.search).get('stage') === 'poster'
    if (prefersReducedMotion() && !posterMode) return
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: posterMode })
    if (!gl) return

    let cancelled = false
    let raf = 0
    let visible = true
    const cleanup: (() => void)[] = []

    const start = async () => {
      const small = window.innerWidth < 900
      const sources = SCREENS.map((s) => screenTexture(s.preview, small))
      if (sources.some((src) => !src)) return
      // decoded off the main thread; each file is already just the part of the page the loop shows
      const bitmaps = await Promise.all(
        sources.map(async (src) => {
          const img = new Image()
          img.src = src!
          await img.decode()
          return { bmp: await createImageBitmap(img), rows: img.naturalHeight, width: img.naturalWidth }
        }),
      )
      if (cancelled) return

      const [bg, obj, floor] = await programs(gl, [
        [BG_VERT, BG_FRAG],
        [OBJ_VERT, SCREEN_FRAG],
        [OBJ_VERT, FLOOR_FRAG],
      ])
      if (cancelled) return
      const slab = mesh(gl, roundedSlab(W, H, 0.042, 0.05))
      const quad = mesh(gl, screenQuad())
      const plane = mesh(gl, floorQuad(60))
      const aniso = gl.getExtension('EXT_texture_filter_anisotropic')
      // one texture per frame, so no single task holds the page
      const textures: WebGLTexture[] = []
      for (const { bmp } of bitmaps) {
        await nextFrame()
        if (cancelled) return
        const t = gl.createTexture()!
        gl.bindTexture(gl.TEXTURE_2D, t)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bmp)
        gl.generateMipmap(gl.TEXTURE_2D)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, 8)
        bmp.close()
        textures.push(t)
      }
      // the visible part of each page, as a fraction of its texture
      const vh = bitmaps.map(({ rows, width }) => (width * (H - 2 * BEZEL - 0.052) / (W - 2 * BEZEL)) / rows)

      let aspect = 1
      let portrait = false
      const resize = () => {
        const r = canvas.getBoundingClientRect()
        const dpr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(3.4e6 / Math.max(1, r.width * r.height)))
        canvas.width = Math.max(2, Math.round(r.width * dpr))
        canvas.height = Math.max(2, Math.round(r.height * dpr))
        aspect = r.width / Math.max(1, r.height)
        portrait = aspect < 1.25
        gl.viewport(0, 0, canvas.width, canvas.height)
      }
      resize()
      const ro = new ResizeObserver(resize)
      ro.observe(canvas)
      cleanup.push(() => ro.disconnect())

      const pointer = !posterMode && hasFinePointer()
      const target = { x: 0, y: 0 }
      const lean = { x: 0, y: 0 }
      const onPointer = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return
        const r = root.getBoundingClientRect()
        target.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1))
        target.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1))
      }
      if (pointer) {
        window.addEventListener('pointermove', onPointer, { passive: true })
        cleanup.push(() => window.removeEventListener('pointermove', onPointer))
      }

      const t0 = performance.now()
      let first = true
      const draw = (now: number) => {
        raf = 0
        const t = posterMode ? 0 : (now - t0) / 1000
        lean.x += (target.x - lean.x) * 0.045
        lean.y += (target.y - lean.y) * 0.045
        const rect = root.getBoundingClientRect()
        // the cascade opens as the band rises into view
        const p = posterMode ? 0.5 : Math.min(1, Math.max(0, (window.innerHeight - rect.top) / (window.innerHeight * 0.9)))
        const open = ease.inOutCubic(p) * 0.6

        // camera: orbit around the cascade's centre; further back on narrow screens so all three fit
        const centre: Vec3 = [0.72, 0.12, -0.78]
        const dist = portrait ? 6.2 * Math.max(1, 0.95 / aspect) : 5.15 * Math.max(1, 2.1 / aspect)
        const yaw = -0.6 + Math.sin(t * 0.07) * 0.035 + lean.x * 0.075 - open * 0.12
        const pitch = 0.2 + Math.cos(t * 0.05) * 0.012 + lean.y * 0.035 + open * 0.04
        const eye: Vec3 = [centre[0] + Math.sin(yaw) * Math.cos(pitch) * dist, centre[1] + Math.sin(pitch) * dist, centre[2] + Math.cos(yaw) * Math.cos(pitch) * dist]
        const view = mat4.lookAt(eye, centre)
        const proj = mat4.perspective(0.44, aspect, 0.1, 40)
        // lens shift: the cascade a little low in the band
        proj[8] = portrait ? -0.1 : -0.08
        proj[9] = portrait ? 0.08 : -0.22

        gl.disable(gl.DEPTH_TEST)
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
        gl.clearColor(...STAGE.bg, 1)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

        // 1. background
        gl.useProgram(bg.p)
        gl.uniform3fv(bg.u('uBg'), STAGE.bg)
        gl.bindVertexArray(quad.vao)
        gl.drawArrays(gl.TRIANGLES, 0, quad.count)

        const models = SCREENS.map((s, i) => {
          const spread = 1 + open * 0.55
          const float = posterMode ? 0 : Math.sin(t * 0.5 + i * 1.7) * 0.012
          const pos: Vec3 = [s.pos[0] * spread - open * 0.15, s.pos[1] + float, s.pos[2] * spread]
          return { s, i, pos, m: mat4.model(pos, s.yaw - open * 0.1) }
        })

        const drawScreens = (mirror: boolean) => {
          gl.useProgram(obj.p)
          gl.uniformMatrix4fv(obj.u('uProj'), false, proj)
          gl.uniformMatrix4fv(obj.u('uView'), false, view)
          gl.uniform3fv(obj.u('uEye'), eye)
          gl.uniform3fv(obj.u('uLight'), STAGE.light)
          gl.uniform3fv(obj.u('uBg'), STAGE.bg)
          gl.uniform1f(obj.u('uMirror'), mirror ? 1 : 0)
          gl.uniform1f(obj.u('uFloorY'), FLOOR_Y)
          gl.uniform2f(obj.u('uSize'), W, H)
          gl.uniform1f(obj.u('uBezel'), BEZEL)
          gl.uniform1i(obj.u('uTex'), 0)
          gl.bindVertexArray(slab.vao)
          for (const { s, i, m } of models) {
            gl.activeTexture(gl.TEXTURE0)
            gl.bindTexture(gl.TEXTURE_2D, textures[i])
            // four screens of browsing, compressed if a page is shorter than that
            const room = Math.min(4, (1 - vh[i]) / vh[i])
            gl.uniform1f(obj.u('uScroll'), (posterMode ? 0 : scrollAt(t, s.phase)) * vh[i] * (room / 4))
            gl.uniform1f(obj.u('uVh'), vh[i])
            gl.uniform1f(obj.u('uLightUi'), s.lightUi ? 1 : 0)
            gl.uniformMatrix4fv(obj.u('uModel'), false, m)
            gl.drawArrays(gl.TRIANGLES, 0, slab.count)
          }
        }

        // 2. reflections, then the floor over them
        gl.enable(gl.DEPTH_TEST)
        drawScreens(true)
        gl.disable(gl.DEPTH_TEST)
        gl.useProgram(floor.p)
        gl.uniformMatrix4fv(floor.u('uProj'), false, proj)
        gl.uniformMatrix4fv(floor.u('uView'), false, view)
        gl.uniformMatrix4fv(floor.u('uModel'), false, mat4.model([0, FLOOR_Y, 0]))
        gl.uniform1f(floor.u('uMirror'), 0)
        gl.uniform3fv(floor.u('uEye'), eye)
        gl.uniform3fv(floor.u('uBg'), STAGE.bg)
        gl.uniform3f(floor.u('uPool'), 0.6, -0.6, 2.4)
        const shadows: number[] = []
        const sizes: number[] = []
        for (const { s, pos } of models) {
          const lift = pos[1] - H / 2 - FLOOR_Y
          shadows.push(pos[0], pos[2], W / 2, -(s.yaw - open * 0.1))
          sizes.push(0.06 + lift * 0.35, 0.55 * Math.exp(-lift * 2.2))
        }
        gl.uniform4fv(floor.u('uShadows'), new Float32Array(shadows))
        gl.uniform2fv(floor.u('uShadowSize'), new Float32Array(sizes))
        gl.uniform1i(floor.u('uShadowCount'), models.length)
        gl.bindVertexArray(plane.vao)
        gl.drawArrays(gl.TRIANGLES, 0, plane.count)

        // 3. the screens
        gl.clear(gl.DEPTH_BUFFER_BIT)
        gl.enable(gl.DEPTH_TEST)
        drawScreens(false)

        if (first) {
          first = false
          root.classList.add('is-live')
          if (posterMode) document.documentElement.dataset.screensReady = 'true'
        }
        if (!posterMode && visible && !document.hidden) raf = requestAnimationFrame(draw)
      }
      const resume = () => {
        if (!raf && visible && !document.hidden) raf = requestAnimationFrame(draw)
      }
      const io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting
        resume()
      })
      io.observe(root)
      document.addEventListener('visibilitychange', resume)
      cleanup.push(() => io.disconnect(), () => document.removeEventListener('visibilitychange', resume))
      canvas.addEventListener('webglcontextlost', () => {
        cancelAnimationFrame(raf)
        raf = 0
        visible = false
        root.classList.remove('is-live')
      })
      resume()
    }

    // the still shows first; the renderer starts when the band is about a screen away
    let launched = false
    const go = () => {
      if (launched || cancelled) return
      launched = true
      start().catch(() => root.classList.remove('is-live'))
    }
    if (posterMode) go()
    else {
      // after the page has loaded, and only once the band is about half a screen away
      const watch = () => {
        const near = new IntersectionObserver(
          ([e]) => {
            if (!e.isIntersecting) return
            near.disconnect()
            if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 1500 })
            else setTimeout(go, 200)
          },
          { rootMargin: '50% 0px' },
        )
        near.observe(root)
        cleanup.push(() => near.disconnect())
      }
      if (document.readyState === 'complete') watch()
      else {
        window.addEventListener('load', watch, { once: true })
        cleanup.push(() => window.removeEventListener('load', watch))
      }
    }

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      cleanup.forEach((f) => f())
      root.classList.remove('is-live')
    }
  }, [])

  return <canvas ref={ref} className="stage-canvas" aria-hidden="true" />
}

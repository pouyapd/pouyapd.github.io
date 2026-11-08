import { useEffect, useRef } from 'react'
import { hasFinePointer, prefersReducedMotion } from '../motion/media'
import { mat4, mesh, nextFrame, norm, programs, screenQuad, type Mat4, type Vec3 } from '../stage/gl'
import { box, figure, ribbon, rocks, sea, slab, sphere, type Slab } from './scene/geometry'
import { CLOUD_FRAG, GLOW_FRAG, NOISE_FRAG, OBJ_FRAG, OBJ_VERT, QUAD_VERT, RING_FRAG, RING_VERT, SKY_FRAG, WATER_FRAG, WATER_VERT } from './scene/shaders'

/**
 * The hero: a monumental slab, pierced by a tall arch, standing in a calm sea
 * at dusk. A pale sphere is set into its side; a thin orbit sweeps around it,
 * slowly precessing, with a run of light travelling along it. The low sun
 * shines through the arch onto a causeway, where one figure stands for scale.
 *
 * Real geometry and light (WebGL2, no library, no images): the sky and its
 * clouds are computed into a texture that drifts very slowly; the sea mirrors
 * the scene through a rippled reflection pass; the sun's light is traced past
 * the slab, so only what the arch lets through is lit.
 *
 *   idle      the orbit precesses and its light travels; clouds and swell drift
 *   pointer   the camera shifts a little (true parallax between near and far)
 *   scroll    the camera rises and moves towards the arch as the hero leaves
 *
 * A still of this exact scene (scripts/posters.mjs, `?stage=poster`) is the
 * first paint and the fallback: reduced motion, no WebGL2 or no JavaScript
 * keep the still.
 */

const SLAB: Slab = { w: 11, h: 33, d: 4.6, ax: -0.35, aw: 3.15, ay: 22.5 }
const SLAB_POS: Vec3 = [18, 0, -95]
const SLAB_YAW = -0.78
const MOON = { pos: [-SLAB.w / 2 + 0.9, 18.6, SLAB.d / 2 + 1.4] as Vec3, r: 6.1 }
const RING = { centre: [0, 19.5, 0] as Vec3, r: 15.5, lean: 0.34, tilt: 0.36, phase: 3.3, period: 40, glint: 8 }
const SUN = { az: 12.3, el: 4.2 }

const deg = Math.PI / 180

/**
 * Clouds, far to near: azimuth (degrees), distance, base height, radius,
 * height (metres) · seed, density, noise scale (billow size per height).
 */
const HEAPS: [number, number, number, number, number, number, number, number][] = [
  [-41, 3000, 10, 230, 70, 1.1, 1.0, 1.4],
  [37, 3000, 30, 260, 80, 11.7, 0.9, 1.4],
  [-30, 2600, 12, 260, 85, 2.3, 1.0, 1.4],
  [15, 2600, 40, 140, 55, 12.3, 0.85, 1.4],
  [-3, 2400, 10, 140, 50, 4.2, 0.9, 1.4],
  [-17, 2600, 8, 150, 45, 3.1, 0.95, 1.4],
  [-27, 2100, 12, 200, 80, 3.7, 1.0, 1.2],
  [22, 1300, 60, 85, 45, 10.1, 0.9, 1.2],
  [27, 1000, 120, 80, 60, 9.4, 1.0, 1.0],
  [19.5, 900, 140, 100, 100, 8.8, 1.0, 1.0],
  [10.5, 420, 58, 18, 12, 6.1, 0.9, 1.0],
  [10, 380, 88, 17, 10, 7.3, 0.85, 1.0],
]
const SKY_MAP: [number, number, number, number] = [-48 * deg, 52 * deg, 50 * deg, 0.55]

const sunDir = norm([Math.sin(SUN.az * deg) * Math.cos(SUN.el * deg), Math.sin(SUN.el * deg), -Math.cos(SUN.az * deg) * Math.cos(SUN.el * deg)])

function invertYawTranslate(t: Vec3, yaw: number): Mat4 {
  const c = Math.cos(yaw)
  const s = Math.sin(yaw)
  // inverse of translate(t) · rotateY(yaw)
  const m = mat4.identity()
  m.set([c, 0, s, 0, 0, 1, 0, 0, -s, 0, c, 0, -(c * t[0] - s * t[2]), -t[1], -(s * t[0] + c * t[2]), 1])
  return m
}
const slabModel = mat4.model(SLAB_POS, SLAB_YAW)
const slabInv = invertYawTranslate(SLAB_POS, SLAB_YAW)
const toWorld = (p: Vec3): Vec3 => {
  const c = Math.cos(SLAB_YAW)
  const s = Math.sin(SLAB_YAW)
  return [SLAB_POS[0] + c * p[0] + s * p[2], SLAB_POS[1] + p[1], SLAB_POS[2] - s * p[0] + c * p[2]]
}

/** the causeway runs from in front of the camera to the foot of the arch; the figure stands on it */
const archFoot = toWorld([SLAB.ax, 0, SLAB.d / 2])
const FIGURE_AT: Vec3 = [2.3, 0.22, -33]
const causeway = (() => {
  const dx = archFoot[0] - FIGURE_AT[0]
  const dz = archFoot[2] - FIGURE_AT[2]
  const yaw = Math.atan2(dx, dz)
  const far = Math.hypot(dx, dz) - 0.2
  const near = 40
  const len = far + near
  const mid = (far - near) / 2
  const ux = dx / Math.hypot(dx, dz)
  const uz = dz / Math.hypot(dx, dz)
  return { yaw, len, centre: [FIGURE_AT[0] + ux * mid, 0, FIGURE_AT[2] + uz * mid] as Vec3, faceYaw: yaw + Math.PI }
})()

function spinMatrix(t: number) {
  // the sphere turns slowly about a tilted axis
  const a = t * 0.035
  const c = Math.cos(a)
  const s = Math.sin(a)
  const tilt = 0.4
  const ct = Math.cos(tilt)
  const st = Math.sin(tilt)
  // Rz(tilt) · Ry(a)
  return new Float32Array([c * ct, c * st, -s, -st, ct, 0, s * ct, s * st, c])
}

/**
 * The orbit at time t: its centre and two radius vectors spanning its plane.
 * Its axis precesses around a cone that leans towards the camera, so the
 * orbit keeps sweeping round the slab but never turns edge-on.
 */
function ringAt(t: number) {
  const c = toWorld(RING.centre)
  const toEye = norm([-c[0], 0, -c[2]])
  const lean = RING.lean
  const axis: Vec3 = [toEye[0] * Math.sin(lean), Math.cos(lean), toEye[2] * Math.sin(lean)]
  const e1 = norm([toEye[2], 0, -toEye[0]])
  const e2: Vec3 = [axis[1] * e1[2] - axis[2] * e1[1], axis[2] * e1[0] - axis[0] * e1[2], axis[0] * e1[1] - axis[1] * e1[0]]
  const phi = RING.phase + (t / RING.period) * Math.PI * 2
  const a = RING.tilt + Math.sin(t * 0.11) * 0.04
  const ca = Math.cos(a)
  const sa = Math.sin(a)
  const n = norm([0, 1, 2].map((k) => axis[k] * ca + (e1[k] * Math.cos(phi) + e2[k] * Math.sin(phi)) * sa) as Vec3)
  // line of nodes (horizontal), then the vector up the slope of the plane
  const u = norm([n[2], 0, -n[0]])
  const v: Vec3 = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]]
  return {
    c,
    u: u.map((x) => x * RING.r) as Vec3,
    v: v.map((x) => x * RING.r) as Vec3,
    glint: ((t / RING.glint) * Math.PI * 2) % (Math.PI * 2),
  }
}

type Prog = Awaited<ReturnType<typeof programs>>[number]

export function HeroScene({ portraitQuery }: { portraitQuery: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const root = canvas?.closest<HTMLElement>('.hero')
    if (!canvas || !root) return
    const params = new URLSearchParams(location.search)
    const posterMode = params.get('stage') === 'poster'
    const fixedT = params.has('t') ? Number(params.get('t')) : posterMode ? 0 : null
    if (prefersReducedMotion() && !posterMode) return
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: posterMode })
    if (!gl) return

    let cancelled = false
    let raf = 0
    let visible = true
    const cleanup: (() => void)[] = []

    const start = async () => {
      const small = window.matchMedia(portraitQuery).matches || window.innerWidth < 900
      const [noiseP, skyP, cloudP, objP, waterP, ringP, glowP] = await programs(gl, [
        [QUAD_VERT, NOISE_FRAG],
        [QUAD_VERT, SKY_FRAG],
        [QUAD_VERT, CLOUD_FRAG],
        [OBJ_VERT, OBJ_FRAG],
        [WATER_VERT, WATER_FRAG],
        [RING_VERT, RING_FRAG],
        [QUAD_VERT, GLOW_FRAG],
      ])
      if (cancelled) return
      await nextFrame()
      const quad = mesh(gl, screenQuad())
      const meshes = {
        slab: mesh(gl, slab(SLAB)),
        moon: mesh(gl, sphere(MOON.r, small ? 48 : 72, small ? 96 : 128)),
        causeway: mesh(gl, box(2.3, -0.6, 0.22, causeway.len)),
        figure: mesh(gl, figure()),
        rocks: mesh(gl, rocks(SLAB.w / 2 - 1.2, SLAB.w / 2 + 14, -7, 6, [SLAB.w / 2 + 0.4, -0.5, 6.2])),
        ring: mesh(gl, ribbon(small ? 480 : 900)),
        sea: mesh(gl, sea()),
      }
      await nextFrame()
      if (cancelled) return

      // the noise volume the clouds are carved from, a few slices per frame
      const NOISE = small ? 64 : 96
      const noiseTex = gl.createTexture()!
      gl.bindTexture(gl.TEXTURE_3D, noiseTex)
      gl.texStorage3D(gl.TEXTURE_3D, 1, gl.RGBA8, NOISE, NOISE, NOISE)
      for (const k of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_3D, k, gl.REPEAT)
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      const noiseFb = gl.createFramebuffer()!
      gl.bindFramebuffer(gl.FRAMEBUFFER, noiseFb)
      gl.viewport(0, 0, NOISE, NOISE)
      gl.useProgram(noiseP.p)
      gl.uniform1f(noiseP.u('uSize'), NOISE)
      gl.bindVertexArray(quad.vao)
      for (let z = 0; z < NOISE; z++) {
        gl.framebufferTextureLayer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, noiseTex, 0, z)
        gl.uniform1f(noiseP.u('uSlice'), z)
        gl.drawArrays(gl.TRIANGLES, 0, quad.count)
        if (z % 16 === 15 && !posterMode) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, null)
          await nextFrame()
          if (cancelled) return
          gl.bindFramebuffer(gl.FRAMEBUFFER, noiseFb)
          gl.viewport(0, 0, NOISE, NOISE)
          gl.useProgram(noiseP.p)
          gl.bindVertexArray(quad.vao)
        }
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)

      // the cloud layer: direction-space texture, refreshed a strip at a time
      const half = Boolean(gl.getExtension('EXT_color_buffer_float'))
      const cloudW = small ? 1280 : 2560
      const cloudH = small ? 512 : 1024
      const cloudTex = gl.createTexture()!
      gl.bindTexture(gl.TEXTURE_2D, cloudTex)
      gl.texStorage2D(gl.TEXTURE_2D, Math.floor(Math.log2(Math.max(cloudW, cloudH))) + 1, half ? gl.RGBA16F : gl.RGBA8, cloudW, cloudH)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      const cloudFb = gl.createFramebuffer()!
      gl.bindFramebuffer(gl.FRAMEBUFFER, cloudFb)
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, cloudTex, 0)
      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      const STRIPS = 32
      let strip = 0

      // the reflection: the scene mirrored in the sea, at half resolution
      const reflTex = gl.createTexture()!
      const reflDepth = gl.createRenderbuffer()!
      const reflFb = gl.createFramebuffer()!
      let reflW = 0
      let reflH = 0
      const sizeReflection = (w: number, h: number) => {
        reflW = Math.max(2, Math.round(w / 2))
        reflH = Math.max(2, Math.round(h / 2))
        gl.bindTexture(gl.TEXTURE_2D, reflTex)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, reflW, reflH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.bindRenderbuffer(gl.RENDERBUFFER, reflDepth)
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, reflW, reflH)
        gl.bindFramebuffer(gl.FRAMEBUFFER, reflFb)
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, reflTex, 0)
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, reflDepth)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      }

      let aspect = 1
      let portrait = false
      let dprCap = small ? 1.5 : 2
      const resize = () => {
        const r = canvas.getBoundingClientRect()
        const dpr = Math.min(window.devicePixelRatio || 1, dprCap, Math.sqrt((small ? 2.2e6 : 4.2e6) / Math.max(1, r.width * r.height)))
        canvas.width = Math.max(2, Math.round(r.width * dpr))
        canvas.height = Math.max(2, Math.round(r.height * dpr))
        aspect = r.width / Math.max(1, r.height)
        portrait = window.matchMedia(portraitQuery).matches
        sizeReflection(canvas.width, canvas.height)
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
        target.x = (e.clientX / window.innerWidth) * 2 - 1
        target.y = (e.clientY / window.innerHeight) * 2 - 1
      }
      if (pointer) {
        window.addEventListener('pointermove', onPointer, { passive: true })
        cleanup.push(() => window.removeEventListener('pointermove', onPointer))
      }

      const heapA = new Float32Array(HEAPS.flatMap(([az, dist, base, r]) => [Math.sin(az * deg) * dist, -Math.cos(az * deg) * dist, r, base]))
      const heapB = new Float32Array(HEAPS.flatMap((h) => [h[4], h[5], h[6], h[7]]))
      const monoDim = [SLAB.w, SLAB.h, SLAB.d, SLAB.aw] as const

      const common = (p: Prog, eye: Vec3, t: number) => {
        gl.useProgram(p.p)
        gl.uniform3fv(p.u('uSun'), sunDir)
        gl.uniform3fv(p.u('uEye'), eye)
        gl.uniform1f(p.u('uTime'), t)
        gl.uniform4fv(p.u('uSkyMap'), SKY_MAP)
        gl.uniformMatrix4fv(p.u('uMonoInv'), false, slabInv)
        gl.uniform4fv(p.u('uMono'), monoDim)
        gl.uniform2f(p.u('uArch'), SLAB.ax, SLAB.ay)
        gl.uniform1i(p.u('uClouds'), 0)
        gl.uniform1f(p.u('uCloudEnc'), half ? 0 : 1)
      }

      /** renders `count` strips of the cloud layer (the next ones in turn), then refreshes its mipmaps */
      const renderClouds = (t: number, count: number) => {
        gl.bindFramebuffer(gl.FRAMEBUFFER, cloudFb)
        gl.viewport(0, 0, cloudW, cloudH)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, null)
        gl.activeTexture(gl.TEXTURE2)
        gl.bindTexture(gl.TEXTURE_3D, noiseTex)
        gl.disable(gl.DEPTH_TEST)
        gl.disable(gl.BLEND)
        gl.enable(gl.SCISSOR_TEST)
        common(cloudP, [0, 0, 0], t)
        gl.uniform1i(cloudP.u('uNoise'), 2)
        gl.uniform4fv(cloudP.u('uHeapA'), heapA)
        gl.uniform4fv(cloudP.u('uHeapB'), heapB)
        gl.bindVertexArray(quad.vao)
        const rows = Math.ceil(cloudH / STRIPS)
        for (let k = 0; k < count; k++) {
          gl.scissor(0, strip * rows, cloudW, rows)
          gl.drawArrays(gl.TRIANGLES, 0, quad.count)
          strip = (strip + 1) % STRIPS
        }
        gl.disable(gl.SCISSOR_TEST)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, cloudTex)
        gl.generateMipmap(gl.TEXTURE_2D)
      }
      // the whole layer before the first frame: a few strips per frame, so loading never stalls
      if (posterMode) renderClouds(0, STRIPS)
      else
        for (let k = 0; k < STRIPS; k += 4) {
          renderClouds(fixedT ?? 0, 4)
          await nextFrame()
          if (cancelled) return
        }

      const t0 = performance.now()
      let first = true
      let frames = 0
      let slowFrames = 0
      let last = t0

      const draw = (now: number) => {
        raf = 0
        const t = fixedT ?? (now - t0) / 1000
        frames++
        // adapt: if the device struggles, draw fewer pixels
        if (!posterMode && frames > 20 && frames < 200) {
          if (now - last > 26) slowFrames++
          if (slowFrames > 40 && dprCap > 1) {
            dprCap = Math.max(1, dprCap - 0.5)
            slowFrames = 0
            resize()
          }
        }
        last = now
        lean.x += (target.x - lean.x) * 0.04
        lean.y += (target.y - lean.y) * 0.04
        const rect = root.getBoundingClientRect()
        const p = posterMode ? 0 : Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height)))

        // camera: eye height, pitch 0 (verticals stay vertical), framing by lens shift
        const drift = fixedT !== null && posterMode ? 0 : Math.sin(t * 0.045) * 0.5
        const eye: Vec3 = portrait
          ? [0.5 + drift * 0.5, 1.35 + p * 2.5, -10 - p * 6]
          : [lean.x * 1.7 + drift, 1.45 - lean.y * 0.3 + p * 3.0, -p * 12]
        const look: Vec3 = [eye[0] * 0.25 + lean.x * 0.6, eye[1], eye[2] - 100]
        const view = mat4.lookAt(eye, look)
        const fov = portrait ? 52 * deg : 30 * deg
        const proj = mat4.perspective(fov, aspect, 0.3, 12000)
        // where the slab's axis lands without a shift, then shift it to its place in the frame
        const axis = toWorld([0, SLAB.h * 0.5, 0])
        const vp = mat4.multiply(proj, view)
        const cx = (vp[0] * axis[0] + vp[4] * axis[1] + vp[8] * axis[2] + vp[12]) / (vp[3] * axis[0] + vp[7] * axis[1] + vp[11] * axis[2] + vp[15])
        // on narrower landscapes the slab moves further right, so the sphere never meets the headline
        const wantX = portrait ? 0.1 : aspect < 1.6 ? Math.min(0.56, 0.44 + (1.6 - aspect) * 0.4) : Math.min(0.5, 0.44 * (aspect / 1.6) ** 0.35)
        proj[8] = cx - wantX
        proj[9] = portrait ? 0.02 : 0.5
        const viewProj = mat4.multiply(proj, view)
        const ring = ringAt(t)

        if (!posterMode && fixedT === null) renderClouds(t, 1)

        const drawObjects = (mirror: boolean) => {
          common(objP, eye, t)
          gl.uniformMatrix4fv(objP.u('uProj'), false, proj)
          gl.uniformMatrix4fv(objP.u('uView'), false, view)
          gl.uniform1f(objP.u('uMirror'), mirror ? 1 : 0)
          gl.uniformMatrix3fv(objP.u('uSpin'), false, spinMatrix(t))
          gl.activeTexture(gl.TEXTURE0)
          gl.bindTexture(gl.TEXTURE_2D, cloudTex)
          const item = (m: { vao: WebGLVertexArrayObject; count: number }, model: Mat4, mat: number) => {
            gl.uniformMatrix4fv(objP.u('uModel'), false, model)
            gl.uniform1i(objP.u('uMat'), mat)
            gl.bindVertexArray(m.vao)
            gl.drawArrays(gl.TRIANGLES, 0, m.count)
          }
          item(meshes.slab, slabModel, 0)
          item(meshes.moon, mat4.model(toWorld(MOON.pos)), 1)
          item(meshes.causeway, mat4.model(causeway.centre, causeway.yaw), 2)
          item(meshes.figure, mat4.model(FIGURE_AT, causeway.faceYaw), 3)
          item(meshes.rocks, slabModel, 4)
        }
        const drawRing = (mirror: boolean, w: number, h: number) => {
          common(ringP, eye, t)
          gl.uniformMatrix4fv(ringP.u('uProj'), false, proj)
          gl.uniformMatrix4fv(ringP.u('uView'), false, view)
          gl.uniform3fv(ringP.u('uRingC'), ring.c)
          gl.uniform3fv(ringP.u('uRingU'), ring.u)
          gl.uniform3fv(ringP.u('uRingV'), ring.v)
          gl.uniform1f(ringP.u('uWidth'), Math.max(1, (canvas.width / Math.max(1, canvas.clientWidth)) * (mirror ? 0.9 : 1.35)))
          gl.uniform2f(ringP.u('uViewport'), w, h)
          gl.uniform1f(ringP.u('uMirror'), mirror ? 1 : 0)
          gl.uniform1f(ringP.u('uGlint'), ring.glint)
          gl.enable(gl.BLEND)
          gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
          gl.depthMask(false)
          gl.bindVertexArray(meshes.ring.vao)
          gl.drawArrays(gl.TRIANGLES, 0, meshes.ring.count)
          gl.depthMask(true)
          gl.disable(gl.BLEND)
        }
        const drawSky = (mirror: boolean) => {
          gl.disable(gl.DEPTH_TEST)
          common(skyP, eye, t)
          gl.uniformMatrix4fv(skyP.u('uInvViewProj'), false, invert(viewProj))
          gl.uniform1f(skyP.u('uMirror'), mirror ? 1 : 0)
          gl.activeTexture(gl.TEXTURE0)
          gl.bindTexture(gl.TEXTURE_2D, cloudTex)
          gl.bindVertexArray(quad.vao)
          gl.drawArrays(gl.TRIANGLES, 0, quad.count)
          gl.enable(gl.DEPTH_TEST)
        }

        // 1. the reflection
        gl.bindFramebuffer(gl.FRAMEBUFFER, reflFb)
        gl.viewport(0, 0, reflW, reflH)
        gl.disable(gl.CULL_FACE)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
        drawSky(true)
        drawObjects(true)
        drawRing(true, reflW, reflH)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)

        // 2. the scene
        gl.viewport(0, 0, canvas.width, canvas.height)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
        drawSky(false)
        common(waterP, eye, t)
        gl.uniformMatrix4fv(waterP.u('uProj'), false, proj)
        gl.uniformMatrix4fv(waterP.u('uView'), false, view)
        gl.uniform2f(waterP.u('uViewport'), canvas.width, canvas.height)
        gl.uniform1i(waterP.u('uRefl'), 1)
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, reflTex)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, cloudTex)
        gl.bindVertexArray(meshes.sea.vao)
        gl.drawArrays(gl.TRIANGLES, 0, meshes.sea.count)
        drawObjects(false)
        drawRing(false, canvas.width, canvas.height)

        // 3. the sun's bloom where it shows through the arch
        const s = [eye[0] + sunDir[0] * 5000, eye[1] + sunDir[1] * 5000, eye[2] + sunDir[2] * 5000]
        const w = viewProj[3] * s[0] + viewProj[7] * s[1] + viewProj[11] * s[2] + viewProj[15]
        const sx = ((viewProj[0] * s[0] + viewProj[4] * s[1] + viewProj[8] * s[2] + viewProj[12]) / w) * 0.5 + 0.5
        const sy = ((viewProj[1] * s[0] + viewProj[5] * s[1] + viewProj[9] * s[2] + viewProj[13]) / w) * 0.5 + 0.5
        gl.disable(gl.DEPTH_TEST)
        gl.enable(gl.BLEND)
        gl.blendFunc(gl.ONE, gl.ONE)
        common(glowP, eye, t)
        gl.uniform2f(glowP.u('uSunPx'), sx * canvas.width, sy * canvas.height)
        gl.uniform2f(glowP.u('uViewport'), canvas.width, canvas.height)
        gl.uniform1f(glowP.u('uStrength'), 1)
        gl.bindVertexArray(quad.vao)
        gl.drawArrays(gl.TRIANGLES, 0, quad.count)
        gl.disable(gl.BLEND)

        if (first) {
          first = false
          root.classList.add('hero--live')
          if (posterMode) document.documentElement.dataset.heroReady = 'true'
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
        root.classList.remove('hero--live')
      })
      resume()
    }

    // the still is the first paint; the renderer starts once the page has settled —
    // on touch devices a little later (or at the first touch), so it never competes with loading
    let launched = false
    const go = () => {
      if (launched || cancelled) return
      launched = true
      start().catch((e) => {
        console.warn('hero scene:', e)
        root.classList.remove('hero--live')
      })
    }
    const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 2000 }) : setTimeout(go, 400))
    const settle = () => (posterMode || hasFinePointer() ? idle() : setTimeout(idle, 2500))
    if (!posterMode && !hasFinePointer()) {
      window.addEventListener('pointerdown', go, { once: true, passive: true })
      cleanup.push(() => window.removeEventListener('pointerdown', go))
    }
    if (posterMode || document.readyState === 'complete') settle()
    else window.addEventListener('load', settle, { once: true })

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      cleanup.forEach((f) => f())
      root.classList.remove('hero--live')
    }
  }, [portraitQuery])

  return <canvas ref={ref} className="hero__canvas" aria-hidden="true" />
}

/** 4×4 inverse (column-major), for the sky pass's view rays */
function invert(m: Mat4): Mat4 {
  const o = new Float32Array(16)
  const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m
  const b00 = a00 * a11 - a01 * a10, b01 = a00 * a12 - a02 * a10, b02 = a00 * a13 - a03 * a10
  const b03 = a01 * a12 - a02 * a11, b04 = a01 * a13 - a03 * a11, b05 = a02 * a13 - a03 * a12
  const b06 = a20 * a31 - a21 * a30, b07 = a20 * a32 - a22 * a30, b08 = a20 * a33 - a23 * a30
  const b09 = a21 * a32 - a22 * a31, b10 = a21 * a33 - a23 * a31, b11 = a22 * a33 - a23 * a32
  const det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06 || 1
  const id = 1 / det
  o[0] = (a11 * b11 - a12 * b10 + a13 * b09) * id
  o[1] = (a02 * b10 - a01 * b11 - a03 * b09) * id
  o[2] = (a31 * b05 - a32 * b04 + a33 * b03) * id
  o[3] = (a22 * b04 - a21 * b05 - a23 * b03) * id
  o[4] = (a12 * b08 - a10 * b11 - a13 * b07) * id
  o[5] = (a00 * b11 - a02 * b08 + a03 * b07) * id
  o[6] = (a32 * b02 - a30 * b05 - a33 * b01) * id
  o[7] = (a20 * b05 - a22 * b02 + a23 * b01) * id
  o[8] = (a10 * b10 - a11 * b08 + a13 * b06) * id
  o[9] = (a01 * b08 - a00 * b10 - a03 * b06) * id
  o[10] = (a30 * b04 - a31 * b02 + a33 * b00) * id
  o[11] = (a21 * b02 - a20 * b04 - a23 * b00) * id
  o[12] = (a11 * b07 - a10 * b09 - a12 * b06) * id
  o[13] = (a00 * b09 - a01 * b07 + a02 * b06) * id
  o[14] = (a31 * b01 - a30 * b03 - a32 * b00) * id
  o[15] = (a20 * b03 - a21 * b01 + a22 * b00) * id
  return o
}

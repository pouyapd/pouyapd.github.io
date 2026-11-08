import { useEffect, useRef } from 'react'

/**
 * Restrained motion over the hero still: the open water shimmers (a slow,
 * depth-scaled ripple that re-samples the photograph itself, masked to the
 * sea by the renderer's water pass) and the light in the arch breathes very
 * slightly. The canvas draws the same image as the <img> below it, at the
 * same crop (object-fit), so when it fades in nothing moves but the water.
 *
 * It starts only after the page has loaded and gone idle, only with motion
 * allowed and WebGL2 available, pauses off screen and in background tabs,
 * and draws at ~30 fps. Without it the still is the hero.
 */

const VERT = `#version 300 es
in vec2 p;
out vec2 uv;
void main() { uv = vec2(p.x, -p.y) * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`

const FRAG = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 o;
uniform sampler2D img;
uniform sampler2D mask;
uniform float t;
uniform float horizon;
uniform vec2 sun;
uniform float aspect;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}

void main() {
  float m = texture(mask, uv).r;
  // perspective: ripples are long and fine near the horizon, larger and slower close by
  float d = clamp((uv.y - horizon) / (1.0 - horizon), 0.0, 1.0);
  float depth = 0.12 + d * d * 1.6;
  vec2 q = vec2(uv.x * aspect * 3.0 / depth, uv.y * 90.0 / depth);
  float n = noise(q + vec2(t * 0.05, -t * 0.55)) + 0.5 * noise(q * 2.1 + vec2(-t * 0.08, -t * 0.9));
  vec2 off = vec2((n - 0.75) * 0.0035 * depth, (n - 0.75) * 0.0012 * depth) * m;
  vec3 c = texture(img, uv + off).rgb;
  // the light in the arch breathes, very slightly
  vec2 s = (uv - sun) * vec2(aspect, 1.0);
  float glow = exp(-dot(s, s) / 0.004);
  c *= 1.0 + glow * 0.035 * sin(t * 0.35);
  o = vec4(c, 1.0);
}`

interface Frame {
  horizon: number
  sun: [number, number]
}

export function HeroMotion({ imgRef, maskSrc, frame }: { imgRef: React.RefObject<HTMLImageElement | null>; maskSrc: { landscape: string; portrait: string }; frame: { landscape: Frame; portrait: Frame } }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let disposed = false
    let raf = 0
    let stop = () => {}

    const start = () => {
      if (disposed) return
      const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power' })
      if (!gl) return
      const portrait = img.naturalHeight > img.naturalWidth
      const f = portrait ? frame.portrait : frame.landscape
      const shader = (type: number, src: string) => {
        const s = gl.createShader(type)!
        gl.shaderSource(s, src)
        gl.compileShader(s)
        return s
      }
      const prog = gl.createProgram()!
      gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT))
      gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG))
      gl.linkProgram(prog)
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return
      gl.useProgram(prog)
      const buf = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
      const loc = gl.getAttribLocation(prog, 'p')
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

      const texture = (unit: number, source: TexImageSource) => {
        const tex = gl.createTexture()
        gl.activeTexture(gl.TEXTURE0 + unit)
        gl.bindTexture(gl.TEXTURE_2D, tex)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
        return tex
      }
      // the drawing buffer matches the photograph (capped), and CSS crops it exactly like the <img>
      const scale = Math.min(1, 2400 / img.naturalWidth)
      canvas.width = Math.round(img.naturalWidth * scale)
      canvas.height = Math.round(img.naturalHeight * scale)
      gl.viewport(0, 0, canvas.width, canvas.height)
      texture(0, img)
      gl.uniform1i(gl.getUniformLocation(prog, 'img'), 0)
      gl.uniform1i(gl.getUniformLocation(prog, 'mask'), 1)
      gl.uniform1f(gl.getUniformLocation(prog, 'horizon'), f.horizon)
      gl.uniform2f(gl.getUniformLocation(prog, 'sun'), f.sun[0], f.sun[1])
      gl.uniform1f(gl.getUniformLocation(prog, 'aspect'), img.naturalWidth / img.naturalHeight)
      const uT = gl.getUniformLocation(prog, 't')

      const mask = new Image()
      mask.decoding = 'async'
      mask.src = portrait ? maskSrc.portrait : maskSrc.landscape
      mask.onload = () => {
        if (disposed) return
        texture(1, mask)
        let visible = true
        let last = 0
        const t0 = performance.now()
        const draw = (now: number) => {
          raf = requestAnimationFrame(draw)
          if (!visible || document.hidden || now - last < 33) return
          last = now
          gl.uniform1f(uT, (now - t0) / 1000)
          gl.drawArrays(gl.TRIANGLES, 0, 3)
          if (!canvas.classList.contains('is-live')) canvas.classList.add('is-live')
        }
        const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
        io.observe(canvas)
        raf = requestAnimationFrame(draw)
        stop = () => {
          io.disconnect()
          cancelAnimationFrame(raf)
          gl.getExtension('WEBGL_lose_context')?.loseContext()
        }
      }
    }

    // after the first paint has settled: the still is the hero until then
    const whenIdle = () => ('requestIdleCallback' in window ? requestIdleCallback(start, { timeout: 3000 }) : setTimeout(start, 1200))
    const ready = () => (img.complete && img.naturalWidth ? whenIdle() : img.addEventListener('load', whenIdle, { once: true }))
    if (document.readyState === 'complete') ready()
    else addEventListener('load', ready, { once: true })
    return () => {
      disposed = true
      stop()
      removeEventListener('load', ready)
    }
  }, [imgRef, maskSrc, frame])

  return <canvas ref={canvasRef} className="hero__motion" aria-hidden="true" />
}

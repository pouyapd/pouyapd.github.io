/**
 * The smallest useful WebGL: one full-screen triangle and one fragment shader,
 * drawn into a canvas at a chosen resolution, and a frame loop that only runs
 * while the canvas is on screen and the tab is visible. No library.
 */

export interface Stage {
  gl: WebGLRenderingContext
  /** Location of a uniform (cached). */
  u: (name: string) => WebGLUniformLocation | null
  /** Matches the drawing buffer to the canvas' CSS size × scale; true if it changed. */
  resize: (scale: number) => boolean
  draw: () => void
  destroy: () => void
}

const VERTEX = `attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}`

/**
 * Resolves once the GPU has finished compiling `program`. Asking for COMPILE_STATUS or
 * LINK_STATUS straight away makes the page wait for the compiler — seconds for a large
 * ray-marching shader on a first visit, with scrolling and taps frozen meanwhile. With
 * KHR_parallel_shader_compile the compile runs in the background and is polled instead.
 */
function compiled(gl: WebGLRenderingContext, program: WebGLProgram): Promise<void> {
  const ext = gl.getExtension('KHR_parallel_shader_compile')
  if (!ext) return Promise.resolve()
  return new Promise((done) => {
    const poll = () => (gl.isContextLost() || gl.getProgramParameter(program, ext.COMPLETION_STATUS_KHR) ? done() : setTimeout(poll, 32))
    poll()
  })
}

export async function createStage(canvas: HTMLCanvasElement, fragment: string, { alpha = false } = {}): Promise<Stage | null> {
  const gl = canvas.getContext('webgl', { alpha, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' })
  if (!gl) return null
  // ray marching needs full float precision in the fragment shader
  const hp = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)
  if (!hp || hp.precision < 16) return null

  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    return s
  }
  const vs = shader(gl.VERTEX_SHADER, VERTEX)
  const fs = shader(gl.FRAGMENT_SHADER, fragment)
  const program = gl.createProgram()!
  gl.attachShader(program, vs)
  gl.attachShader(program, fs)
  gl.linkProgram(program)
  // status is read only after the compile has finished, so reading it no longer blocks
  await compiled(gl, program)
  if (gl.isContextLost() || !gl.getProgramParameter(program, gl.LINK_STATUS)) {
    for (const s of [vs, fs]) if (!gl.isContextLost() && !gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(s))
    return null
  }
  gl.useProgram(program)

  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(program, 'a')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

  const cache = new Map<string, WebGLUniformLocation | null>()
  const u = (name: string) => {
    if (!cache.has(name)) cache.set(name, gl.getUniformLocation(program, name))
    return cache.get(name)!
  }

  return {
    gl,
    u,
    resize(scale) {
      const w = Math.max(1, Math.round(canvas.clientWidth * scale))
      const h = Math.max(1, Math.round(canvas.clientHeight * scale))
      if (canvas.width === w && canvas.height === h) return false
      canvas.width = w
      canvas.height = h
      gl.viewport(0, 0, w, h)
      return true
    },
    draw() {
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    },
    destroy() {
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}

/**
 * Calls `frame(time, dt)` on animation frames while `el` is on screen and the
 * tab is visible. `frame` returns true to keep going; otherwise the loop sleeps
 * until `wake()` (a drag, a hover, a new setting).
 */
export function frameLoop(el: Element, frame: (time: number, dt: number) => boolean) {
  let raf = 0
  let last = 0
  let visible = false
  let awake = true
  const tick = (now: number) => {
    raf = 0
    const dt = last ? Math.min(now - last, 100) : 16.7
    last = now
    awake = frame(now, dt)
    if (awake && visible && !document.hidden) raf = requestAnimationFrame(tick)
    else last = 0
  }
  const run = () => {
    if (!raf && visible && !document.hidden) raf = requestAnimationFrame(tick)
  }
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting
    if (visible && awake) run()
  })
  io.observe(el)
  const onVisibility = () => awake && run()
  document.addEventListener('visibilitychange', onVisibility)
  return {
    wake() {
      awake = true
      run()
    },
    stop() {
      cancelAnimationFrame(raf)
      raf = 0
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    },
  }
}

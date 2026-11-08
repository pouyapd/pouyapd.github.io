import { useEffect, useRef, useState, type RefObject } from 'react'
import { prefersReducedMotion } from '../media'
import { useNear } from '../useNear'
import type { Lift, Lifts } from './lifts'

/**
 * The technique demonstrations (./lifts.ts) in a canvas: the code loads only
 * when the canvas comes near the screen and follows `lift`. With reduced
 * motion it holds the bottom of the lift until asked to play. `onDepth`
 * receives the position in the lift on every drawn frame (write it to the DOM,
 * not to React state). `state` is 'failed' where WebGL is unavailable.
 */
export function useLifts(canvas: RefObject<HTMLCanvasElement | null>, lift: Lift, onDepth?: (depth: number) => void) {
  const near = useNear(canvas)
  const api = useRef<Lifts | null>(null)
  const first = useRef(lift)
  const depth = useRef(onDepth)
  const [state, setState] = useState<'idle' | 'live' | 'failed'>('idle')

  useEffect(() => {
    depth.current = onDepth
  }, [onDepth])

  useEffect(() => {
    const el = canvas.current
    if (!near || !el) return
    let gone = false
    import('./lifts')
      .then(({ createLifts }) => (gone ? null : createLifts(el, { lift: first.current, still: prefersReducedMotion(), onDepth: (d) => depth.current?.(d) })))
      .then((made) => {
        // the shader compiles in the background; if the canvas has gone meanwhile, let it go too
        if (gone) return made?.destroy()
        api.current = made
        setState(made ? 'live' : 'failed')
      })
    return () => {
      gone = true
      api.current?.destroy()
      api.current = null
    }
  }, [canvas, near])

  useEffect(() => {
    api.current?.setLift(lift)
  }, [lift, state])

  return {
    state,
    hold: (at: number | null) => api.current?.hold(at),
    play: (on: boolean) => api.current?.play(on),
  }
}

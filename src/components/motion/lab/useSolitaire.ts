import { useEffect, useRef, useState, type RefObject } from 'react'
import { prefersReducedMotion } from '../media'
import { useNear } from '../useNear'
import type { Metal, Solitaire } from './solitaire'

/**
 * The real-time solitaire (./solitaire.ts) in a canvas: its code loads only
 * when the canvas comes near the screen, it follows `metal`, and it holds
 * still with reduced motion. `state` is 'failed' where WebGL is unavailable.
 */
export function useSolitaire(canvas: RefObject<HTMLCanvasElement | null>, metal: Metal, look?: { spin?: number; tones?: [number, number, number][]; yaw?: number }) {
  const near = useNear(canvas)
  const api = useRef<Solitaire | null>(null)
  const first = useRef(metal)
  const style = useRef(look)
  const [state, setState] = useState<'idle' | 'live' | 'failed'>('idle')

  useEffect(() => {
    const el = canvas.current
    if (!near || !el) return
    let gone = false
    import('./solitaire')
      .then(({ createSolitaire }) => (gone ? null : createSolitaire(el, { metal: first.current, still: prefersReducedMotion(), ...style.current })))
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
    api.current?.setMetal(metal)
  }, [metal, state])

  return { state, turn: (by: number) => api.current?.turn(by) }
}

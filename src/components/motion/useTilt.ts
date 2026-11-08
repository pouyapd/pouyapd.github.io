import { useEffect, type RefObject } from 'react'
import { hasFinePointer, prefersReducedMotion } from './media'

/**
 * Pointer-following tilt for a card or stage. Writes --tilt-x / --tilt-y
 * (-1 → 1, smoothed) on the element; CSS decides what moves and how far.
 * Mouse only, off for reduced motion, and the loop stops when values settle.
 */
export function useTilt<T extends HTMLElement>(ref: RefObject<T | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion() || !hasFinePointer()) return
    let frame = 0
    let x = 0
    let y = 0
    let tx = 0
    let ty = 0

    const tick = () => {
      frame = 0
      x += (tx - x) * 0.1
      y += (ty - y) * 0.1
      el.style.setProperty('--tilt-x', x.toFixed(4))
      el.style.setProperty('--tilt-y', y.toFixed(4))
      if (Math.abs(tx - x) > 0.002 || Math.abs(ty - y) > 0.002) frame = requestAnimationFrame(tick)
    }
    const start = () => {
      if (!frame) frame = requestAnimationFrame(tick)
    }
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const r = el.getBoundingClientRect()
      tx = ((e.clientX - r.left) / r.width) * 2 - 1
      ty = ((e.clientY - r.top) / r.height) * 2 - 1
      start()
    }
    const leave = () => {
      tx = 0
      ty = 0
      start()
    }
    el.addEventListener('pointermove', move, { passive: true })
    el.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(frame)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
      el.style.removeProperty('--tilt-x')
      el.style.removeProperty('--tilt-y')
    }
  }, [ref])
}

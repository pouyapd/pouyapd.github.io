import { useEffect, useRef, type RefObject } from 'react'
import { prefersReducedMotion } from './media'

/**
 * Links a composition to the scroll position, without taking over scrolling:
 * on each animation frame after a scroll or resize, while `ref` is near the
 * screen, `progress(rect, viewportHeight)` turns the element's position into a
 * number and `apply(p)` writes it to the DOM (transforms, not React state).
 * With `ease` (a rate per second) the applied value glides towards the scroll
 * position instead of jumping with each wheel step; it still follows the
 * scroll exactly, both ways, and stops when it arrives.
 * With reduced motion `apply` is called once with `still` and never again.
 */
export function useScrollProgress<T extends HTMLElement>(
  ref: RefObject<T | null>,
  progress: (rect: DOMRect, vh: number) => number,
  apply: (p: number) => void,
  still = 1,
  ease = 0,
) {
  const fns = useRef({ progress, apply })
  useEffect(() => {
    fns.current = { progress, apply }
  })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (prefersReducedMotion()) {
      fns.current.apply(still)
      return
    }
    let frame = 0
    let near = false
    let last = Number.NaN
    let then = 0
    const update = (now = performance.now()) => {
      frame = 0
      const goal = Math.min(1, Math.max(0, fns.current.progress(el.getBoundingClientRect(), window.innerHeight)))
      let p = goal
      if (ease && !Number.isNaN(last)) {
        const dt = Math.min(0.1, then ? (now - then) / 1000 : 0.016)
        p = last + (goal - last) * Math.min(1, dt * ease)
        if (Math.abs(goal - p) < 0.0008) p = goal
      }
      then = now
      if (p !== last) {
        last = p
        fns.current.apply(p)
      }
      if (p !== goal && near) frame = requestAnimationFrame(update)
      else then = 0
    }
    const request = () => {
      if (near && !frame) frame = requestAnimationFrame(update)
    }
    const io = new IntersectionObserver(
      ([e]) => {
        near = e.isIntersecting
        request()
      },
      { rootMargin: '50% 0px' },
    )
    io.observe(el)
    const onResize = () => {
      last = Number.NaN
      request()
    }
    window.addEventListener('scroll', request, { passive: true })
    window.addEventListener('resize', onResize)
    // first position, before the element is near (so it never flashes its final state)
    update()
    return () => {
      cancelAnimationFrame(frame)
      io.disconnect()
      window.removeEventListener('scroll', request)
      window.removeEventListener('resize', onResize)
    }
  }, [ref, still, ease])
}

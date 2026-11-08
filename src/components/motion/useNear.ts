import { useEffect, useState, type RefObject } from 'react'

/**
 * True once the element has come within `margin` of the viewport, then stays
 * true. Used to start heavy work (a WebGL scene, a reveal) only when it is
 * about to be seen.
 */
export function useNear<T extends Element>(ref: RefObject<T | null>, margin = '400px'): boolean {
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || near || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: margin })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, margin, near])
  return near
}

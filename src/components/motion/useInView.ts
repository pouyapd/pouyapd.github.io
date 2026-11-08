import { useEffect, useState, type RefObject } from 'react'

/**
 * Tracks whether an element is on screen. Used to pause looping animations
 * (orbits, scroll cue) while they are out of view, so the page is idle when
 * nothing visible is moving.
 */
export function useInView<T extends Element>(ref: RefObject<T | null>, rootMargin = '0px'): boolean {
  const [inView, setInView] = useState(true)

  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, rootMargin])

  return inView
}

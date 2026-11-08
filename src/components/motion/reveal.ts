import { prefersReducedMotion } from './media'

/**
 * Scroll reveals for [data-reveal] elements.
 *
 * Elements already on screen are left alone (no flash after hydration).
 * Elements below the fold get .is-pending (hidden, see base.css) and are
 * revealed once when they enter the viewport. Without JS, or with reduced
 * motion, nothing is ever hidden.
 */
export function initReveal(root: ParentNode = document): () => void {
  if (prefersReducedMotion() || !('IntersectionObserver' in window)) return () => {}

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const el = entry.target as HTMLElement
        el.classList.remove('is-pending')
        el.classList.add('is-revealed')
        observer.unobserve(el)
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.01 },
  )

  const viewport = window.innerHeight
  for (const el of root.querySelectorAll<HTMLElement>('[data-reveal]')) {
    const rect = el.getBoundingClientRect()
    const onScreen = rect.top < viewport * 0.92 && rect.bottom > 0
    if (onScreen) continue
    el.classList.add('is-pending')
    observer.observe(el)
  }

  return () => observer.disconnect()
}

import { prefersReducedMotion } from '../motion/media'

/**
 * Jumps to an in-page anchor after a modal has closed (native hash navigation
 * can be swallowed while the page is scroll-locked). Moves focus to the target
 * so keyboard and screen-reader users continue from there.
 */
export function scrollToHash(hash: string) {
  const target = document.getElementById(hash.replace(/^#/, ''))
  if (!target) return
  if (location.hash !== hash) history.pushState(null, '', hash)
  target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' })
  if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
  target.focus({ preventScroll: true })
}

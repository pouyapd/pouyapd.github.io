/** Motion preferences, safe to call during SSR (they report "no motion" on the server). */

export function prefersReducedMotion(): boolean {
  return typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function hasFinePointer(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

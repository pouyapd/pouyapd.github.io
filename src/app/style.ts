import type { CSSProperties } from 'react'

/** Typed helper for inline CSS custom properties, e.g. vars({ '--reveal-i': 2 }). */
export function vars(values: Record<`--${string}`, string | number>): CSSProperties {
  return values as CSSProperties
}

/** True for light colours (#rrggbb), e.g. to give a light stage a light browser chrome. */
export function isLight(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16)
  return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255) > 150
}

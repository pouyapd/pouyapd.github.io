import marks from '../../content/generated/wordmarks.json'

type Slug = keyof typeof marks

/**
 * A concept's name in its own typeface, as outlines (tools/brand/wordmarks.py),
 * so the home page needs none of the concept fonts. Decorative: pair it with
 * the name as real text (e.g. visually hidden inside the heading).
 */
export function Wordmark({ slug, className }: { slug: string; className?: string }) {
  const m = marks[slug as Slug]
  if (!m) return null
  return (
    <svg className={['wordmark', className].filter(Boolean).join(' ')} viewBox={m.viewBox} aria-hidden="true" focusable="false">
      <path d={m.d} fill="currentColor" />
    </svg>
  )
}

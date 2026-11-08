import { useEffect, useRef, useState, type ReactNode } from 'react'
import { asset } from '../../app/paths'
import { vars } from '../../app/style'
import media from '../../content/generated/media.json'

type SiteKey = keyof typeof media.sites

interface PagePreviewProps {
  /** Key in media.json → sites, e.g. "maison-aurel-desktop". */
  name: string
  alt: string
  sizes: string
  /** hover: glide through the page on hover/focus · native: scrollable region · none: still. */
  mode?: 'hover' | 'native' | 'none'
  /** Accessible name of the scrollable region (mode="native"). */
  regionLabel?: string
  eager?: boolean
  /** The page's main image (LCP): fetched with high priority. */
  priority?: boolean
  /** Laid over the page image and scrolled with it (e.g. clickable navigation). */
  overlay?: ReactNode
}

/**
 * A full-page capture of a concept site, shown inside a BrowserFrame or PhoneFrame.
 *
 * The captures are large, and Selected Work follows the hero directly, so
 * native lazy loading would start them during the first screen (browsers load
 * lazy images well before they scroll into view). Instead the real sources are
 * attached only when the preview is within about one screen of the viewport;
 * until then the blurred placeholder holds the layout. Without JavaScript the
 * <noscript> copy loads normally.
 */
export function PagePreview({ name, alt, sizes, mode = 'hover', regionLabel, eager, priority, overlay }: PagePreviewProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [near, setNear] = useState(Boolean(eager))

  useEffect(() => {
    const el = ref.current
    if (near || !el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '100% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [near])

  const entry = media.sites[name as SiteKey]
  if (!entry) return null
  const set = (ext: string) => entry.widths.map((w) => `${asset(`media/sites/${name}-${w}.${ext}`)} ${w}w`).join(', ')
  const fallback = asset(`media/sites/${name}-${entry.widths[Math.min(1, entry.widths.length - 1)]}.webp`)
  const native = mode === 'native'
  const img = { alt, width: entry.width, height: entry.height, decoding: 'async' as const, style: { backgroundImage: `url("${entry.placeholder}")` } }

  return (
    <div
      ref={ref}
      className={`page-preview page-preview--${mode}`}
      style={vars({ '--page-ratio': (entry.height / entry.width).toFixed(3) })}
      tabIndex={native ? 0 : undefined}
      role={native ? 'region' : undefined}
      aria-label={native ? regionLabel : undefined}
    >
      <div className="page-preview__page">
        {near ? (
          <picture>
            <source type="image/avif" srcSet={set('avif')} sizes={sizes} />
            <source type="image/webp" srcSet={set('webp')} sizes={sizes} />
            <img src={fallback} loading={eager ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : undefined} {...img} />
          </picture>
        ) : (
          <>
            <img className="page-preview__wait" src={entry.placeholder} {...img} />
            <noscript>
              <img src={fallback} loading="lazy" {...img} />
            </noscript>
          </>
        )}
        {overlay}
      </div>
    </div>
  )
}

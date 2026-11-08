import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { asset } from '../../app/paths'
import media from '../../content/generated/media.json'

/** Media groups with plain responsive images (see scripts/build-assets.mjs). */
type Group = 'photos' | 'shots' | 'hero'

interface Entry {
  width: number
  height: number
  widths: number[]
  placeholder?: string
}

interface ResponsiveImageProps {
  /** Key in media.json → <group>. */
  name: string
  group?: Group
  alt: string
  sizes: string
  className?: string
  /** CSS object-position for cropped layouts. */
  focus?: string
  eager?: boolean
  /** The page's main image (LCP): fetched with high priority. */
  priority?: boolean
  style?: CSSProperties
  /** Attach the real sources only when the image is about one screen away (see PagePreview):
   *  for large images just below the first screen, which native lazy loading fetches too early. */
  defer?: boolean
}

export function mediaEntry(group: Group, name: string): Entry | undefined {
  return (media[group] as Record<string, Entry>)[name]
}

/**
 * AVIF/WebP <picture> for a generated image with intrinsic size (no layout
 * shift) and a blurred placeholder painted behind it until it loads.
 */
export function ResponsiveImage({ name, group = 'photos', alt, sizes, className, focus, eager, priority, style, defer }: ResponsiveImageProps) {
  const ref = useRef<HTMLImageElement>(null)
  const [near, setNear] = useState(!defer)
  useEffect(() => {
    const el = ref.current
    if (near || !el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: '100% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [near])

  const entry = mediaEntry(group, name)
  if (!entry) return null
  const set = (ext: string) => entry.widths.map((w) => `${asset(`media/${group}/${name}-${w}.${ext}`)} ${w}w`).join(', ')
  const imgStyle: CSSProperties = {
    objectPosition: focus,
    backgroundImage: entry.placeholder ? `url("${entry.placeholder}")` : undefined,
    ...style,
  }
  if (!near) {
    return (
      <picture className={className}>
        <img ref={ref} className="deferred-wait" src={entry.placeholder} alt={alt} width={entry.width} height={entry.height} decoding="async" style={imgStyle} />
        <noscript>
          <img src={asset(`media/${group}/${name}-${entry.widths[1] ?? entry.widths[0]}.webp`)} alt={alt} width={entry.width} height={entry.height} loading="lazy" style={imgStyle} />
        </noscript>
      </picture>
    )
  }
  return (
    <picture className={className}>
      <source type="image/avif" srcSet={set('avif')} sizes={sizes} />
      <source type="image/webp" srcSet={set('webp')} sizes={sizes} />
      <img
        src={asset(`media/${group}/${name}-${entry.widths[1] ?? entry.widths[0]}.webp`)}
        alt={alt}
        width={entry.width}
        height={entry.height}
        loading={eager ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        style={imgStyle}
      />
    </picture>
  )
}

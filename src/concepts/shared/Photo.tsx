import { ResponsiveImage } from '../../components/ui/ResponsiveImage'

/** A licensed photograph from a concept's set (media.json → photos: "<set>-<key>"). */
export function Photo({
  set,
  name,
  alt = '',
  sizes,
  focus,
  priority,
  className,
}: {
  set: string
  name: string
  alt?: string
  sizes: string
  focus?: string
  priority?: boolean
  className?: string
}) {
  // below the first screen, the real sources are attached only when the photo comes near
  return <ResponsiveImage group="photos" name={`${set}-${name}`} alt={alt} sizes={sizes} focus={focus} eager={priority} priority={priority} defer={!priority} className={className} />
}

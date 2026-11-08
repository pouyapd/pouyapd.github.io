import { asset } from '../../app/paths'
import { site } from '../../config/site'

interface LogoProps {
  /** Rendered height in CSS units. */
  height?: string
  className?: string
  /** Next to visible text that already names the studio: hide from assistive tech. */
  decorative?: boolean
  /** Dark ink version, for light backgrounds. */
  ink?: boolean
}

/**
 * The P. DESIGN mark — the pd monogram alone (one ribbon through two round
 * bowls; the p ivory, the d lime), loaded from /public/brand so it can be replaced
 * without touching code. Its accessible name is the studio's name. The
 * width/height below only reserve space: keep their ratio in step with the SVG
 * viewBox (104 × 117.5, tools/brand/make_logo.py).
 */
export function Logo({ height = '2rem', className, decorative, ink }: LogoProps) {
  return (
    <img
      className={['logo', className].filter(Boolean).join(' ')}
      src={asset(ink ? site.brand.logoInk : site.brand.logo)}
      alt={decorative ? '' : site.name}
      width={1040}
      height={1175}
      style={{ height, width: 'auto' }}
      decoding="async"
    />
  )
}

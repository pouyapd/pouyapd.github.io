import { asset } from '../../app/paths'
import { vars } from '../../app/style'
import media from '../../content/generated/media.json'
import type { HeroContent } from '../../content/types'
import { ArrowLink, ButtonLink } from '../ui/Button'
import './hero.css'

/**
 * Tall phones (390 x 844 and the like) get their own crop of the same image (the figure, the arch, the sun);
 * every other screen, shorter phones included, the whole image (hero.css frames it per layout).
 */
export const HERO_PORTRAIT = '(max-aspect-ratio: 49/100) and (max-width: 40em)'

/**
 * How wide the whole image is drawn (object-fit: cover): on portrait tablets it
 * fills a 1.3:1 band, on screens narrower than the image it fills the height.
 */
export const HERO_SIZES = '(max-aspect-ratio: 4/5) 137vw, (max-aspect-ratio: 16/9) 178svh, 100vw'

interface Still {
  width: number
  height: number
  widths: number[]
  placeholder?: string
}

const stills = media.hero as Record<string, Still>

export function heroSrcSet(name: string, ext: string) {
  const e = stills[name]
  return e ? e.widths.map((w) => `${asset(`media/hero/${name}-${w}.${ext}`)} ${w}w`).join(', ') : ''
}

/**
 * The hero image: the owner's own picture (tools/hero/sunset-portal.png) used
 * as supplied — a monumental stone gateway in still water at sunset, the sun
 * in the arch, a small figure on the walkway. Never enlarged in the files,
 * never retouched; a blurred copy (inline, a few hundred bytes) holds its
 * place until it arrives.
 */
function HeroStill() {
  const whole = stills.portal
  const portrait = stills['portal-portrait']
  if (!whole) return null
  return (
    <picture className="hero__still">
      {portrait && (
        <>
          <source media={HERO_PORTRAIT} type="image/avif" srcSet={heroSrcSet('portal-portrait', 'avif')} sizes="100vw" />
          <source media={HERO_PORTRAIT} type="image/webp" srcSet={heroSrcSet('portal-portrait', 'webp')} sizes="100vw" />
        </>
      )}
      <source type="image/avif" srcSet={heroSrcSet('portal', 'avif')} sizes={HERO_SIZES} />
      <source type="image/webp" srcSet={heroSrcSet('portal', 'webp')} sizes={HERO_SIZES} />
      <img src={asset(`media/hero/portal-${whole.widths.at(-1)}.webp`)} alt="" width={whole.width} height={whole.height} fetchPriority="high" decoding="async" />
    </picture>
  )
}

/**
 * The opening: one image, the headline and the primary enquiry over its dark
 * left side (on phones, below it, over the water).
 */
export function Hero({ content }: { content: HeroContent }) {
  let i = 0
  const step = () => vars({ '--i': i++ })
  const ph = (name: string) => (stills[name]?.placeholder ? `url("${stills[name].placeholder}")` : 'none')

  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="hero__stage" aria-hidden="true" style={vars({ '--ph': ph('portal'), '--ph-portrait': ph('portal-portrait') })}>
        <HeroStill />
        <div className="hero__shade" />
      </div>

      <div className="hero__inner container">
        <div className="hero__content">
          <p className="eyebrow hero__id" data-enter style={step()}>
            {content.eyebrow}
          </p>
          <h1 id="hero-title" className="hero__title">
            {content.title.map((line, n) => (
              <span key={n} className="hero__line">
                <span className="hero__line-inner" data-enter style={step()}>
                  {line.text}
                  {line.accent && <em className="hero__accent accent">{line.accent}</em>}
                </span>{' '}
              </span>
            ))}
          </h1>
          <p className="hero__intro" data-enter style={step()}>
            {content.intro}
          </p>
          <div className="hero__actions" data-enter style={step()}>
            <ButtonLink href={content.primary.href}>{content.primary.label}</ButtonLink>
            <ArrowLink href={content.secondary.href}>{content.secondary.label}</ArrowLink>
          </div>
        </div>
      </div>

      <div className="hero__footer container" data-enter style={step()}>
        <a className="scroll-cue" href="#work" aria-label={content.scrollAria}>
          <span className="scroll-cue__label">{content.scrollLabel}</span>
          <span className="scroll-cue__track" aria-hidden="true">
            <span className="scroll-cue__dot" />
          </span>
        </a>
      </div>
    </section>
  )
}

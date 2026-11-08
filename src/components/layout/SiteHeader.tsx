import { useEffect, useRef, useState } from 'react'
import type { PageContent } from '../../content/types'
import { MobileMenu } from '../navigation/MobileMenu'
import { useActiveSection } from '../navigation/useActiveSection'
import { ButtonLink } from '../ui/Button'
import { Logo } from '../ui/Logo'
import './site-header.css'

/**
 * Transparent over the hero; becomes a translucent bar once the page scrolls,
 * and tucks away while scrolling down past the hero (back on any scroll up,
 * or when anything inside it receives focus).
 */
export function SiteHeader({
  nav,
  homeHref = '#top',
  tone = 'dark',
}: {
  nav: PageContent['nav']
  homeHref?: string
  /** 'light': the page opens on a light background — dark ink until the bar fills in. */
  tone?: 'dark' | 'light'
}) {
  const ref = useRef<HTMLElement>(null)
  const [scrolled, setScrolled] = useState(false)
  const [tucked, setTucked] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const active = useActiveSection(nav.items.map((item) => item.href.split('#')[1]))

  useEffect(() => {
    let lastY = window.scrollY
    let frame = 0
    // a jump the visitor asked for (an in-page link, the menu) scrolls down too, but the header stays for it
    let jumping = false
    let jumpTimer = 0
    const update = () => {
      frame = 0
      const y = window.scrollY
      setScrolled(y > 24)
      const pastHero = y > window.innerHeight * 0.85
      const focusInside = ref.current?.contains(document.activeElement) ?? false
      if (y > lastY + 6 && pastHero && !focusInside && !jumping) setTucked(true)
      else if (y < lastY - 6 || !pastHero) setTucked(false)
      lastY = y
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    const endJump = () => {
      window.clearTimeout(jumpTimer)
      jumping = false
      // scrollend can arrive before the last scroll frame is handled: count the jump as seen
      lastY = window.scrollY
    }
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.('a[href*="#"]')
      if (!(link instanceof HTMLAnchorElement) || link.pathname !== location.pathname || link.hash.length < 2) return
      jumping = true
      setTucked(false)
      // the menu starts its scroll after it has closed; scrollend ends the hold early where supported
      window.clearTimeout(jumpTimer)
      jumpTimer = window.setTimeout(endJump, 1800)
    }
    const onScrollEnd = () => jumping && endJump()
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('scrollend', onScrollEnd)
    document.addEventListener('click', onClick)
    return () => {
      cancelAnimationFrame(frame)
      endJump()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('scrollend', onScrollEnd)
      document.removeEventListener('click', onClick)
    }
  }, [])

  return (
    <header
      ref={ref}
      className="site-header"
      data-scrolled={scrolled}
      data-tucked={tucked && !menuOpen}
      data-tone={tone}
      onFocusCapture={() => setTucked(false)}
    >
      <div className="site-header__inner container">
        <a className="site-header__home" href={homeHref} aria-label={nav.homeLabel}>
          <Logo height="var(--logo-h)" className="site-header__logo" />
          {tone === 'light' && <Logo height="var(--logo-h)" className="site-header__logo site-header__logo--ink" ink decorative />}
        </a>

        <nav className="site-nav" aria-label={nav.ariaLabel}>
          <ul className="site-nav__list" role="list">
            {nav.items.map((item) => (
              <li key={item.href}>
                <a
                  className="site-nav__link"
                  href={item.href}
                  aria-current={active === item.href.split('#')[1] ? 'true' : undefined}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <ButtonLink className="site-header__cta" variant="ghost" size="s" href={nav.cta.href}>
          {nav.cta.label}
        </ButtonLink>

        <MobileMenu nav={nav} open={menuOpen} onOpenChange={setMenuOpen} active={active} />
      </div>
    </header>
  )
}

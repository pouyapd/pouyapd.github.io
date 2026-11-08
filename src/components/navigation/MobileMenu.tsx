import { useEffect, useRef, type MouseEvent } from 'react'
import { vars } from '../../app/style'
import type { PageContent } from '../../content/types'
import { ButtonLink } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Logo } from '../ui/Logo'
import { scrollToHash } from './scrollToHash'
import './mobile-menu.css'

interface MobileMenuProps {
  nav: PageContent['nav']
  open: boolean
  onOpenChange: (open: boolean) => void
  active: string | null
}

/**
 * Full-screen menu for small screens, built on <dialog>: the browser handles
 * the focus trap, Escape, and making the page behind it inert.
 * Without JS the toggle is replaced by a plain link to the footer navigation.
 */
export function MobileMenu({ nav, open, onOpenChange, active }: MobileMenuProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  // When a link closes the menu, focus moves to its target instead of back to the toggle.
  const navigatingTo = useRef<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      document.documentElement.classList.add('is-locked')
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const onClose = () => {
      document.documentElement.classList.remove('is-locked')
      onOpenChange(false)
      const hash = navigatingTo.current
      navigatingTo.current = null
      if (hash) scrollToHash(hash)
      else toggleRef.current?.focus()
    }
    dialog.addEventListener('close', onClose)
    return () => dialog.removeEventListener('close', onClose)
  }, [onOpenChange])

  // Leaving the mobile layout (rotate / resize) closes the menu.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900.02px)')
    const onChange = () => mq.matches && onOpenChange(false)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [onOpenChange])

  const go = (e: MouseEvent<HTMLAnchorElement>) => {
    // links to another page (project pages link back to the home sections) navigate normally
    if (!e.currentTarget.getAttribute('href')?.startsWith('#')) return
    e.preventDefault()
    navigatingTo.current = e.currentTarget.getAttribute('href')
    dialogRef.current?.close()
  }

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        className="menu-toggle"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={() => onOpenChange(!open)}
      >
        <span className="menu-toggle__label">{nav.menuLabel}</span>
        <span className="menu-toggle__icon" aria-hidden="true">
          <span />
          <span />
        </span>
      </button>
      <a className="menu-fallback" href="#footer-nav">
        {nav.menuLabel}
      </a>

      <dialog ref={dialogRef} id="site-menu" className="menu-panel" aria-label={nav.menuLabel}>
        <div className="menu-panel__top container">
          <Logo height="2.4rem" />
          <button type="button" className="menu-panel__close" aria-label={nav.closeLabel} onClick={() => onOpenChange(false)}>
            <Icon name="close" />
          </button>
        </div>
        <nav className="menu-panel__nav container" aria-label={nav.ariaLabel}>
          <ol className="menu-panel__list" role="list">
            {nav.items.map((item, n) => (
              <li key={item.href} style={vars({ '--i': n })}>
                <a
                  href={item.href}
                  className="menu-panel__link"
                  aria-current={active === item.href.split('#')[1] ? 'true' : undefined}
                  onClick={go}
                >
                  <span className="menu-panel__num">{String(n + 1).padStart(2, '0')}</span>
                  {item.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="menu-panel__foot container" style={vars({ '--i': nav.items.length })}>
          <ButtonLink href={nav.cta.href} onClick={go}>
            {nav.cta.label}
          </ButtonLink>
        </div>
      </dialog>
    </>
  )
}

import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon } from './Icon'
import './button.css'

type Variant = 'primary' | 'ghost'

interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: Variant
  size?: 'm' | 's'
  children: ReactNode
}

/** Pill-shaped call to action rendered as a link. */
export function ButtonLink({ variant = 'primary', size = 'm', className, children, ...rest }: ButtonLinkProps) {
  return (
    <a className={['btn', `btn--${variant}`, `btn--${size}`, className].filter(Boolean).join(' ')} {...rest}>
      <span className="btn__label">{children}</span>
      <span className="btn__icon" aria-hidden="true">
        <Icon name="arrow-right" />
      </span>
    </a>
  )
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'm' | 's'
  icon?: 'copy' | 'check' | 'arrow-right' | 'close'
}

export function Button({ variant = 'ghost', size = 'm', icon, className, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={['btn', `btn--${variant}`, `btn--${size}`, className].filter(Boolean).join(' ')}
      {...rest}
    >
      <span className="btn__label">{children}</span>
      {icon && (
        <span className="btn__icon" aria-hidden="true">
          <Icon name={icon} />
        </span>
      )}
    </button>
  )
}

interface ArrowLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  children: ReactNode
  direction?: 'right' | 'down'
}

/** Secondary action: a ringed arrow followed by an uppercase label. */
export function ArrowLink({ children, direction = 'right', className, ...rest }: ArrowLinkProps) {
  return (
    <a className={['arrow-link', className].filter(Boolean).join(' ')} {...rest}>
      <span className="arrow-link__ring" aria-hidden="true">
        <Icon name={direction === 'down' ? 'arrow-down' : 'arrow-right'} />
      </span>
      <span className="arrow-link__label">{children}</span>
    </a>
  )
}

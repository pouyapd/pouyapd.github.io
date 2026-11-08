import type { CSSProperties, ReactNode } from 'react'
import './device-frames.css'

interface BrowserFrameProps {
  /** Shown in the address bar. Use fictional `.concept` addresses for concept work. */
  url: string
  children: ReactNode
  tone?: 'dark' | 'light'
  className?: string
  style?: CSSProperties
}

/** A minimal desktop browser window around a page preview. */
export function BrowserFrame({ url, children, tone = 'dark', className, style }: BrowserFrameProps) {
  return (
    <div className={['browser', `browser--${tone}`, className].filter(Boolean).join(' ')} style={style}>
      <div className="browser__bar" aria-hidden="true">
        <span className="browser__dots">
          <i />
          <i />
          <i />
        </span>
        <span className="browser__url">{url}</span>
      </div>
      <div className="browser__viewport">{children}</div>
    </div>
  )
}

/** A phone body around a mobile page preview. */
export function PhoneFrame({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <div className={['phone', className].filter(Boolean).join(' ')} style={style}>
      <div className="phone__screen">
        <span className="phone__island" aria-hidden="true" />
        {children}
      </div>
    </div>
  )
}

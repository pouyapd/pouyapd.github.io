import { useEffect, useRef, type ReactNode } from 'react'

/**
 * A modal built on the native <dialog>: focus moves inside and is kept there,
 * Escape and a click on the backdrop close it, and focus returns to the
 * element that opened it. The content is only rendered while it is open.
 */
export function Dialog({
  open,
  onClose,
  label,
  className = '',
  children,
}: {
  open: boolean
  onClose: () => void
  label: string
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className={`cx-dialog ${className}`}
      aria-label={label}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
        // following a link out of the dialog: close it at once, so the page is never left with a modal open
        else if ((e.target as HTMLElement).closest('a[href]')) ref.current?.close()
      }}
    >
      {open && children}
    </dialog>
  )
}

/** The × button every dialog and drawer uses. */
export function CloseButton({ onClick, label = 'Close', className = '' }: { onClick: () => void; label?: string; className?: string }) {
  return (
    <button type="button" className={`cx-close ${className}`} onClick={onClick} aria-label={label}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </button>
  )
}

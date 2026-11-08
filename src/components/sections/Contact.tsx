import { useEffect, useState } from 'react'
import { vars } from '../../app/style'
import { site } from '../../config/site'
import type { PageContent } from '../../content/types'
import { Button, ButtonLink } from '../ui/Button'
import { Icon } from '../ui/Icon'
import './contact.css'

/**
 * Final call to action. There is no backend on GitHub Pages, so inquiries go
 * by email (pre-filled subject and a short brief template). To add a real
 * form later, see README → "Adding a form service".
 */
export function Contact({ content }: { content: PageContent['contact'] }) {
  const { email, emailSubject } = site.contact
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), 2400)
    return () => window.clearTimeout(t)
  }, [copied])

  const mailto = `mailto:${email}?subject=${encodeURIComponent(`${emailSubject} — ${site.name}`)}&body=${encodeURIComponent(content.emailBody)}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email)
      setCopied(true)
    } catch {
      // Clipboard can be blocked (permissions, insecure context); the address stays visible to copy by hand.
    }
  }

  return (
    <section className="contact section" id="contact" aria-labelledby="contact-title">
      <div className="container contact__inner">
        {/* left, the invitation and the address; right, what to put in the brief, then the studio elsewhere */}
        <div className="contact__lead">
          <p className="eyebrow" data-reveal>
            {content.eyebrow}
          </p>
          <h2 id="contact-title" className="contact__title" data-reveal style={vars({ '--reveal-i': 1 })}>
            {content.title} <span className="accent">{content.titleAccent}</span>
          </h2>
          <p className="contact__intro" data-reveal style={vars({ '--reveal-i': 2 })}>
            {content.intro}
          </p>

          <div className="contact__action" data-reveal style={vars({ '--reveal-i': 3 })}>
            <p className="contact__label">{content.emailLabel}</p>
            <a className="contact__email" href={mailto}>
              <span>{email}</span>
              <Icon name="arrow-up-right" />
            </a>
            <div className="contact__tools">
              <ButtonLink href={mailto}>{content.briefLabel}</ButtonLink>
              <Button size="s" icon={copied ? 'check' : 'copy'} onClick={copy} className="contact__copy">
                {copied ? content.copiedLabel : content.copyLabel}
              </Button>
              <span className="visually-hidden" role="status" aria-live="polite">
                {copied ? content.copiedLabel : ''}
              </span>
            </div>
          </div>
        </div>

        <div className="contact__side">
          <div className="contact__checklist" data-reveal style={vars({ '--reveal-i': 4 })}>
            <p className="contact__label">{content.checklistTitle}</p>
            <ol role="list">
              {content.checklist.map((item, i) => (
                <li key={item}>
                  <span className="contact__check-num">{String(i + 1).padStart(2, '0')}</span>
                  {item}
                </li>
              ))}
            </ol>
          </div>

          <div className="contact__social" data-reveal style={vars({ '--reveal-i': 5 })}>
            <p className="contact__label">{content.socialTitle}</p>
            <ul role="list">
              {site.social.map((s) => (
                <li key={s.href}>
                  <a href={s.href} target="_blank" rel="me noopener noreferrer" aria-label={`${s.label} (${content.newTab})`}>
                    <Icon name={s.icon} />
                    <span>{s.label}</span>
                    <Icon name="arrow-up-right" className="contact__social-arrow" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

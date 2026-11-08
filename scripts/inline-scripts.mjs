// The inline scripts a browser would execute in a page, and their CSP hashes. Shared by
// scripts/prerender.mjs (which writes the Content-Security-Policy) and scripts/check-dist.mjs (which
// checks it), so both always agree on what counts as an inline script.
import { createHash } from 'node:crypto'

/** <script> types a browser runs as JavaScript; any other type (application/ld+json, …) is a data block. */
const EXECUTABLE = /^(|module|text\/javascript|application\/javascript|text\/ecmascript|application\/ecmascript)$/i

/**
 * Every inline script that would run: any letter case, any attributes, without a src attribute and
 * with no type or a JavaScript type. Returns the text of each, as the page contains it.
 */
export function inlineScripts(html) {
  const out = []
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const attrs = m[1]
    if (/\ssrc\s*=/i.test(` ${attrs}`)) continue
    const type = attrs.match(/\stype\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i)
    if (!EXECUTABLE.test((type?.[1] ?? type?.[2] ?? type?.[3] ?? '').trim())) continue
    out.push(m[2])
  }
  return out
}

/** The CSP source for a script's text; browsers hash it with line breaks normalised to LF. */
export function cspHash(text) {
  return `'sha256-${createHash('sha256').update(text.replace(/\r\n?/g, '\n')).digest('base64')}'`
}

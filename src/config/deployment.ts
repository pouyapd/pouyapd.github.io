/**
 * Deployment settings — the single source of truth for where the site lives.
 *
 * Set SITE_URL (environment variable or .env file) to the public URL, with a
 * trailing slash. Everything else is derived from it:
 *
 *   SITE_URL=https://USERNAME.github.io/REPOSITORY/   -> base path "/REPOSITORY/"
 *   SITE_URL=https://example.com/                     -> base path "/"
 *
 * The GitHub Actions workflow fills SITE_URL in automatically from the Pages
 * settings (custom domain included). This file is imported by vite.config.ts,
 * so it must not use browser-only APIs.
 */
export const DEFAULT_SITE_URL = 'http://localhost:4173/'

export interface Deployment {
  /** Absolute URL with trailing slash, e.g. "https://example.com/". */
  siteUrl: string
  /** Path prefix for assets and links, e.g. "/" or "/repository/". */
  basePath: string
}

export function resolveDeployment(siteUrl?: string): Deployment {
  const raw = siteUrl?.trim() || DEFAULT_SITE_URL
  const url = new URL(raw.endsWith('/') ? raw : `${raw}/`)
  url.search = ''
  url.hash = ''
  return { siteUrl: url.href, basePath: url.pathname }
}

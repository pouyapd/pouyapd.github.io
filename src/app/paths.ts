/** Resolves a /public file against the deployment base path (works at "/" and "/repo/"). */
export function asset(path: string): string {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
}

/** Absolute URL for metadata (canonical, Open Graph). */
export function absoluteUrl(path = ''): string {
  return new URL(path.replace(/^\/+/, ''), __SITE_URL__).href
}

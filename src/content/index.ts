import type { PageContent } from './types'
import { en } from './en'

/**
 * Content by locale. To add Persian: create src/content/fa/index.ts with the
 * same PageContent shape, register it here, and build with site.locale set to
 * { lang: 'fa', dir: 'rtl' }. Layout styles use logical properties, so they mirror.
 */
const locales = { en } satisfies Record<string, PageContent>

export type Locale = keyof typeof locales

export function getContent(locale: Locale = 'en'): PageContent {
  return locales[locale]
}

export * from './types'

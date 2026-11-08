import { asset } from '../../app/paths'

/** Link to a page of a concept website: conceptHref('anar', 'menu') → /work/anar/menu/ */
export const conceptHref = (slug: string, path = '', hash = '') => asset(`work/${slug}/${path ? `${path}/` : ''}`) + (hash ? `#${hash}` : '')

/** Prices in the concepts are sample prices in euros. */
export const euro = (n: number) => `€${n.toLocaleString('en-GB', Number.isInteger(n) ? {} : { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

import type { ConceptModule } from './types'

/** Client-side: each concept website is its own chunk, loaded only on its pages. */
export const loadConcept: Record<string, () => Promise<ConceptModule>> = {
  lune: () => import('./lune/Lune').then((m) => m.concept),
  'maison-aurel': () => import('./aurel/Aurel').then((m) => m.concept),
  anar: () => import('./anar/Anar').then((m) => m.concept),
  tensile: () => import('./tensile/Tensile').then((m) => m.concept),
  'p-design': () => import('./pdesign/PDesign').then((m) => m.concept),
}

/** The source file of each concept, to find its built CSS in Vite's manifest (scripts/prerender.mjs). */
export const conceptSource: Record<string, string> = {
  lune: 'src/concepts/lune/Lune.tsx',
  'maison-aurel': 'src/concepts/aurel/Aurel.tsx',
  anar: 'src/concepts/anar/Anar.tsx',
  tensile: 'src/concepts/tensile/Tensile.tsx',
  'p-design': 'src/concepts/pdesign/PDesign.tsx',
}

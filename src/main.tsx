import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { App } from './app/App'
import { parseRoute, routeFromLocation, type Route } from './app/routes'
import { loadConcept } from './concepts/load'
import { getContent } from './content'
import './styles/index.css'

const root = document.getElementById('root')!
const route = (root.dataset.route as Route | undefined) ?? (import.meta.env.DEV ? routeFromLocation(import.meta.env.BASE_URL) : 'home')

// A concept website's code is its own chunk: load it before hydrating its page.
const page = parseRoute(route, getContent().work.sites)
const concept = page.kind === 'concept' ? await loadConcept[page.site.slug]?.() : undefined

const app = (
  <StrictMode>
    <App route={route} concept={concept} />
  </StrictMode>
)

// Production pages are prerendered (scripts/prerender.mjs) and hydrated; the dev server renders on the client.
if (root.firstElementChild) hydrateRoot(root, app)
else createRoot(root).render(app)

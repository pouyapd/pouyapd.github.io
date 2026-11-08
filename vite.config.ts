import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { resolveDeployment } from './src/config/deployment.ts'

/** In dev there is no prerender step, so give the page a title and favicon. */
function devHead(base: string): Plugin {
  return {
    name: 'p-design:dev-head',
    apply: 'serve',
    transformIndexHtml: (html) =>
      html.replace('<!--app-head-->', `<title>P. DESIGN (dev)</title><link rel="icon" href="${base}favicon.svg" type="image/svg+xml">`),
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const deploy = resolveDeployment(env.SITE_URL)

  return {
    base: deploy.basePath,
    plugins: [react(), devHead(deploy.basePath)],
    define: {
      __SITE_URL__: JSON.stringify(deploy.siteUrl),
    },
    build: {
      target: 'es2022',
      assetsInlineLimit: 0,
      // read by scripts/prerender.mjs to link each concept website's CSS in its static HTML
      manifest: true,
    },
    preview: {
      port: 4173,
      strictPort: true,
    },
  }
})

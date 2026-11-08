// Runs the browser tests (tests/e2e) against the built site: serves dist/ with
// `vite preview` unless E2E_BASE points at a server that is already running.
// Run `npm run build` first. Uses the installed Chrome (E2E_CHANNEL to change it).
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
if (!existsSync(path.join(root, 'dist/index.html'))) {
  console.error('dist/ is missing: run `npm run build` first.')
  process.exit(1)
}

const base = process.env.E2E_BASE ?? 'http://localhost:4173/'
const up = () => fetch(base).then((r) => r.ok, () => false)

let server = null
if (!(await up())) {
  server = spawn(process.execPath, [path.join(root, 'node_modules/vite/bin/vite.js'), 'preview', '--port', new URL(base).port || '4173', '--strictPort'], {
    cwd: root,
    stdio: 'ignore',
  })
  for (let i = 0; i < 100 && !(await up()); i++) await new Promise((r) => setTimeout(r, 200))
  if (!(await up())) {
    server.kill()
    console.error(`could not start vite preview at ${base}`)
    process.exit(1)
  }
}

const files = process.argv.slice(2)
const run = spawn(process.execPath, ['--test', '--test-concurrency=1', ...(files.length ? files : ['tests/e2e/*.test.mjs'])], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, E2E_BASE: base },
})
run.on('exit', (code) => {
  server?.kill()
  process.exit(code ?? 1)
})

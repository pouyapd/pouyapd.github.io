# Retired home-page components (October 2026)

Moved here, not deleted, when the home page was refocused (hero, Selected Work,
services, approach, studio, contact):

- `src/components/hero/HeroScene.tsx` + `scene/` — the real-time WebGL hero (slab, sphere, orbit ring).
  Replaced by a Blender render with restrained motion (`tools/scene/gateway.py`, `src/components/hero/`).
- `src/components/stage/` — the three-screens WebGL stage that opened Selected Work.
- `src/components/demos/` — the live service demos (Meridian site browser, type drum, Atlas app).
- `src/components/sections/ServiceVisuals.tsx` — the services' visual switch.
- `scripts/posters.mjs` — stills of those real-time scenes.

They are not built or linted (ESLint ignores `tools/`). To bring one back, move it to
its original path and re-add its imports.

# Retired hero (27 October 2026)

Moved here, not deleted, when the hero switched to the owner's own image
(`tools/hero/sunset-portal.png`, see `tools/hero/README.md`):

- `public/media/hero/gateway-*` — the Blender render of the stone gateway
  (`tools/scene/gateway.py` → `tools/scene/grade.mjs`) and its water masks.
- `public/media/hero/stage-*` — stills of the earlier three-screens stage (already unused).
- `src/components/hero/HeroMotion.tsx` — the WebGL layer that rippled the render's water.
  It needs a water mask, so it does not apply to a supplied photograph-like image.

The scene script and grading tool stay in `tools/scene/` (not part of the build).
ESLint ignores `tools/`, so nothing here is built or linted.

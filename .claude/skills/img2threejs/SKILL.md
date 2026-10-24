---
name: img2threejs
description: Rebuild the object in a reference image as a code-only, procedural, animation-ready Three.js model (img2threejs 2.0 by img2threejs, Apache-2.0, vendored; Python standard library) — staged sculpt pipeline (validate → quality contract → spec → blockout, structure, form, material, lighting, interaction, optimisation → review → rig) with a vision self-correction loop. Use when a film or site needs a real product, prop or character as live 3D built in code from a photo.
---
# img2threejs (vendored)
The full upstream checkout lives in `studio/toolkit/img2threejs/` (licence and pinned commit: `studio/toolkit/toolkit.json`; tests and CI removed).
Read `studio/toolkit/img2threejs/SKILL.md` and follow it **from that folder**: run its commands with that folder as the checkout,
e.g. `python studio/toolkit/img2threejs/forge/next.py --state <work>/.img2threejs/state.json`, and keep the run's state and outputs in the
film or site folder (`<work>` = e.g. `studio/film25/3d/<object>/`), never inside the vendored copy.

Studio adaptations:
- **Rights first:** the reference image must be the client's own product photo or licensed (skill `brand-kit`, `studio/ASSETS.md`); never
  rebuild a third-party product or character for a paid film without clearance.
- **Into a film:** the model is plain Three.js; the studio's GPU route vendors Three.js (`node studio/studio.mjs setup gpu`, examples/three-study,
  `config.gpu: true`). Render through the composer as a deterministic layer (time-driven, no `requestAnimationFrame` clocks).
- **Into a site:** stage C of `studio/web/WEB.md` (Three.js row): lazy-load, a still poster under `prefers-reduced-motion`, measured weight.
- Domain plugins (CS2, interiors…) and `npx img2threejs install` change the machine: owner's approval first. The vision loop uses your own eyes
  (or `film_stills` / `director inspect` for models without vision).

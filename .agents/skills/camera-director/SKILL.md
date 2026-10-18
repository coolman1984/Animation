---
name: camera-director
description: Compose motivated camera movement, shared layer parallax and selective focus without exposing photo limitations.
---
<!-- generated from .claude/skills by `node studio/studio.mjs agents --sync`; edit the source, not this copy -->
# camera-director
Operating policy: `studio/WORKFLOW.md`; load only the relevant department via `studio/SKILLS.md`.


Read CRAFT_GUIDE.md → Layers, depth, camera and focus.
Use lib/depth.js: projectLayer, depthScene, coverCamera, contactShadow. See studio/examples/depth-study/film.js.
Use lib/cinema.js for reusable deterministic camera choreography: cameraPath for settled multi-key moves, rackFocus for motivated focus pulls, microDrift only for tiny imperfection, composeCamera to combine offsets, and cameraKinematics for abrupt-motion diagnostics.
Named camera moves and cuts with exact timings: Motion Prompt #025–#048 and Cinetic's camera/transition techniques (`node studio/studio.mjs moves search dolly zoom`, `moves show 32`; studio/library/README.md).
Prefer a purposeful move that settles over permanent motion. Keep lensBreathing subtle; it is graphic compensation, not a claim of optical simulation.
Hero depth=1; smaller depth moves less. All layers share one camera; typography stays outside its focus filters.
Keep pan/zoom restrained to source resolution and reconstructed background coverage. Static holds are allowed and logged in config.holds.
A single flat photo cannot support an orbit or a new viewpoint. No forced breathing merely to pass freeze detection.
Rack focus needs a reason and enough sharp viewing time afterward. Never blur the entire frame or the logo overlay as a shortcut.
Match product position/scale across a cut. Inspect extreme positions, transition midpoint and full-resolution edges.

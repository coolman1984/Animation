---
name: animation-lab
description: Prepare photo layers and inspect alpha edges/clean plates; animate only supported source detail.
---
# animation-lab
Operating policy: `studio/WORKFLOW.md`; load only the relevant department via `studio/SKILLS.md`.


Read CRAFT_GUIDE.md → Layers, depth, camera and focus.
Existing image lab: lib/imagelab.mjs + imagelab-page.html; film-specific plates.mjs owns source dimensions and measured masks.
pathMask supports geometric paths; applyMask uses the mask's ALPHA (white on transparent, not opaque black/white).
Colour mattes work only when source/background support separation. fillHoles is blurred texture fill, not semantic reconstruction.
Inspect lab.matteSheet(cutout): light/dark/magenta sheet + alpha counts. Review pixels at 100%, logo, lid and translucent edges.
Do not automatically remove watermarks or infer rights. Use authorized, clean sources; keep license/client material out of public git.
Backgrounds must cover extreme layer movement. No translucent duplicate subject left in the repaired background.
Preserve real product geometry and printing. If extraction fails, use the intact photo with a suitable graphic treatment.
Reuse cached plates; regenerate only when sources/masks change. Prepared layers can use depthScene for animation.
No engine migration or new package without a concrete unmet need. Check current engine licenses before adopting one.

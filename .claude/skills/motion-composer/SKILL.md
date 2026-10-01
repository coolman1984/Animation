---
name: motion-composer
description: Build deterministic film.js scenes with reusable layer cameras, motivated transitions and readable Arabic.
---
# motion-composer
Operating policy: `studio/WORKFLOW.md`; load only the relevant department via `studio/SKILLS.md`.


Contract: export default { duration, fps, init(stage,{W,H,variant}), render(t,frame) }.
Every frame is a pure function of time: no accumulated transforms, random(), wall clock or autonomous CSS animation.
Read WORKFLOW.md; use motion.js for tracks/text/easing and depth.js for shared camera/parallax/focus.
See studio/examples/depth-study/film.js and CRAFT_GUIDE.md → Motion and edit.
Pick one motion language and at most two transition families. Prefer motivated cuts, match cuts and occlusion wipes.
No universal entrance duration, required grain/vignette, compulsory animation on every object or blanket fade to black.
Readability takes priority: establish the frame, move attention, settle. Text outside scene focus layers; words never split into letters.
Check backward seeking and worker-independent frames. QA changed intervals plus transitions; full artistic review only at delivery.

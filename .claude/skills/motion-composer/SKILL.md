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

**Showreel-proven recipes (see studio/TECHNIQUES.md):** the SVG helper `el()` only draws tags in its list (text/textPath/polyline/polygon added) — test a new tag on a frame. Directional blur = per-id `feGaussianBlur stdDeviation="x y"` driven by velocity, zero when settled. Variable-width type via `fontVariationSettings 'wdth'`; letters as spans, never Arabic letter-splitting. Measure text only while visible (hidden = 0 px). Declare intentional dark openings with `darkSpans`, stillness with `holds`.

**Film 5 additions (studio/TECHNIQUES.md → Film 5 recipes):** marquee bands for the unsafe zones of a Reel, FLIP card fly (labels above moving cards), arch portal via clip-path path(), diagonal split swap, blurred-cover + faded window for portrait macros from a square photo, decorative words above (not behind) the product, exit animations must not cross the safe edge.

**Product-UI promos:** `lib/uimotion.js` (tilted 3-D cards, typewriter + caret, headline stack that dims older lines, orbiting/scattering icons, UI wall with travelling spotlights, pulse ring); study `examples/ui-motion-study`; whoosh = `zoomContinuation`. Arabic types by word, never by letter.

**Chrome titles / living posters:** CSS chrome stack (extrusion shadows, gradient-clipped fill, reflection bands, rim stroke, travelling specular sweep) in `film6/film.js`; keep the logo locked and let light travel. Recipe in TECHNIQUES.md → Living poster.

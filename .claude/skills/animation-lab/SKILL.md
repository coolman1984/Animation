---
name: animation-lab
description: Stand-alone motion pieces and plates — cut-outs and clean plates from photos in a headless canvas lab, kinetic type, SVG shapes/morphs, liquid, pearls, leaves; when to reach for Remotion/HyperFrames/Manim. Use for shots that are not screen captures.
---
# animation-lab

## Image lab (zero packages)
`node studio/<film>/plates.mjs` runs canvas jobs inside Chromium (`studio/lib/imagelab.mjs` + `imagelab-page.html`):
- `pathMask` (measured polygon/Bézier, feathered) for geometric products — measure on gridded 1:1 crops
  (`ffmpeg … crop, drawgrid=w=20`), iterate with `overlay()` checks. Film 2 cup: 2 rounds to fit the lid dome + bottom ellipse.
- Colour-model mattes for smooth backgrounds: luminance ratio + hue distance vs a filled background model; ignore
  faint watermarks (same hue, ~10 % darker); close holes (`morph` ±7); add a solid core polygon.
- Clean plates: `fillHoles()` = multi-radius normalized convolution (blur of the known pixels ÷ blur of the mask).
- Text removal from posters: colour-threshold the letters, dilate 5 px, `fillHoles`.
- Flatten background-like pixels inside a matte to the plate colour so nothing ghost-like moves.

## Code-drawn elements
Pearls (radial gradient + spec highlight, depth blur), leaves (SVG path + gradient, heavy blur = defocus), liquid
band (two wavy surfaces), line-art windows (stroke-dashoffset draw), light sweeps (gradient masked by the cut-out's alpha, screen blend).
Avoid cheap particles, lens flares, shakes, spinning logos.

## When to use other engines
Remotion: many data-driven variants from one template (licence: free ≤ 3 employees). HyperFrames: HTML/GSAP
catalogue blocks. Manim: maths/diagram explainers. Not needed for photo-based ads — the composer covers them.

## Checklist
1. Masks checked on overlays at 1:1. 2. Plates fill behind every moving layer. 3. No halos on dark tests.
4. Watermarks handled. 5. Logo matte crisp. 6. Elements seeded (deterministic). 7. Defocus by depth.
8. No cheap effects. 9. Plates regenerate from source by one command. 10. Sources + plates listed in ASSETS.md.

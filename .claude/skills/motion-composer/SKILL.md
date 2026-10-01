---
name: motion-composer
description: Build a film as a pure renderAt(t) page — layers, photo cameras with parallax, kinetic Arabic type, masks, liquid/arch transitions, grain, vignette. Use when composing or editing any film.js.
---
# motion-composer

**When:** writing/editing `studio/<film>/film.js`. Engine: `studio/lib/composer.html` + `studio/lib/motion.js`.

## Contract
`export default { duration, fps, init(stage, {W,H,variant}), render(t, frame) }`. `render` must be pure in `t`:
no `Date.now()`, no `Math.random()` (use `rng(seed)`), no CSS transitions/animations. Cut-downs come free:
`?segments=a-b,c-d&fadeOut=s` remaps time in the composer.

## Toolkit (`lib/motion.js`)
`ease.outExpo / inOutCubic / outBack / inOutSine` · `ramp(t,a,b)` · `prog(t,a,b,fn)` · `track(keys,t)` ·
`textLine(parent, text, style)` + `playLine(L, t, tIn, tOut, opts)` (word stagger, RTL) · `grain()` · `show()` (keeps flex display!) · `wavePath`.

## Motion language (pick once)
Entrances ease-out-expo 0.9 s · exits ease-in-out-cubic 0.5 s · word stagger 60 ms · back-out only for dots, "×",
pills · never two big moves at once · nothing appears without an entrance · finished frame 1 · one fade at the end.

## Photo layers & camera
`photo(parent, src, w, h)` + `place(layer, {cx, cy, s}, p)`: source point (cx, cy) at frame centre at scale s.
Depth `p < 1` = parallax (bg 0.88, carton 0.97, cup 1). Clamp with `fill()` so the frame is always covered.
Max upscale of a photo ≈ 1.5× (film 2: 1.5 on 1600 px source still reads sharp under grain).

## Type (Arabic)
El Messiri 600 for display (72–96 px at 1080 w), Aref Ruqaa 700 for calligraphic accents, Plex Arabic for small UI.
Each word is its own span (shaping intact). Lines are `display:flex; direction:rtl`. Key words ≥ 40 px, captions ≥ 24 px.
Cream text on photos gets `text-shadow` + a gradient band; teal on peach needs none (contrast 5.9:1).
Ruqaa stacks some words ("تستنى") above the baseline — check it, swap to El Messiri if it reads as an error.

## Signature transitions (film 2)
- Isolation: world fades around the product, product stays put (match cut into a studio backdrop).
- Brand-shape portal: the logo's arch draws (stroke-dashoffset) then becomes a `clip-path: path()` that grows.
- Liquid wipe: a band between two wavy surfaces sweeps up (SVG path per frame) + bubbles.
- Falling pearls over a hard cut. - Line-art window + railing in front of a cut-out; morphs into the end-card frame.

## Pitfalls seen
- `show(el, true)` that resets `display:''` killed flex centering → `show()` now remembers the element's display.
- Callout labels need room: compute space = anchorX − line − margin before choosing font size.
- A ghost watermark that includes the wordmark reads as clutter behind a product → clip it to the symbol.

## Checklist
1. Pure render. 2. Frame 1 finished. 3. Text ≥ 1.8 s. 4. Product never covered. 5. Cameras clamped.
6. One big move at a time. 7. Grain + vignette. 8. Previews at ≥ 20 times read at 100 %. 9. `textBoxes()` clean. 10. One fade at the end.

## Worked example
`studio/film2/film.js` (7 scenes, ~560 lines).

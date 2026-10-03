---
name: brand-kit
description: Turn a client's real assets into camera-ready brand tokens — colours, type, logo matte, motifs — without hard-coding any brand into the engine. Use when starting a film for a new brand.
---
# brand-kit
Operating policy: `studio/WORKFLOW.md`; load only the relevant department via `studio/SKILLS.md`.


## Steps
1. Sample colours from the **real product** (not concept boards): film 2 logo teal `#1F5E55`, matcha `#A8C66C`,
   light matcha `#C9DD93`, cream `#F6EEDF`, ink `#0E1F1C`, peach `#F1C7A3`. Keep them in the film module's `C` object.
2. Logo matte: project each pixel onto the background→logo colour line → alpha, upscale 4× with blur 1.2 px and a
   smoothstep on alpha (crisp edges at 2–3× the source size). See `studio/film2/plates.mjs` §4. Export white + brand-colour versions.
3. Type: at most two font roles; add a third only for a real need, all OFL, vendored in `studio/assets/fonts`, licences in ASSETS.md.
4. Motif from the logo (film 2: arched balcony window → portal transition, line-art frame, end-card arch).
5. Contrast check every text/background pair ≥ 4.5 : 1.

## Rules
- Never redraw or "improve" a client logo; extract it.
- When assets disagree (spelling, logo versions) use the one on the real product and list the conflict for the owner.
- Engine files (`lib/`) never contain brand values.

## Checklist
1. Colours sampled. 2. Logo matte white + colour. 3. Fonts vendored + licensed. 4. Motif chosen. 5. Contrast ok.
6. Conflicts listed. 7. No brand in lib/. 8. ASSETS.md updated. 9. Logo ≥ 150 px wide on 1080 frame. 10. Logo checked at 1:1.

**Raster-only logo (film 6):** trace it faithfully instead of redrawing — `python3 studio/tools/logo_trace.py <logo> <film>/plates --crop=…` (general version of `film6/logo_trace.py`; look at its `logo-check.png`) (coverage from the local max of distance-to-white, potrace on a 4× upsample, difference overlay against the source, colour plate with the white fringe inpainted). Render letters as `<img>` + `clip-path: path()` so `ready` awaits them; animate per letter or assemble from sampled pixel cells.

**Multi-colour icon (film 7):** when parts of the logo must animate separately, split by colour class instead of by outline — `film7/icon_trace.py` (hue/saturation classes on the inpainted plate, Gaussian-smoothed masks, connected components, potrace per piece, pieces share one colour plate under `clip-path: path()`). Look at `icon-check.png`. If an overlapping part cuts another with a white halo, keep the halo (stroked underlay) and bridge the hidden stretch while the part is shown alone. White-on-dark source lettering: normalise to coverage 0–1 and invert before tracing. List every logo/descriptor conflict across the owner's boards in the BRIEF.

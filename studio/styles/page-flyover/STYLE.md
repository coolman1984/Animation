# Page Fly-over — style card
> A real web page lies on a studio floor as a 3D set; one continuous camera glides over it, rises, and dives into the hero.
> Source film: film 24 (academy landing page). Route: **bespoke** (rung 3: `film24/`, WebGL2).

## 1. Essence, and what it is not
- The real page, captured (Playwright, DPR 2), with its floating pieces lifting toward the lens as the camera passes. One shot, no cuts.
- Not a screen scroll, not a mock-up in a laptop frame, not a fast cut montage.

## 2. Materials & rendering
- Page quad on a pale floor with a soft wide shadow and 24 px corners; pieces as their own quads; razor-thin depth of field;
  16 subframes summed in linear light before one DOF pass; shadows as soft rounded-rect SDFs that fade with the page.

## 3. Colour logic
- The page's own colours on a near-white floor (#F9FBFB → #F2F3F6); nothing added except the end title.

## 4. Type
- End title only: a sans (Geist 500) + an italic serif tail (Instrument Serif). RTL word order checked in the end title.

## 5. Motion
- Constant cruise speed measured on the page (≈ 580 px/s here); pieces start their stand early so they never add a surge; flow-check the camera.

## 6. Camera grammar
| Move | Expresses | Serves |
|---|---|---|
| Backwards glide at a steady speed | a tour | the page's sections |
| Rise to overhead | the whole | the turn |
| Dive into the hero | arrival | payoff |

## 7. Sound palette
- A short original score with the glide as a pad, a lift on the rise, an impact on the dive. Openverse first for whooshes.

## 8. Native moves
- A floating piece becomes the end-card element. Logo tiles leave beside the hero button and stay to the end.

## 9. Pitfalls
- Shadows that square off or outlive the page; a piece that tilts up during acceleration (reads as a surge); retime to the real page length.
- Mark the long take as `craft.oner` so the storyboard lint accepts it.

## 10. How to build it here
- Rung 3 from `film24/` (capture.mjs, flowcheck.py); needs a reachable page and CPU WebGL time.

## 11. Variation space
- Any long page or document: a menu, a report, a portfolio. Landscape or 5:4.

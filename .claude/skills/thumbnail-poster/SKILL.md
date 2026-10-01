---
name: thumbnail-poster
description: Pick and check thumbnails and the poster frame — 3 candidates, ≤ 4 words, contrast, safe areas. Use at delivery time for any film.
---
# thumbnail-poster

## Recipe
- 3 candidates taken from the master at moments where ≤ 4 words are on screen and the product is sharp
  (film 2: 1.6 s "مش أي ماتشا…", 15.8 s "جوز الهند × الماتشا", 53.0 s product name). `cfg.thumbs` in `<film>/config.mjs`.
- Poster = the end card fully built (film 2: 55.5 s: logo + arch + name + CTA).
- `stillAt(video, t, out)` in `studio/lib/finish.mjs` (JPEG q2).

## Checks (numbers)
Text contrast ≥ 4.5 : 1 (cream on dark ≥ 10 : 1, teal #1F5E55 on peach ≈ 5.9 : 1) · product ≥ 35 % of frame ·
nothing inside the platform UI zones (Reels bottom 35 %) · readable at 25 % size (view the contact sheet tile).

## Checklist
1. Three candidates. 2. ≤ 4 words each. 3. Product sharp. 4. Contrast ok. 5. Safe areas. 6. Brand visible.
7. No mid-transition frames. 8. Poster = finished end card. 9. JPEG ≤ 1 MB. 10. Named thumb-1..3.jpg.

---
name: camera-director
description: Plan and bake camera moves — push/pull, follow, look shots, beat-cut reframes, parallax depth, zoom limits, smoothing. Use when a shot needs framing or feels static/pumping.
---
# camera-director

**When:** any shot in a composed film or a captured UI that needs framing.

## Camera model
`{ cx, cy, s }` in source pixels (see `place()` in `studio/film2/film.js`). Screen = (src − c)·s + frame centre.
Per-layer depth `p`: `s_l = s^p`, centre moves `p×` as far → parallax without 3D.

## Limits & moves (numbers)
- Stills: max 1.5× upscale; min scale so the frame is covered (`fill()`).
- UI capture: desktop follow ≤ 1.4×, phone ≤ 1.16×, look shots ≥ 1.24×.
- Every shot moves: slow push/pull 5–15 % over the shot, ease-in-out-sine; pans ≤ 6 % of frame width per second.
- Pull-back hook: start close (1.5×) on texture, settle wide (0.98×) by the first bar line (film 2 0–5.3 s).
- Match cut: end one shot and start the next with the product at the same screen position & scale.
- Beat-cut reframes inside a long scene — but a punch-in on the *same still* reads cheap (judge, film 2 take01); prefer a new angle or a new scene.
- Follow a moving subject with a lagged path (swing close-up follows the cup 0.35 s behind).
- Breathing ≤ 0.4 % so no frame is frozen; smoothing σ ≈ 0.5 s for event-driven tracks; fill gaps < 1.2 s
  between actions so the camera never pumps.

## Pitfalls
- Centering on a subject near the image edge shows black → clamp (film 2 montage shot 1 did this until `fill()`).
- Parallax on cut-outs reveals filled background near edges — keep relative scale difference small (≤ 2 %).

## Checklist
1. Every shot has a move. 2. Upscale ≤ 1.5×. 3. Clamped. 4. Eases, no linear starts. 5. No pumping between actions.
6. Match cuts aligned. 7. Reframes on beats. 8. Parallax subtle. 9. Text zone kept clear by framing. 10. Checked on a 6 fps strip.

## Worked example
Film 2 `camS1`, `camS2` (match cut from S1 end), `camS3` (pull-out through the portal), `SHOTS` (montage).

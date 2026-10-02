# CRAFT — what the studio has learned (short, specific, with numbers)

## Film 2 — BALACONBAR 60 s Facebook ad (2026-10-01)
1. **Brand by frame 1 for free:** open on the product that carries the logo (cup at 1.5×) — no logo card needed; ABCD's "brand ≤ 5 s" is met at 0.0 s.
2. **Match-cut isolation** (fade world, keep the product pixel-locked) is the cheapest premium transition: 0.45 s, no new asset.
3. **`show()` must restore the element's own display.** Resetting to `''` turned flex lines into blocks and pushed every centred Arabic line to the right edge (preview 1).
4. **Callout space = anchorX − line − margin.** At 58 px "لبن جوز الهند" needs ~320 px; with the cup at x 715 / s 1.04 and a 140 px line it fits at 52 px.
5. **Photos: ≤ 1.5× upscale**, and clamp every camera to the image (`fill()`); centring on pearls near the bottom edge showed black until clamped.
6. **Ghost watermarks:** clip the wordmark off a background logo; "BALACON" peeking behind the product read as clutter.
7. **Aref Ruqaa** stacks some words above the baseline ("تستنى") — beautiful on short accents ("مستنياك.", "فيها حكاية."), wrong-looking on others; check every Ruqaa line at 1:1.
8. **Two stacked lines need ≥ 10 px between DOM boxes** — the overlap gate caught 5–9 px collisions on two pairs.
9. **Film grain is expensive to encode:** CRF 14 → ~26 Mbps (200 MB / 60 s). The 27 MB 2-pass share copy (3.4 Mbps) must be checked at 1:1.
10. **Render speed:** 4 Chromium workers on 4 cores ≈ 5 fps at 1080×1350 (60 s ≈ 6 min). Full make (3 versions + mastering) ≈ 11.5 min.
11. **Audio without ears:** spectrogram + per-stem waveforms + `lowpass=40,volumedetect`; FM Rhodes at 1:1 makes DC → high-pass 90 Hz. SFX bus needed ×2.6 to be audible next to the music.
12. **Dead air shows up in 6 fps strips, not in single frames:** the window draw started 0.8 s after the cut into a dark backdrop — moved to start 0.25 s *before* the cut.
13. **Dissolves between two different shots of a product must be pixel-matched on the logo**, computed per frame when the source is moving (swing rotation) — "approximately the same place" reads as a doubled cup to a strict eye (judge J2).
14. **Hold the camera still until a dissolve has finished**, then move. Moving during the dissolve re-introduces the double image (end card, J2).
15. **In a "chocolate café" ad, glossy brown spheres read as truffles**, not boba — pearls must be near-black, low shine, and never over the product.
16. **A mood visual of a different drink gets ≤ 2 bars** and should hand over to the real product on screen (swing → real cup).
17. **Independent judge rounds pay:** round 1 found 1 blocker + 5 majors that all 25 automatic gates passed. Gates catch numbers; only eyes catch "text on the logo" and "two cups".

### Reels (9:16) from the same film
18. **Design area in the middle, picture bleeds out:** the 1080×1350 design sits at stage y 285; every backdrop is a bleed div (y −285 … 1635 in design units) and every photo camera goes through `fill()` against that band. Cut-outs need no change.
19. **A 1600² photo can't fill 1080×1920 below 1.2×** — wide two-product framings crop on 9:16. Push in through transitions (portal: 1.04 → 1.26 while the arch opens) so coverage is reached by the time the frame is full.
20. **Safe band (Meta unified): x 65–1015, y 269–1248.** Texts moved up/in per scene; the end card was scaled 0.755 as one group instead of re-laying each element. The text gate now takes the safe rectangle per delivery.
21. **Variant code must not leak:** a regression run (stills vs the delivered master, PSNR) caught two 4:5 changes (an 8 px line move, backdrop clamps). Any shared-code edit → PSNR check ≥ 35 dB against the last master at 8 times.

## Principles learned from reference studies
Consult `reference/lessons.json` only when its evidence-backed principle is relevant to the current
craft decision. Learn the timing/composition principle and its counter-case, not reference appearance.
No required lesson quota or automatic reuse of a prior visual style.

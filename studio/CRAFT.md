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

## Showreels (2026-10-02)
22. **A showreel proves one skill per bar:** identity, easing, morph, systems, depth, kinetic type, finale — each on a 1.875 s bar at 128 BPM. Viewers read the index label, not a list of claims.
23. **Type scale is the biggest fidelity lever:** the critic scored ~65 % until cards filled 44–94 % of the frame width and letters changed width in a wave; structure and palette were already ~85 %.
24. **Measure text only while it is visible:** hidden cards measured 0 px and never appeared (`layout6`). Show → measure → hide.
25. **A tool can fail silently:** SVG `text` was not in the element helper's tag list, so the rotating ring vanished with no error. Verify new element types on a frame before building around them.
26. **Declare intent for gates:** an intentionally dark opening failed the black-frame gate; the fix was a tested `darkSpans` option, not loosening the gate.
27. **Check fixes on the exported mp4,** not the preview path; use a "deliberate non-defects" list so the critic does not re-report the iris rim or a mid-hit blur.
28. **Be honest about "exactly":** structural fidelity (order, timing, palette, type roles) is deliverable; pixel equality, source code and audio are not.

## Film 5 — BALACONBAR Beni Suef 25 s Reels ad (2026-10-02)
29. **A square photo cannot fill a 9:16 frame at 1.5×:** a 1600² photo gives only a 1280 px window for 1920 px. Cover the rest with a blurred 3.4× copy and fade the sharp window (macro cuts, `film5/film.js` montage).
30. **Decorative words hidden behind the product vanish:** swap stacked words one at a time above the product, and keep labels above any flying card (menu scene).
31. **Use marquee bands for the unsafe 35 % of a Reel:** the safe band stays clean while the top/bottom zones still carry motion; the owner's mixed image sets (misspelt "BALAKON BAR") are cropped to avoid every baked word.

## Studio upkeep (2026-10-02)
32. **Fix a tool that cries wolf:** one false sync note ("1033 ms off" for a hit that was exactly at 0) cost a manual investigation; the onset detector now starts at frame 0 and a test guards it.

33. **Make UI feel alive by never leaving it flat:** cards tilted 7–20° with a ±1° drift, a typewriter with a caret, and one idea per 1–2 s beat read as a modern product promo; stacked lines that dim as the next arrives guide the eye (`lib/uimotion.js`).

34. **Measure before you copy a rhythm:** the SaaS promo's "fast cards" were exactly one per beat at 128 BPM and the second headline line came half a beat later; eyeballing stills had guessed 1–2 s. Use `reference.mjs timeline/track/audio` first.

## Film 6 — Pixel Plus 30 s Reels showreel-ad (2026-10-03)
35. **One hero object beats a montage of effects:** the logo's own i-dot carried all 30 s (portal, ad frame, ball, toggle knob, button, and finally the logo's dot), so every transition was motivated and the payoff ("pixel by pixel") wrote itself.
36. **Banding can come from the colour conversion, not the encoder:** dark saturated radial glows stepped into chroma rings after a plain RGB→yuv420p conversion; a dither layer in the picture did not help; error-diffused conversion via 10-bit (`config.dither`) did. Check dark gradients with a levels-boosted crop of the exported file.
37. **Line boxes, not glyphs, trip the overlap gate:** big Arabic headlines with line-height 1.35 overlapped their second line by 4–17 px of empty box; line-height 1.12/1.2 fixed it without moving a glyph.

## Live-action toolkit (2026-10-03)
38. **Analyse once, render from cached data:** MediaPipe's face landmarker is non-deterministic in VIDEO mode; run IMAGE mode per frame, smooth with a 1€ filter and store JSON — the render reads the pack and stays deterministic.
39. **Offline editing can look ahead:** forward-backward smoothing gives a reframing camera with zero lag (it moves with the subject, not after him), reset at every cut; a dead zone removes micro pans.
40a. **Windows port (2026-10-03): run the real pipeline, not only the unit tests.** Unit tests passed on Windows while real builds would have failed on missing `rm`/`mv`, `/dev/null`, FFmpeg glob and Fontconfig. Real renders also exposed two cross-platform bugs: B-frame edit lists rounded to 1 ms at every worker join, and a last-frame seek that returned no frame. Measure the gap (`ffprobe` packet pts) before blaming the OS.
40b. **"Silent success" is the expensive failure:** a PNG still that exits 0 without a file, a profile delete wrapped in `try {}`, a CLI guard that never matches. Each of these looked fine. Add an existence/regression check where a step can fail quietly.
40. **Headless capture has two traps:** a detached `<img>.decode()` may never resolve (use `createImageBitmap`), and stacked CSS `drop-shadow` filters on a full-frame layer froze screenshots for > 90 s (draw strokes on canvas). Bisect with a skip switch, do not just add retries.


Consult `reference/lessons.json` only when its evidence-backed principle is relevant to the current
craft decision. Learn the timing/composition principle and its counter-case, not reference appearance.
No required lesson quota or automatic reuse of a prior visual style.

29. **Artistic intent is a contextual hypothesis.** A visible push/hold is evidence; increased importance/inspection is a likely intention with alternatives and a counter-case. Null means unobserved, not calm. Contrast may earn attention; speed and decoration alone do not certify retention or premium quality. Schema tests prove validation, not taste.

30. **Owner asks; agent produces.** Reference paperwork, creative choices, proofs and judging are internal agent tasks. Use ownerRequest for exactly one target canvas/duration/fps; deliver one final video, not a pile of variants or a manual checklist.

31. **Failed startup must release every resource.** A capture server opened before Chromium must close if launch fails; otherwise the test/process hangs after the real error. Never mark incomplete capture complete. One startup retry is bounded recovery, not relaxed film acceptance.

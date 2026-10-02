# TECHNIQUES — reusable recipes with numbers

Field-tested in `showreel/` and `showreel2/`. Each: what it is → how → watch out. Code references are real files/functions.
Your film may use none of them; they are tools, not a house style.

## Time and sync
- **One grid for picture and sound.** 128 BPM → beat 0.46875 s, bar 1.875 s, 1/8 note 0.234 s. Define `BEAT` once; scene starts = bar lines; type cards = 1/8 notes. `score.mjs` places hits from the same numbers (`placeCues(fx, plan.cues)`).
- **Recording clock ≠ film clock.** When recreating a screen recording, the recording starts late (≈ 0.35 s here). Measure the offset on a hard event (first impact), then express every time in film seconds.
- **Everything pure in t.** Springs via `springStep(t - start, {duration, bounce}).value`; classic eases written out (`outBack`, `outExpo`, `outElastic`, `outBounce`, `inOut3`) so six dots can race with real curves.

## Picture
- **Directional blur** (`dblur(node, id, bx, by)` in `showreel2/film.js`): one `<filter>` per id with `feGaussianBlur stdDeviation="x y"`. Drive blur from velocity, not time; blur must be 0 when settled or the result looks soft in the final hold.
- **Width-axis kinetic type:** variable Archivo, `fontVariationSettings: 'wdth' 62…125, 'wght' 900`; letters in spans; each letter's width follows a smooth wave (`1 − 0.55·sin²(π·p)`) staggered 0.07 s. Cards use width + font-size fraction of frame (`frac` 0.44–0.94) so each word fills differently. Re-fit with `fitWord` after changing width.
- **Measure while visible.** Layout of hidden (`display:none`) text returns 0. `layout6` shows every card, measures, then hides — otherwise cards were invisible.
- **Procedural burst glyph** (`burstPath(n,R,seed,grow,spin,inner,width)`): n rounded spokes with seeded length jitter; grow/spin animate. Original geometry — no logo reproduced.
- **Truchet field with waves:** per-cell rotation/flip, three colour waves at 0.38 s offsets; print the live tile count in the HUD (true data, not decoration).
- **570-vertex mesh → sphere → torus:** 30×19 grid, `project5(T)` perspective, trails from `project5(T − 0.04)`; keep trails and captions in different screen areas.
- **Shape morph:** polar radius functions (`RAD`: circle/triangle/square/star) interpolated per angle, spring on progress, `clamp` the spring so no overshoot blur.
- **Iris reveal:** circle clip ramp 0.2 s on the downbeat + a rim that exits ≈ 0.2 s later (a diagonal cream/blue sliver in corners is the rim leaving, not a defect).
- **HUD overlay:** persistent index label, timecode, fps, BPM + bar n/8, progress line, registration brackets; colour switches only outside hand-off windows (index must never be paper-on-paper).
- **End lock-up:** confetti fades 14.25 → 14.7, credit fades in 14.35 → 14.6; hold ≥ 0.6 s logged as a `holds` span.

## Sound (code-synthesised)
- Riser into the first impact; groove with i–VI–III–iv colour (Dm9/Bbmaj9/F6/9/Gm9); breakdown bar before the drop; 1/8-note hits under type cards; linear-frequency sine sweep for a word about linearity; bloom impact + bell chord + sparkles for the end; fade to silence by the last frame.
- Leave master headroom: final mix measured −14.1 LUFS / −3.2 dBTP after mastering.

## Gates and tooling
- **`darkSpans`** (`lib/measure.mjs`): declare intentional near-black passages (`[[0,0.7],[1.7,1.95]]`) per delivery or config; shifted automatically for `--range`. Use only for deliberate dark openings, never to hide a bug. Companion to `holds` (intentional stillness).
- **SVG tags:** `el()` in `lib/motion.js` needs the tag in its list — `text`, `textPath`, `polyline`, `polygon` were missing and rendered nothing without error.
- **`settleCapture`** (`lib/cdp.mjs`): first screenshot after load may be torn; retry until two consecutive captures match.
- **No raster history:** avoid `will-change` and rest transforms; they make seek order change pixels (≤ 1 level on ≤ 3 % of pixels is tolerated in the determinism test).
- **Fractional viewports** (337.5 px) must be `Math.round`-ed before CDP.
- **Read-back for graphic type:** kinetic type drawn as graphics is not tracked by text read-back (0 lines is expected); check it with frames instead.

## Review recipes (cheap and effective)
- Extract the acceptance frames **from the exported mp4**, not from the preview path: `ffmpeg -ss T -i master.mp4 -frames:v 1 f.png`, then a strip with `hstack`/`tile`.
- Build matched boards (reference frame above, ours below, same timestamp after offset) to judge timing and scale; take a crop of the HUD at 1:1.
- Give the critic: brief, reference pack, boards, exported frames, and a list of deliberate non-defects, so it does not re-report them.
- Record each finding as time → issue → severity → fix → result *on the exported file*.

## Reference recreation checklist
1. Never copy the player chrome (play bar, rounded frame, speaker icon, counter) — crop or ignore it.
2. Fix the clock offset first. 3. Read palette from large flat areas, not from anti-aliased text.
4. Use density grids for fast sections (6 grids for 15 s was enough). 5. Hypotheses only: observed result, likely technique, confidence, alternatives.
6. Own geometry, OFL fonts, own score. 7. Say exactly what fidelity means (structure, timing, palette, type roles) and what is not claimed (pixel equality, code, audio).

## Film 5 recipes (25 s Reels ad, `film5/film.js`)
- **Two worlds on one grid.** OLD = paper gradient + 90 px arabesque pattern (two radial gradients), film strip (perforations from `repeating-linear-gradient`), polaroid, seeded scratches/dust/light-leak (`filmLook`, `hash(frame, i, k)`), gate weave (`noise1`), Aref Ruqaa. NEW = green fields, crisp cut-outs, Archivo width axis, lime. One colour bloom (`sepia 1 → 0`) turns the old frame into the new one.
- **Tape rewind exit** (1.55–2.0 s): desaturate + sepia ramp, `drop-shadow(±7..16px)` red/cyan split driven by `noise1`, rolling noise band, horizontal jitter, white flash on the cut.
- **FLIP card fly:** each card slams at the centre (spring scale 1.9 → 1, ±9° rotation) and flies to its row slot with `inOutCubic`; labels need a higher z-index than every moving card or the flying cards cover the next label.
- **Dotted-eighth cuts:** 0.375 s = 3/4 of a beat at 120 BPM; five cards fit 1.875 s and the groove feels syncopated against the 4/4 maqsum.
- **Marquee bands** (`marquee()` + `marqueeRender()`): outlined or filled text, `translateX(-(t·speed mod unit))`, unit measured once in render. Used to fill the unsafe top/bottom zones with motion instead of content.
- **Arch portal:** `clip-path: path('M x0 yb L x0 top+r A r r 0 0 1 x1 top+r L x1 yb Z')` on the depth scene; two offset gold outlines echo the edge; width/height spring from 180×400 to 880×1100.
- **Diagonal split swap:** `clip-path: polygon()` on the old layer, split position springs between stops on every beat (`stops` table), gold line on the edge, Truchet tiles (seeded rotations, quarter-turn on each beat) on the old side.
- **Portrait macro from a square photo:** 1600² at 1.5× gives a 1280 px window for a 1920 px frame. Fill the missing area with the same photo scaled 3.4× + `blur(36px)` and fade the sharp window with `mask-image: linear-gradient(transparent, #000 10%, #000 90%, transparent)`.
- **Words above, not behind, a product:** stacked decorative words hid behind the cup; swap one word at a time in the same spot above the product (hide/show per beat).
- **Safe-area gate vs exit animation:** an exit that rises 10 px crossed y = 269 on the last frame; keep `exitRise` ≤ 3 near the safe edge.
- **Score:** darbuka maqsum on an eighth grid (`[D,T,-,T,D,-,T,-]`), D hijaz arps/pad, `lpSweep()` time-varying one-pole low-pass (radio opening into the drop, tape spinning down), ping-pong stabs (±0.8 pan), snare roll with accelerating spacing, bell chord on the logo. Cue-sheet impacts must not be duplicated in `score.mjs` (identical seeds double the level).

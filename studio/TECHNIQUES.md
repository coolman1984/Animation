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

## Artistic reference grammar → original direction
Use reference/artistic.mjs (ARTISTIC_FORENSICS.md): five passes, 20 sections, 1–48 adjacent whole-film intervals; subjective 0–5 curves with null for unknown, 8–24 important observations recommended (80 maximum), 1–12 principle-to-original-execution transformations. Playback required for temporal ratings; available listened audio required for sound ratings. Compare hook/proof/payoff hierarchy and emotional intent, not identical pixels.

Low-effort forensics: analyze → prepared private draft with <=12 real interval groups / suggested evidence → inspect → one decision with multiple topics → autoSections report → original direction. prepare refuses overwrites and never claims candidate evidence was viewed.

Owner-facing workflow: AUTONOMOUS_FILM.md — one natural-language request, agent completes every internal step, one finished video. lib/build-options.mjs ownerRequest enforces exact single-delivery width/height/duration/fps.

Capture startup reliability: create the server, launch inside cleanup protection, close the server even on startup/client-close failure. cdp.mjs permits one bounded retry only for transient Chromium startup failures, never for failed product verification.

## Tooling speed without quality loss
- **Bounded pool for independent extractions** (`pool()` in `lib/review.mjs`): N separate ffmpeg processes, each writing its own file, results kept in input order. Same bytes, less wall time (evidence 104 s → 71 s). Seeking a CRF 14 master is the cost, not the decode of one frame.
- **Onsets from frame 0:** an opening impact is a real onset; local-max windows clamp at the start instead of skipping frames.

## Product-UI promo grammar (learned from a 15 s SaaS promo, 2026-10-02; kit: `lib/uimotion.js`)
Reference facts (observed on stills + numbers; motion/audio not played): dark navy radial field with sparse twinkling specks; 15.5 s; a beat every ~1.1–2.2 s; one idea per beat.
| Observed move | Native recipe |
|---|---|
| UI cards live in 3-D (input bar, app window): tilted ~7–20°, slow resting drift, never flat | `planeTransform` + `tiltSettle` (spring from a stronger tilt/offset/negative z) + `planeDrift` (±0.6–0.9° sine drift) |
| Typewriter in the input bar with a caret, then the Send button pulses | `typeOn` (Latin by grapheme, Arabic by whole word), `caretVisible` (solid while typing, blinks after), `typeEnd` to cue the press/transition |
| "Whoosh" into the next scene: the card zooms/blurs away, the next scene resolves from blur | `applyTransition('zoomContinuation', …, { factor: 2.4, maxBlur: 14 })` (already in the transition vocabulary) |
| Provider logos orbit the window at different depths, then scatter outward blurred | `orbitPoint` (depth drives scale/opacity/blur, z-order flips at the front/back of the orbit) + `scatterOut` (stagger 0.03 s) |
| Left copy / right UI card layout; tiny tracked eyebrow, then a white line and a blue line rising out of a mask | `stackLines` (clip/rise/blur per line) + one eyebrow line; the card slides in from the right with a tilt that flattens |
| Rows inside a UI card appear one by one (API keys, list items) | `stagger` from `kinetics.js` per row, 0.1–0.2 s apart |
| UI wall: dozens of dim windows on a steeply tilted plane, 2–3 lit like spotlights that travel, slow push-in, centred headline over it | `wallCells` + `litCells` (epoch cross-fade, seeded) on `perspective(1000px) rotateX(42deg) rotateZ(-12deg)`, `scale 1 → 1.08` |
| Centred statement stack: each new line dims the older ones to ~50 %; the last line (blue) is biggest/brightest; badges and a trust line fade in last | `stackLines(..., { dimTo: 0.5 })` |
| Logo outro: one thin ring expands from the icon, the icon springs in, the wordmark reveals left to right, tagline and URL pill follow, then the end loops back to the opening bar | `pulseRing`, spring on the icon, `clipInset` wipe for the wordmark; end the film on the opening frame for a loop |
Taste notes: the reference never uses more than two type families, no frame borders and no confetti; colour = navy + one blue + white, with a single warm icon as accent.
Counter-case: a calm luxury product should not use the whoosh/orbit energy; the kit is for tech/UI explainers.

## UI-morph showreel grammar (two owner references, measured 2026-10-03; film: `film6/film.js`; reusable kit: `lib/uimorph.js`, `tools/logo_trace.py`)
Reference facts (`reference.mjs timeline/audio` + 30 fps strips): 0 hard cuts in 20 s and 15 s; one black container on warm off-white springs between
shapes (button → spinner → check → player card → volume pill → toggle …) in 0.2–0.27 s with motion blur; old content blurs out first (≈3 frames),
new content blurs in staggered (≈5 frames); a cursor causes every change; holds 0.5–1.5 s; both tracks 120 BPM (bar 2.0 s).
| Move | Native recipe |
|---|---|
| One container that becomes the next UI | per-property `springTrack([[t, value], …], t, {duration ≈ 0.42–0.45, bounce 0.14–0.18})` for w/h/radius/x/y — retargeting carries momentum; `mblur()` = summed per-property speed × 1/1100–1/1500 → CSS blur ≤ 4–5 px; colour via `mixHex` |
| Content swap | old content opacity/blur out over 0.1 s, new in over 0.15–0.2 s from blur 8 px, staggered rows (tiles 0.08 s apart) |
| Cursor | arc path (`cursorAt`: ease-in-out + perpendicular sine offset), dip to 0.8 on click, a ring at the tip (0.45 s) |
| Portal dive | click → camera scales the scene around the clicked pixel (1 + 2.4u²) while the pixel grows exponentially to 5200 px and becomes `inset(... round r)` clip of the next world |
| Circle wipe from an object | the object first lands exactly on the wipe centre at the same size; radius ease-out ×1.08 of the cover radius so it completes before the cut-over |
| Dark-mode toggle wipe | knob slides (spring 0.3 s), track darkens first, then the dark world opens from the knob |
| Pixel assembly of a logo | sample the traced logo on an 11 px grid (1,699 cells), quadratic-bezier flights from the burst point with a perpendicular swirl offset, `springStep` progress (0.55 s, bounce 0.16), random 0.02–0.32 s delays biased by distance; mosaic dissolves cell by cell into the crisp vector letters |
| Animator's in-jokes | onion skin = 6 outlined ghosts 2 frames apart; spacing chart = one dot per frame along the path; squash on contact anchored at the floor, stretch along velocity |
| Pixel grid motif | square 4 px dots every 54 px on every world; ripples (`exp(-((d - v·t)/band)²)`) on landings, seeded twinkles keep holds alive |
Counter-case: the grammar is calm and precise; it is wrong for loud retail promos.

### Film 6 encode and review recipes
- **`config.dither: true`** for films with dark or saturated slow gradients (radial glows): error-diffused RGB→YUV via 10-bit (`encodeFilter` in `lib/render.mjs`). Same file size; check `crop` + `-level 0%,18%` on the exported master and share copy.
- **Faithful logo trace:** `film6/logo_trace.py` — coverage from local max of distance-to-white (handles dark, grey and blue strokes alike), potrace at 4×, colour plate with the fringe inpainted, letters as `<img>` + `clip-path: path()` (awaited by `ready`, unlike SVG `<image>`).

## Live action: real people + animation (2026-10-03; full guide `LIVE_ACTION.md`, example `live1/`)
- **Matte sandwich:** plate canvas → behind layer (words, bursts, far half of an orbit) → cutout canvas (frame × matte alpha) → front layer (near half, labels). Depth split for orbits: `sin(angle) > 0` → front canvas.
- **Frame break:** clip the plate to a rounded card (`clip-path: inset(... round 48px)`), leave the cutout unclipped, put the card's top edge below the chin → the head pops out with no double image.
- **Sticker outline:** hard silhouette (alpha ≥ 50 %) tinted white, drawn at 12 offsets of 6–7 px under the person on the same canvas.
- **Word timing for scripted ads:** VAD groups = sentences (longest gaps), words spread by spoken length (letters + 1.5), boundaries anchored on ≥ 30 ms gaps 22 dB under speech, re-spread between anchors: median 0.03 s.
- **Ducking:** `sidechaincompress=threshold=0.025:ratio=6:attack=15:release=350` with the voice as key, music −9 dB before; measured > 4 dB extra drop under speech in the test.
- **Energetic bed fitted to an edit:** pick the tempo from the cut grid (cuts every 1.8 s → bar 1.8 s → 133⅓ BPM) so each scene change is a downbeat; four-on-the-floor + clap 2/4 + 16th hats, supersaw I–vi–IV–V-style loop with sidechain pump, a two-phrase hook (A asks, B answers); a freeze-frame = musical stop (tape-stop stab + riser + snare roll), the unfreeze = the drop (`live1/score.mjs`).
- **Recurring hook across chapters (film6 v2):** keep the picture grid, write one two-bar hook, re-voice it per chapter and build each drop with an accelerating snare roll + riser; two chords per bar (Am–F | C–G) keeps a 2 s bar moving (`film6/score.mjs`).
- **Conform 12 → 30 fps:** `minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1` (smooth, can warp limbs; RIFE is the upgrade); `fps=30` repeats frames honestly.


Commands (optional Python: numpy, scipy, OpenCV, librosa — `pip install -r reference/requirements-optional.txt`; the doctor lists them):
```bash
node reference.mjs timeline <pack|video> [--crop=x,y,w,h]                     # moving/still spans, hard cuts, energy chart
node reference.mjs strip <pack|video> --range=a:b [--crop=...]                 # every decoded frame, real timestamps
node reference.mjs track <pack|video> --roi=x,y,w,h [--ref=t] [--range=a:b]    # per-frame position/scale + fitted easing per move
node reference.mjs audio <pack|video> [--range=a:b]                            # tempo, grid, drums, key/mode, chords, melody, sections, SFX
```
- **Every frame, real timestamps:** variable-frame-rate recordings are timed by decoded PTS, not by an assumed fps.
- **Easing fit with its own keyframes:** each model is fitted together with its start t0 and duration D (an ease-out reaches 99 % long before its last key). Candidates: linear, power in/out/in-out 2–5, expo, sine, back-out, spring (→ `springStep {duration, bounce}`), free cubic-bezier (→ `cubicBezier`). A visible overshoot ranks the spring first.
- **Proven on clips with known answers** (`test/forensics-tools.test.mjs`): keyframes within one frame (0.508–1.284 s for a true 0.5–1.3 s quint ease-out, recognised as `out5`), spring 0.58 s / bounce 0.27 for a true 0.6 / 0.3; audio: 119.9 BPM for 120, key A minor, chords Am→F→G→Em, four-on-the-floor kick after the drop, the drop section at 8.29 s for 8.25 s.
- **Audio extras for our region:** a mode hint from the flat 2nd and the 3rds (film 5's score reads "Hijaz / Phrygian dominant"), 16-step drum patterns per bar (kick / snare-clap / hats from the percussive layer).
- **Limits:** a speech transcript needs a speech model; the model hosts (huggingface.co, openaipublic.azureedge.net) are blocked by this environment's network policy. Taste and mood still need a human ear and eye.

### Measured on the SaaS UI promo (replaces the earlier estimates)
| What | Measured |
|---|---|
| Music | 127.97 BPM (beat 0.469 s, bar 1.875 s), A major; typing clicks on 1/8 notes in the intro, groove from 1.28 s, rising sweeps before ~3.0 s and before ~13.1 s, breakdown 13.17 s, silence from 14.95 s |
| Edit | hard cuts at 3.95, 5.83, 9.58, 11.44, 13.19 s; inside the card section a change lands every 0.46–0.50 s = **one card per beat** |
| Headline lines | each line rises out of its mask in ≈ 0.10 s (6 frames at 60 fps); the second line starts 0.233 s after the first = **half a beat** |
| UI card entry | 0.20 s, 23 px slide + 1.2 % scale, ease-out close to `outExpo` (fit `cubic-bezier(0.33, 0.61, 0.03, 0.82)`), no overshoot |
| Dropdown expand | 0.10 s, `out5`-type, 64 px |
| UI wall | continuous slow drift 9.58–11.44 s (the only long moving span), exit at 11.44 s |
Rule taken: in a beat-driven UI promo, put every content change on the beat and every secondary element on the half beat; keep entries ≤ 0.2 s with an expo/quint ease-out.

## Calm premium brand film: night → dawn (2026-10-03; film `film7/`)
- **Ground rises along the line:** one line function `lineY(x, t)` drives the drawn line, the objects riding it and the ivory world's clip polygon (`clip-path: polygon()` of the region below the line, bottom edge first, then the line); chips follow with tilt = slope, lift and fade by words.
- **Weights on a line:** per-weight spring × Gaussian bump (`118·spr(t,tk,.6,.3)·exp(-((x-xk)/185)²)`) gives overshoot and a shared sag; chips fall with ease-in over 0.36 s, land with squash anchored at the bottom.
- **Outline-to-fill:** SVG `pathLength=1` + dash offset draws the outline; a faint full blueprint underlay first (so early fragments read as construction), fill fades in 0.3 s, halves lock with a spring.
- **Path draw by clip polygon:** offset the dense centre line ±w along the normal, add round caps, set `clip-path: path()` on the group; nonzero fill unions the self-crossing at the infinity's crossing. Pen of light = a radial glow at the head.
- **Logo pieces by colour:** `film7/icon_trace.py` (class masks → components → potrace); overlapping parts keep their white halo as a stroked underlay.
- **Keeping holds alive without decoration:** two large soft glows orbiting slowly (amplitude 150 px, ω 0.55–0.8) are enough for `freezedetect`; no particles needed.
- **Score:** story-timed groove (96 BPM): E7 → C (deceptive resolution) on the dawn, a 0.15 s cut of every bus + a 0.5 s breath before it, one hook voiced per chord (`HOOK[chord]`) so any chord order stays coherent.
- **Cutting a section without re-authoring:** render the scene on its long timeline with `t < cut ? t : t + skip`, compose the score on the long timeline too and splice it on a bar line (equal-power 20 ms crossfade), mapping cue times back (`film7/score.mjs`).

## Formal pitch film: the production-line rail (2026-10-03; film `film8/`)
- **Statements as stations:** a rail along the bottom with numbered, labelled stations; the brand object travels station to station (spring per station, hop + squash on arrival); the visited part fills with the brand gradient and flowing dashes keep the line "running" (also keeps holds alive for `freezedetect`).
- **Two-column 16:9 layout:** statements right-aligned in x 1000–1800 (RTL), visuals in x 140–880; keep headlines ≤ 84 px so long Arabic lines never cross into the visual column.
- **Copying a reference's argument, not its claims:** transcribe it (`tools/live.py transcribe`), map each statement to the client's true equivalent, and replace any claim the client cannot make ("and many more") with an honest forward line.

## Calm educational reel without music (2026-10-03; film `film9/`)
- **Letters that decode:** per character, show `GLYPHS[hash(i, frame)]` until its resolve time (`t0 + i·0.09`), deterministic per frame; strike the old word with a gold bar measured from the word's rect.
- **Causes as dendrites:** cubic branches from the subject's head to each list chip, drawn just before the chip lands, with a spark travelling the same Bézier.
- **Effects-only sound:** a very low room tone so silence is never dead, one effect per on-screen event, and `tanh` soft limiting before normalisation (sparse transients overshoot the true-peak ceiling when mastered to −16 LUFS).

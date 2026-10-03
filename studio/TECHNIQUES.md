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
- **Duration gate is frame-accurate** (`lib/measure.mjs`): |probe − brief| ≤ 1/fps + 30 ms (one AAC packet of container slack). The old ±10 % let a 30 s film be 3 s off.
- **Exact slice timescales** (`lib/render.mjs`): worker slices are written with `-video_track_timescale` and `-movie_timescale` = fps × 1000. With B-frames (review/final) the edit list is stored in the movie timescale, 1000 by default, so each slice lost up to 1 ms and every join shifted later frames (FFmpeg 9: 15 frames probed 30.039 fps). Now 60/60 frames sit on the 1/fps grid with 4 workers.
- **Seek 1 ms early for stills** (`ss()` in `lib/review.mjs`, `stillAt` in `lib/finish.mjs`): input `-ss` returns the first frame with pts ≥ target, and `t.toFixed(4)` can land just past a frame (3.9667 > 3.96667). For the last frame that decoded nothing: JPEG output failed with a misleading "Non full-range YUV" error, PNG output exited 0 without writing a file.

## GPU engines in the composer (2026-10-03; studies `examples/three-study`, `examples/pixi-study`)
- **Install and import:** `node studio.mjs setup gpu` pins Three.js 0.186.1 and PixiJS 8.22.0 into `vendor/` (git-ignored). The composer import map lets films write `import * as THREE from 'three'`, `'three/addons/…'`, `'pixi.js'`. Three's addons import the bare name `three`, so a relative path alone fails.
- **Determinism:** no ticker or animation loop.
  - Three: build the scene in `init`; in `render(t)`, set poses and camera from t, then call `renderer.render()`.
  - Pixi: `await app.init({ autoStart: false, preference: 'webgl', preserveDrawingBuffer: true, resolution: 1 })`, then `parts.update(); app.render()` per frame.
  - Proof: the same frame from two separate browser runs gave identical PNG hashes for both studies.
- **Look on software WebGL:** use a PMREM `RoomEnvironment` for metal/glossy products and ACES tone mapping with sRGB output. A radial-gradient plane gives the contact shadow (shadow maps are costly and noisy on SwiftShader). PixiJS handles 20,000 `Particle`s in one `ParticleContainer` with `dynamicProperties: { position, color }`.
- **Framing:** the first three-study frame put the title over the bottle. Moving the camera from 7 to 9.5 and looking 0.8 lower freed the copy band. Check framing on stills before motion, as usual.

## Colour, review, voice (2026-10-03)
- **Colour round-trip:** a 24-patch chart is encoded with the film's exact `encodeFilter`, x264 at CRF 14, then decoded with BT.709/tv.
  - Result: ΔE76 mean 0.70 / max 1.22, and 0.54 / 1.07 with `dither`. Under 1 is invisible.
  - Re-run `node studio.mjs color check` after any encoder change.
- **LUT in FFmpeg on Windows:** `lut3d=file='D\:/path with spaces/x.cube'`. Use forward slashes, escape the drive colon, and quote the path.
- **OCIO without config files:** `ocio://studio-config-latest` (OCIO 2.6) bakes `.cube` LUTs, e.g. ACEScg → "sRGB - Texture".
- **One launch for many scopes or measurements:** use a `select=eq(n\,N)` branch per moment. `measureAll` adds a `signalstats` branch for legal range.
  - `metadata=print` with several `key=` options keeps only the LAST key: print everything and parse it.
- **Review player:** a `<video>` needs HTTP Range to seek frame by frame (`lib/review-server.mjs`).
  - Seek to `(n + 0.5)/fps` so the shown frame is exactly n, and display the floor frame.
  - Approval stores the file's SHA-256; a re-export voids it.
- **Windows TTS:** OneCore voices (Microsoft Hoda ar-EG) are visible only from PowerShell 7 (`pwsh`). In Windows PowerShell 5 a failed `SelectVoice` silently fell back to an English voice that rendered Arabic as 0.3 s of silence.
  - Set `$ErrorActionPreference='Stop'`.
  - Make SSML `xml:lang` the voice's locale (`ar-EG`).
  - Never use `prosody rate="0%"`: it dragged a 3 s line to 9.5 s. Use "default" or a signed percentage.
- **Mixed-language ASR:** Whisper picks one language per decode. Decode each VAD phrase separately with `language=''` and the English sentence inside Arabic speech survives.
- **Mono check baseline:** identical L/R measures exactly 3 LU lower when folded to mono, so only warn beyond 4.5 LU.
- **Blocked downloads:** if `raw.githubusercontent.com` is blocked, take the same file from the project's PyPI wheel (`pip download <pkg> --no-deps`, then unzip the one file).

## Memory, crashes and hangs (2026-10-03, after two renders killed the host session)
- **Commit, not RAM, is the limit on Windows.** 15.7 GB RAM but a FIXED 2 GB page file → commit limit 17.7 GB; with the host app, the owner's Chrome and services committed, only ~1.7–3 GB remained. Six Chrome workers (1080p, SwiftShader) exhausted it: node died with a native out-of-memory stack and the host application was killed too. `memoryBudget()` (lib/platform.mjs) reads free RAM AND commit free (one PowerShell CIM call); headroom = the smaller one.
- **Workers are sized, never requested blindly:** `plannedWorkers()` = floor((headroom − 3 GB reserve) / per-worker), per-worker ≈ 0.45 GB + 0.5 GB when `gpu` + 10 frame buffers (1080p 3D ≈ 1.03 GB), capped at cores − 1 and the request. `STUDIO_WORKERS=n` forces. make logs the decision and `measure.json` records `render.workers`.
- **Orphans:** every launched browser is registered in `takes/.studio-procs.json` (lib/procs.mjs: pid, parent, profile). The next launch reaps entries whose node is dead (`taskkill /T /F` on Windows, profile removed); a `process.on('exit')` hook kills this run's browsers. `node studio.mjs cleanup` does it on demand and reports headroom. Measured leftovers before this: 32 Chrome processes, 1.9 GB, one hung node.
- **Hangs become errors:** every CDP request has a deadline (90 s, `STUDIO_CDP_TIMEOUT`), page loads 45 s, and a closed socket or an exited browser rejects everything in flight. Abandoned screenshot retries carry a `.catch` so a late timeout is never an unhandled rejection.
- **Resume:** slices (`<out>.slices/sNN.mp4`) survive a failed run; `key.json` holds {content key, worker count, fps, range}. The next run with the same key reuses complete slices (ffprobe packet count) and renders only the missing ones. Slices are deleted only after a successful join.
- **Lazy chapters:** a scene with `lazy: true` builds itself on its first frame (film7's 3D chapter: WebGL renderer, PMREM, geometry ≈ 0.5 GB), so workers whose slice never reaches it pay nothing. Proven: 79.5 s rendered alone under lazy init is byte-identical to the eager render; rendered after another frame it differs by 1 pixel × 1 level (PSNR 116 dB), the known raster-history tolerance.
- **One way to render long films:** `node studio.mjs build <film> [make flags]` reaps orphans, prints headroom, runs make.mjs as a child and tees EVERYTHING (including a native crash message that make itself can never log) into `takes/<film>/build-full.log`; make also keeps `takes/<film>/build.log`. Never again a `Select-Object -Last N` on a render: it dropped the crash reason.
- **The owner's one-time fix:** set the Windows page file to system-managed (or ≥ 16 GB). The doctor's "Memory headroom" row says FIXED while it is not; with it, this machine can run 3–4 workers instead of 1.

## Cross-platform (Linux CI + the owner's Windows machine, 2026-10-03)
All OS differences live in `lib/platform.mjs`; `test/platform.test.mjs` fails on a regression.
- **Browser:** `STUDIO_CHROMIUM`, else Linux paths, Windows Chrome/Edge under Program Files / LocalAppData, macOS Chrome. Get the version from DevTools `/json/version`: on Windows `chrome.exe --version` opens a window.
- **Closing Chromium** (`shutdown()` in `lib/cdp.mjs`): send `Browser.close` on the browser websocket, wait for the exit, then delete the profile with `maxRetries`. A bare kill left helper processes holding the profile and our stderr pipe: 69 orphaned profiles (746 MB) in one day and a ~17 s wait before node could exit.
- **Builds run a lighter doctor** (`doctor({ optional: false })` from `make.mjs`): no Python imports, no GPU test-encodes, no `takes/doctor.json` overwrite. The first frame's width gate in `render.mjs` still enforces the device scale. A build's tool check went from 31 s to about 10 s here; each `ffmpeg`/`ffprobe` spawn costs about 1.1 s on this machine.
- **Main-module check:** `isMain(import.meta.url)` (`pathToFileURL`), never the raw `` `file://${process.argv[1]}` ``: on Windows with spaces in the path the CLI body silently did nothing.
- **Python:** `PYTHON` = `STUDIO_PYTHON`, else `python` on Windows (`python3` is the Microsoft Store stub), else `python3`. Python tools reconfigure stdout/stderr to UTF-8 and open text files with `encoding='utf-8'`: Windows defaults to cp1252, and `≈` or Arabic crashed `audio_deep.py`.
- **FFmpeg:** `os.devNull` for the first pass of a two-pass encode. Use a concat list, not `-pattern_type glob` (Windows builds lack glob). Give `drawtext` an explicit `fontfile=` (Windows builds have no Fontconfig configuration, and the process crashed). Use forward slashes in concat lists and page URLs (`slash()`).
- **Files:** `node:fs` (`rmSync`, `renameSync`), never `execFileSync('rm'|'mv')`. Use `statfsSync` instead of `df`.
- **Test env:** `npm run test:render` loads `test/render.env` with `node --env-file`, not the POSIX `VAR=1 cmd` syntax.
- **One OpenCV package per Python environment:** mediapipe brings `opencv-contrib-python`. Installing `opencv-python-headless` and `opencv-python` as well overwrites the shared `cv2` folder.

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
- **One decode, many images** (`grab()` in `lib/review.mjs`, 2026-10-03): every review still, strip frame, crop, raw contrast/thumbnail buffer and the contact sheet come from one `split` → `select=eq(n\,N),setpts=0,…` graph. Strips hstack their own branches, so a frame may repeat. Long graphs are chunked to stay under the Windows command-line limit. This replaced the earlier `pool()` of one ffmpeg launch per image (39 launches for a 4 s clip). Review evidence went from 23 s to 4 s on the owner's machine.
- **Process launches are the cost on Windows:** even `cmd /c exit` takes 0.8 s here, and node, python and ffmpeg each take 0.9–1.4 s. Count them with an `--import` preload that wraps `child_process` (NODE_OPTIONS) before optimising anything else. A fresh 4 s review build went from 61 launches / 78 s to 24 / 46 s, using `grab()`, `measureAll()` (loudness + freeze + black in one pass, numbers identical) and `buildCheck()`, plus a one-process `vm.SourceTextModule` syntax check reused while the files are unchanged.
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

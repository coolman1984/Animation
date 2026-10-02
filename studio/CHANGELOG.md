# CHANGELOG — how the studio evolved

Newest first. One entry per closed scope: what changed, what it proved, what stayed unverified.
Operating rule: **a scope is not closed until this file, `../STATUS.md` and every doc/skill the scope touched are updated**
(`test/docs.test.mjs` enforces the checkable part). Evidence lives in each film's `LEDGER.md`; techniques in `TECHNIQUES.md`;
lessons in `CRAFT.md`. Renders (`out/`, `takes/`) are never in git.

## 2026-10-02 — Film 6: living poster (chrome title in space), studied from an album teaser (scope DONE)
Owner request: analyse a supplied video, explain how it is made, make a similar one with a better design.
- **Analysis with the new tools:** the reference is a static chrome album poster whose picture is ONE 6.0 s loop repeated 5× (frame t ≈ t+180, residual = codec noise); the letters never move (per-pixel change map); music 144.7 BPM stops at 23.9 s of 30 s.
- **Film:** `film6/` — 1080×1080, 15 s, 128 BPM, `ownerRequest` single delivery; procedural nebula/stars/planet, CSS chrome lettering (extrusion, gradient fill, reflection bands, rim, travelling specular sweep), beat glints, anamorphic flares, original synthwave score.
- **Gates:** all PASS (take05). One gate fix (Arabic line 4 px outside the safe area). Two correction rounds on living motion; the measured resting motion stayed calmer than the reference (0.57 vs 1.06), kept deliberately for hierarchy. A third render repaired a regression of round 1 (title touching the frame edges) and is disclosed in the ledger.
- **Tooling:** bare-video forensics now write to `studio/takes/forensics/` (git-ignored) instead of the working directory.

## 2026-10-02 — Precise forensics tools: exact motion timing, easing curves and measured music (scope DONE)
Owner request: tools to see motion timing and easing precisely and to understand audio; overcome capability gaps.
- **Installed** (optional, per `reference/requirements-optional.txt`): OpenCV 4.10 headless, PySceneDetect 0.7 (numpy/scipy/librosa already present). The doctor now lists the importable forensics modules.
- **`tools/motion_curves.py`** + `node reference.mjs track|timeline|strip`: every decoded frame with its real timestamp; drift-free multi-scale template tracking forwards and backwards from a reference time; moves segmented to one frame; easing fitted together with keyframe start/duration (linear, power, expo, sine, back-out, spring, free cubic-bezier); charts drawn with OpenCV for visual inspection.
- **`tools/audio_deep.py`** + `node reference.mjs audio`: tempo by line fit through the beats + grid phase locked to percussive transients, downbeats, 16-step kick/snare/hat patterns, key with a mode hint (Hijaz/Kurd/major/minor), chord per beat, melody (pYIN, only when a lead exists), sections/builds/drops, silences, SFX candidates, voice likelihood; one-axis spectrogram/chroma/drums/loudness chart.
- **Validated on known answers** (`test/forensics-tools.test.mjs`, 2 tests; CI's Python job installs the same modules): keyframes within one frame, ease-out quint and spring 0.6/0.3 recovered; tempo, key, chord order, kick pattern and drop recovered. Three tool bugs found during validation and fixed before shipping (move target = resting position, not the first zero-velocity point; centred step bins; tempo from a line fit instead of a quantised estimate).
- **Applied to the SaaS UI promo:** measured music/edit/easing facts replace the estimates (`TECHNIQUES.md`).
- **Still not possible here:** speech transcription (speech-model hosts blocked by the network policy); listening for taste.
- `npm test`: 92 tests, 78 passed, 14 skipped, 0 failed.

## 2026-10-02 — Reverse-engineered a SaaS UI promo and added the product-UI motion kit (scope DONE)
Owner request: reverse engineer the new screen recording, learn all its moves, add them to the studio.
- **Analysis:** `reference.mjs analyze` (machine pack, private, git-ignored) + dense 0.25 s grids of the content area; stills inspected (no playback/listening). Result written as the move table in `TECHNIQUES.md` → "Product-UI promo grammar".
- **Studio bug found and fixed:** recordings whose audio runs longer than the picture made the probe use the container duration, the sampler asked for a frame past the last video frame and the whole `analyze` crashed ("Error opening input … f007.png"). `mediaProbe` now uses the video-stream duration and `frame()` steps back 0.2 s once. Regression test `test/reference-media.test.mjs` fails on the old code.
- `npm test`: 90 tests, 76 passed, 14 skipped, 0 failed; `STUDIO_RENDER_TEST=1 examples.test.mjs` 4/4 (includes the new study).
- **New module `lib/uimotion.js`** (pure in t, seeded): `planeTransform`, `tiltSettle`, `planeDrift`, `typeOn`, `caretVisible`, `typeEnd`, `stackLines`, `orbitPoint`, `scatterOut`, `litCells`, `wallCells`, `pulseRing`. 8 unit tests (`test/uimotion.test.mjs`).
- **New study `examples/ui-motion-study`** (7 s, any aspect): exercises every primitive plus `zoomContinuation`; covered automatically by the real-browser determinism test (forward/reverse seek identical).
- Already in the studio and reused, not duplicated: `zoomContinuation`, `cameraPass`, springs, `stagger`, `clipInset`.
- Not claimed: no film was made; motion and audio of the reference were not played; `reference/lessons.json` stays empty (its `learn` command needs inspected playback).

## 2026-10-02 — Project optimisation and taste guard (scope DONE)
Owner request: review the whole project to optimise without lowering quality, and add the two taste rules.
- **Faster review evidence:** `lib/review.mjs` runs its independent ffmpeg extractions through a bounded pool (4): 103.6 s → 71.1 s on film 5's 141 MB master; all 96 evidence files and review.json byte-identical to the sequential version. Runs after every review and final export.
- **Fewer tokens every session:** STATUS.md (read first by every session) 12.6 KB → 3.5 KB; full evidence moved verbatim to `STATUS_HISTORY.md`.
- **One false alarm removed:** onsets are measured from analysis frame 0 (`lib/musicmap.mjs`); a cue at t = 0 no longer reports "1033 ms off". New test fails on the old code.
- **Taste guard** in `WORKFLOW.md`: two type families; no default decorations without a reason. Guidance only (no new step, check or loop).
- Considered and rejected (cost > benefit): a 1–10 scoring loop until 8+ (unbounded rebuilds), Playwright/Remotion installs (own CDP renderer already covers them), JPEG capture for finals (would lower quality), shorter keyframe interval for faster seeking (bigger masters).
- `npm test`: 81 tests, 67 passed, 14 skipped, 0 failed.

## 2026-10-02 — Film 5: BALACONBAR Beni Suef, 25 s Reels ad (one 9:16 delivery)
Owner request: a dynamic 25 s ad for the café in Beni Suef using the owner's four images (real photo, swing poster, AI storyboard, vintage board), everything the studio learned,
retro/80s nostalgia mixed with 2026 motion, exciting original music, ONE video in Reels shape. Source: `film5/` (BRIEF, production.json, film.js, score.mjs, plates.mjs, crops.sh, LEDGER).
- **Film:** 12 scenes on a 120 BPM grid (bars of 2 s): hook, zaman (old), naharda (new, swing), ingredients, menu (dotted-eighth cards), place, sensory, montage (1/8 cuts), arch portal, collide (old vs new split), brand, hold.
- **Score:** original jeel-synth in D hijaz with darbuka maqsum; radio low-pass for the old world; drop at 4.0; hits on the menu, montage and logo.
- **New recipes** (see `TECHNIQUES.md` → Film 5): tape-rewind exit, FLIP card fly, marquee bands, arch portal clip-path, diagonal split swap, blurred-cover portrait macros, `lpSweep` in the score.
- **Process:** builder stills loop (3 layout rounds before any render), draft 16 s, review build (1 gate fail: arch title 4 px outside the safe area; fixed), final build take03, one separate critique pass of the exported frames, one correction round → take04 (all gates PASS, −14 LUFS, share copy 11.45 MB).
- **Main merged in (PR #12: artistic forensics, autonomous delivery, Chromium startup retry):** film 5's render path is untouched — 12 stills rendered before and after the merge are byte-identical; `npm test` 80 tests, 66 passed, 14 skipped, 0 failed; `film5/config.mjs` now declares `ownerRequest` (one delivery, exact size/duration/fps) and `buildOptions` accepts it and refuses a mismatch. The shared-lib change invalidates the cache, so the next film 5 build re-renders (take04 stays valid).
- **Honesty:** the critique pass was done by the builder in a separate pass (no fresh reviewer was spawned); audio never listened to; the vintage-board menu items need the owner's confirmation; address/phone/hours are missing.

## 2026-10-02 — Deep artistic reference forensics
- Adds `reference/artistic.mjs`, 20-section ARTISTIC DNA in every report, contextual evidence-linked observations, full-duration attention/pacing maps with explicit unknowns and playback/listening gates.
- Owner goal enforced: AUTONOMOUS_FILM.md makes all production/inspection/paperwork agent-owned; ownerRequest selects and validates one exact delivery. Owner receives one finished video, no internal approval flow.
- Owner-requested simplification: analyze automatically prepares real timing/evidence drafts; prepare supports older packs, and autoSections reuses each decision across relevant headings without duplicate writing. No inspection attestation is prefilled.
- Reviewed artistic intent enters the recreation blueprint; old technical reviews remain compatible but artistically pending.
- New `reference.mjs direct --brief=file` and original-direction template map reviewed principles to original subject-specific execution, fit, differences and counter-cases.
- Guidance: ARTISTIC_FORENSICS.md, REFERENCE_LAB, workflow/index/cookbook/asset policy; skills updated: reference-reverse-engineer, recreation-director, motion-forensics, creative-director and film-director.
- Validation: schema/provenance/coverage/unknown/audio/playback/original-transfer tests plus existing unit/integration suite. Final CI is the publication acceptance record.
- Not claimed: automatic artistic understanding, psychological universality, measured audience retention, originality certification or a newly produced reference film. No film ledger changed because no film was rendered.

## 2026-10-02 — Showreel 2: reference recreation (scope DONE, 1 of 2 correction rounds)
Owner uploaded a screen recording and asked for a 15 s showreel "like this exactly".
- **Process proven:** `reference.mjs analyze` → visual review of frames, HUD crops and dense segment grids →
  `observations.json` (attested review) → timing map → native film → matched comparison boards → one independent critique → one fix round.
- **Film:** `showreel2/` — 1920×1080, 60 fps, 15 s, 128 BPM, 8 bars, HUD overlay, original score. See its `BRIEF.md` / `LEDGER.md`.
- **Studio improvements made on the way:**
  - gate option `darkSpans` (declared intentional dark passages; shifted per range; unit-tested) in `lib/measure.mjs`, `make.mjs`;
  - `lib/motion.js` `el()` now knows `text`, `textPath`, `polyline`, `polygon` (SVG text ring was silently not drawn);
  - fonts: Archivo (variable width + weight axes), Instrument Serif Italic, Space Mono (all OFL, `ASSETS.md`);
  - techniques catalogued in `TECHNIQUES.md` (directional blur filter, width-axis kinetics, burst glyph, Truchet waves, vertex mesh morph, card-per-beat type).
- **Measured:** gates PASS (15.00 s, 60 fps, −14.1 LUFS, TP −3.2 dBTP, LRA 3.5); critic fidelity ≈ 85 % structure/timing, ≈ 65 % type scale and point-cloud look → round 1 fixed both.
- **Not verified:** audio never listened to (reference or ours), no human real-speed viewing, loop seam, share copy by the critic.
- **Open owner decisions:** wordmark/burst look vs a real brand; the "AVAILABLE FOR NEW PROJECTS" claim; the uploaded recording is tracked at the repo root (owner's call to keep, move or remove).

## 2026-10-02 — Showreel 1 (16:9 + 9:16), merged via PR #10
Own-brand 15 s motion-design reel; one critique (5 majors, 0 blockers) → one round → DONE. Details: `showreel/LEDGER.md`.
Studio fixes: read-back ignores hidden and mask-clipped words; counters caption their final value; calibrated contrast estimate;
`cameraPass` blur profile (whip ends soft, never on a sharp sliver).

## 2026-10-02 — Reference Reverse Engineering Lab (PR #9)
`reference.mjs` ingest / analyze / review / reconstruct / compare / learn, five conditional skills, `REFERENCE_LAB.md`.
Two correction rounds: HTTP byte-range support in the test media server, bounded seek waits, deterministic transition visibility, exact hard-cut timing.
Rule kept: machine pack ≠ visual review; hypotheses carry confidence + alternatives; never claim the source code or software.

## 2026-10-02 — Generation 2 (PR #7)
Springs/inertia/noise/path/morph (`kinetics.js`), cinema splines with velocity-continuous hand-off and diagnostics, depth planes and haze,
transition vocabulary, Arabic-safe typography, aspect layout, analytic particles, optional WebGL (SwiftShader), music map
(librosa → Node → manual BPM), SFX + shared cue sheet, review evidence, real-app capture with verified read-back, layer plates,
external engine adapter. Inventory: `GEN2.md`.
Fixes with lasting value: `settleCapture` (first screenshot after load can be torn); no `will-change`/rest transform (raster history differs by seek order);
fractional viewport rounding; spring settle-time maths; PCHIP tangents for no-dead-stop camera paths.
Tests: 66 total (51 pass, 15 optional skipped, 0 fail) at the time of the last full unit run.

## 2026-10-01 — Fast production pipeline (`WORKFLOW.md`)
Draft / review / final profiles, content-hash caches, `--range`, `--shot`, production.json + preflight, two-correction-round budget,
one independent final critique, artistic acceptance table. Supersedes the original blanket full-build prompt (`PROMPT_STUDIO.md`).

## 2026-10-01 — Films 2–4 (BALACONBAR ads, 4:5 + 9:16)
Own `CRAFT.md` lessons 1–21: logo by frame 1, pixel-matched dissolves, safe bands, grain cost, audio without ears, variant leakage checks (PSNR ≥ 35 dB).

## Earlier
Studio foundation: own CDP renderer (`renderAt(t)` pure in t), zero npm packages, x264 + loudness mastering, gates. `../PLAN.md` is the superseded research.

## Skill map changes (what each skill learned)
| Skill | Change |
|---|---|
| film-director | documentation duty at scope close; showreel route |
| motion-composer | SVG tag list, directional blur, width-axis type, measure-while-visible rule |
| qa-judge | matched reference/ours boards, acceptance criteria checked on the exported mp4, "deliberate non-defects" list |
| sound-designer | score from the same beat grid as picture; linear-frequency sweep; headroom for mastering |
| recreation-director | full-film structural recreation of a screen recording, not only 3–8 s studies |
| reference-reverse-engineer | recording chrome exclusion, clock offset, HUD crops, density grids |
| platform-delivery | share-copy size targets and checks for 60 fps |
| cdp-capture | `settleCapture` |
| ffmpeg-master | verification frame/crop recipes used in showreels |
| post-mortem | append to CHANGELOG/TECHNIQUES, not only CRAFT |
| motion-composer / sound-designer / platform-delivery | Film 5 recipes: marquee, FLIP, arch portal, split swap, maqsum + lpSweep, Reels safe zones and file sizes |

## Note on `reference/lessons.json`
Still empty on purpose: `reference.mjs learn` requires an inspected-motion review, and no motion playback was available in the
showreel sessions (stills and numeric analysis only). Lessons were recorded in `CRAFT.md` (22–28) instead of faking that attestation.

## Test status at this entry
`npm test`: 72 tests, 58 passed, 14 optional/browser skipped, 0 failed (includes the new docs gate). Browser tests were not re-run in this scope.

### Integration correction (one round)
Final-head CI exposed a transient Chromium startup failure and a pre-existing capture server leak that held the render suite open until timeout. app-capture.mjs now closes its server on startup failure and even when client.close rejects; a focused failure test covers no completed-capture claim. cdp.mjs retries startup once only; navigation/render/verification failures are not retried. Publication still requires real browser/encoder success.

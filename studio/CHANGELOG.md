# CHANGELOG — how the studio evolved

Newest first. One entry per closed scope: what changed, what it proved, what stayed unverified.
Operating rule: **a scope is not closed until this file, `../STATUS.md` and every doc/skill the scope touched are updated**
(`test/docs.test.mjs` enforces the checkable part). Evidence lives in each film's `LEDGER.md`; techniques in `TECHNIQUES.md`;
lessons in `CRAFT.md`. Renders (`out/`, `takes/`) are never in git.

## 2026-10-02 — Film 5: BALACONBAR Beni Suef, 25 s Reels ad (one 9:16 delivery)
Owner request: a dynamic 25 s ad for the café in Beni Suef using the owner's four images (real photo, swing poster, AI storyboard, vintage board), everything the studio learned,
retro/80s nostalgia mixed with 2026 motion, exciting original music, ONE video in Reels shape. Source: `film5/` (BRIEF, production.json, film.js, score.mjs, plates.mjs, crops.sh, LEDGER).
- **Film:** 12 scenes on a 120 BPM grid (bars of 2 s): hook, zaman (old), naharda (new, swing), ingredients, menu (dotted-eighth cards), place, sensory, montage (1/8 cuts), arch portal, collide (old vs new split), brand, hold.
- **Score:** original jeel-synth in D hijaz with darbuka maqsum; radio low-pass for the old world; drop at 4.0; hits on the menu, montage and logo.
- **New recipes** (see `TECHNIQUES.md` → Film 5): tape-rewind exit, FLIP card fly, marquee bands, arch portal clip-path, diagonal split swap, blurred-cover portrait macros, `lpSweep` in the score.
- **Process:** builder stills loop (3 layout rounds before any render), draft 16 s, review build (1 gate fail: arch title 4 px outside the safe area; fixed), final build, one separate critique pass of the exported frames, one correction round.
- **Honesty:** the critique pass was done by the builder in a separate pass (no fresh reviewer was spawned); audio never listened to; the vintage-board menu items need the owner's confirmation; address/phone/hours are missing.

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

## Note on `reference/lessons.json`
Still empty on purpose: `reference.mjs learn` requires an inspected-motion review, and no motion playback was available in the
showreel sessions (stills and numeric analysis only). Lessons were recorded in `CRAFT.md` (22–28) instead of faking that attestation.

## Test status at this entry
`npm test`: 72 tests, 58 passed, 14 optional/browser skipped, 0 failed (includes the new docs gate). Browser tests were not re-run in this scope.

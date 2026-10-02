# Generation 2 — what was added (2026-10-02)

Native engine stays primary (brief → plan → film.js → Chromium frames → audio → FFmpeg → QA → review).
New reusable modules (all pure in t, seeded, tested):

| Need | Module |
|---|---|
| Springs, inertia, anticipation, follow-through, stagger, noise, paths, morph, numbers | `lib/kinetics.js` |
| Smooth camera paths (no dead stops), intent moves, hand-off with velocity continuity, focus tracking, motion diagnostics | `lib/cinema.js` (gen-2 section) |
| Named planes, haze, blend layers, cover-safe camera clamp | `lib/depth.js` |
| Transition vocabulary with purpose/use/avoid + suggestions + repetition checks | `lib/transitions.js`, `lib/fx.js` |
| Arabic-safe kinetic type, fitted blocks, counters, highlights | `lib/typography.js` |
| Aspect-ratio recomposition, safe areas, subject framing | `lib/layout.js` |
| Analytic particles, bursts | `lib/particles.js` |
| Optional WebGL shaders (config `gpu: true`, SwiftShader, deterministic) | `lib/gpu.js` |
| Music map (librosa optional → Node analyzer → manual BPM) | `tools/music_analysis.py`, `lib/musicmap.mjs` |
| Designed SFX + one cue sheet for picture and sound | `lib/sfx.mjs`, `lib/cues.mjs`, `lib/cuesheet.js` |
| Review evidence from the export (cuts, copy, camera peaks, crops, notes) | `lib/review.mjs` (automatic in review/final) |
| Real-app capture with verified read-back; presentation helpers | `lib/app-capture.mjs`, `lib/screen.js` |
| Declarative layer plates with provenance | `lib/layers.mjs` |
| Optional external engine (HyperFrames/Remotion) for silent picture | `lib/engines.mjs`, config `engine` |
| Creative block, style frames, cross-film look overlap warnings | `lib/creative.mjs` |
| Product-UI motion kit: 3-D tilted cards, typewriter + caret, headline stack with dimming, orbiting/scattering icons, travelling spotlights on a UI wall, pulse ring | `lib/uimotion.js` (study: `examples/ui-motion-study`) |

Studies (one subsystem each): `examples/camera-study`, `transition-study`, `depth-study-2`, `particles-study`,
`shader-study` (`--gpu=1`), `kinetic-type-study`, `music-sync-study` (full make film), `app-film-study`.
`make` gains `--shot=id` and `examples/<name>` films. Renderer fix: first capture after load could be torn → `settleCapture`.

Research decisions: HyperFrames (Apache-2.0) and Remotion (company licence for 4+ people) stay optional adapters;
GSAP not needed (own pure-in-t primitives); WebGPU unavailable headless; Chromium 147 drops BeginFrame, so the
renderAt+screenshot path is kept. Depth maps accepted only as supplied files with provenance (e.g. Depth Anything V2 Small, Apache-2.0).
Verification state and next actions live in `../STATUS.md`. `test/examples.test.mjs` covers studies
forward/reverse determinism, kinetic type safe areas at four ratios, camera diagnostics and Films 2–4
smoke runs with placeholder pixels. Consult current evidence before rerunning; this historical inventory
is not an instruction to restart verification every session.

## Generation 2.1 — added with Showreel 2 (2026-10-02)
| Need | Where |
|---|---|
| Declared intentional dark passages in the technical gates (`darkSpans`) | `lib/measure.mjs`, `make.mjs`, test in `test/options-cache.test.mjs` |
| SVG `text`, `textPath`, `polyline`, `polygon` in the element helper | `lib/motion.js` `el()` |
| Variable fonts with width axis, italic serif, mono | `lib/composer.html`, `assets/fonts/`, `ASSETS.md` |
| 60 fps films with a persistent HUD overlay and beat-grid scenes | `showreel2/film.js` (reference implementation) |
| Recipes (directional blur, width-axis type, burst glyph, Truchet, mesh morph) | `TECHNIQUES.md` |
| Evolution log and skill changes | `CHANGELOG.md` |
Inventory shows what exists, not what must be used. Showreel films (`showreel/`, `showreel2/`) are reference implementations of the Gen 2 toolkit.

## Core pipeline modules (pre-Gen 2, listed so the docs gate stays complete)
| Module | Role |
|---|---|
| `lib/build-options.mjs` | the draft/review/final `PROFILES` table and `frameRange` (validated frame ranges for `--range`) |
| `lib/imagelab-page.html` | in-browser page used by `lib/imagelab.mjs` to read pixels, matte edges and plates |

# FORM / FUNCTION — creative engineering case study

A resume showreel for the Animation project, authored as one editable spec. The work demonstrates typography, procedural material, generative design and interface motion through a single recurring ribbon.

## Understanding the current studio

There are two connected authoring paths. The established studio accepts a film module, production plan and score, then renders deterministic browser frames and masters them with FFmpeg. The newer Studio Engine accepts a beat-based spec and brand kit and generates those same artifacts. It is an authoring layer over the existing renderer, not a competing export pipeline.

`studio-engine/lib/events.js` is the shared clock: beats become exact scene times and picture events become sound events. `modules.js` creates scene elements; `player.js` evaluates them at arbitrary time. `sound.mjs` builds the original stems on the same clock. `run.mjs` generates a package, checks stills and dense text, and delegates production to `studio.mjs build`. The latter controls memory, isolated capture, resume and logs. The existing finish/measure/review libraries then master, mux and check the export.

That distinction matters: a spec can change color, layout, typography and arrangement without copying a previous film. A new visual technique belongs in a reusable engine module. A successful numerical gate proves technical properties, while composition, purpose and musical taste require separate judgment. Example code and experimental engines are not evidence that every film uses them.

## Original direction

Eight four-second movements at 120 BPM: identity, kinetic type, dimension, generative systems, interface, choreography, art plus code, and identity resolve. The ribbon changes twist, material, scale and arrangement. Six related colors supply contrast between movements; two type families keep the identity coherent. Three horizontal wipes make the incoming visual world replace the previous one. The Orbit UI is explicitly a concept; its cursor click shares a beat with the tile morph.

The ribbon is an analytic ruled surface: `(R+v*w*cos(twist*a/2+phase))*[cos(a),sin(a)]` with a corresponding depth term and optional fold. Faces rotate in three dimensions, sort by depth and receive directional shading. Geometry is evaluated from absolute time; capture order has no simulation history. Odd twists reverse the seam width, as a Mobius band should; tests check this property. CPU Canvas avoids adding GPU and package requirements to this constrained machine.

## Integration and portability

Fixed integration snapshot: `origin/main` at `28099b7`, latest studio branch at `431dbc2`. The latest branch already contains main, so the isolated showreel branch fast-forwarded cleanly. The original checkout's unfinished edits and media remained in place.

Production exposed Windows issues in the new engine: URL pathnames retained an extra drive prefix and escaped spaces; shell `ls` was used for output discovery. The implementation now uses `fileURLToPath` and `readdirSync`. Literal scene background colors now feed the contrast gate. Optional creative metadata passes into the generated plan. Optional vignette suppression lets a deliberately light palette remain clean.

All production browser launches use the owner's mandatory Chrome helper. Its added studio mode starts a dedicated profile and local CDP port; the render process attaches with `STUDIO_CDP_URL` and disposes only its own contexts. Personal and corporate sessions remain separate. The helper's original source is backed up locally under `studio/takes/launcher-original.py`.

## Reproduce

From `studio/`, after starting production Chrome with the mandatory launcher:

```powershell
$env:STUDIO_CDP_URL='http://127.0.0.1:9333'
node studio-engine/run.mjs form-function --stage=check
node studio-engine/run.mjs form-function --stage=stills
node studio-engine/run.mjs form-function --stage=final
```

Change `spec.json` or `brand.json`, never the generated `b-form-function-youtube/` package. Exports, captured stills, stems, render profiles and logs stay out of public Git. The film assumes 1920x1080, 30 fps, 32 seconds; portrait would require authored layout overrides and separate verification.

## Verification

Targeted engine and ribbon tests: 8 pass, 1 optional audio-fixture test skipped. Corrected stills: 24 frames; dense text timeline: zero issues. The 8-second proof passes all export gates. Final export and separate exported-frame judging pass are recorded in LEDGER.md after production. Listening judgment is unavailable in this session; do not infer it from measured levels.

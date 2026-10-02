# Reference Reverse Engineering Lab

This permanent lab converts authorized finished video into compact evidence, reviewed visual grammar,
a native recreation blueprint and a short comparison experiment. It infers probable construction,
not original source code or certain software identity. Private reference packs live at repository-root
`references/<slug>/` and are git-ignored in full, including downloads, audio and frame images.
source/request.json privately retains signed URL parameters/player selectors for later seeks; it is not
part of the model evidence pack. sourceDurationSeconds and analysisSeconds are separate quantities.

## One-command acquisition
From `studio/`:
```sh
node reference.mjs analyze /path/reference.mp4 --slug=launch-reference
node reference.mjs analyze https://example.com/reference.mp4 --slug=launch-reference
node reference.mjs analyze https://example.com/player --browser --selector=video --slug=page-reference
node reference.mjs analyze ../studio/out/film4/take05/reels20.mp4 --slug=previous-film
```
Any format FFmpeg can decode is eligible, not a promise that every codec/file is supported. Direct HTTP
media is downloaded with a byte/time limit; HTML routes to Chromium. DRM, authenticated access walls,
protected manifests and nonseekable/live players are not bypassed. `--frame=fragment` selects an embedded
player frame; `--play-selector=selector` clicks only an explicit ordinary playback control. Browser
canvas capture uses native video pixels if origin rules permit; otherwise the element compositor is
captured and overlays/seek precision are documented. mediaTime from requestVideoFrameCallback is best
effort; currentTime-after-seeked is an explicit fallback, never claimed frame-exact.

## Machine passes and bounded context
1. Probe metadata/audio/size/duration; build a 6–18 frame overview of the whole duration.
2. Detect FFmpeg scene-score candidates at low resolution. Extract shot begin/middle/end; <=12 detailed
   shots by default, distributed across the duration. All shot/transition records remain, and omitted
   visual coverage is labeled; all detected boundaries remain in detected-boundaries.json.
3. Spend remaining frame requests on transition strips and motion/focus/light/audio candidates.
4. Refine only an observed unresolved region: <=2s, <=12 samples, explicit reason, at most two rounds.

Default limits: 72 extracted frames, 300s duration, 128 MB download, 10-minute job budget and bounded
subprocesses. Low-resolution machine decoding measures many frames without showing them to a model.
Visually redundant images are excluded from compact evidence sheets, while exact requested/decoded
provenance remains. scientific-summary.json reduces raw motion/audio arrays to <=12 shot summaries
and <=24 correspondence candidates; read raw metrics only for a justified temporal window. Budgets/omitted coverage are recorded. Long/dense references may need explicit
expanded budgets; the tool does not silently claim complete detailed coverage.

```sh
node reference.mjs analyze video.mp4 --max-frames=96 --max-duration=600 --motion=auto
node reference.mjs refine launch-reference --range=4.1:4.8 --samples=8 --reason="unresolved wipe occluder"
```
FFmpeg scene-score is the default dependency-light detector. It can false-trigger on motion/flashes.
Optional PySceneDetect AdaptiveDetector uses a rolling baseline and is selected explicitly; ThresholdDetector
can inform fade inspection but is not treated as a technique classifier. Browser-only detection uses coarse
pixel changes and labels imprecise boundary timing. No detector establishes match cuts/morphs by itself.

## Optional scientific tools
Core: Node >=22, FFmpeg/FFprobe. Web/native recreation: Chromium configured by STUDIO_CHROMIUM.
Optional: `python3` + NumPy/OpenCV for LK/RANSAC affine flow; PySceneDetect for adaptive boundaries;
NumPy/librosa/soundfile for musical analysis. See `reference/requirements-optional.txt`. Packages are
not installed automatically. `--motion=auto` falls back honestly, `--motion=python` requires OpenCV,
`--scene-engine=python` requires PySceneDetect, `--audio-engine=python` requires the music dependencies.
Raw motion is normalized per frame and second. Global motion may be a physical camera OR a composition
transform. Regional residuals suggest local movement/parallax, not a recovered depth map. Easing curves
are perceptual descriptions; semantics and artistic effect require inspected evidence/playback.

## Visual review (agent work)
`analyze` produces the complete MACHINE pack and a provisional report/blueprint, not fabricated art
criticism. Load `reference-reverse-engineer` only when a reference film is supplied. Open actual contact
sheets, targeted frames and transition strips; watch/listen when available. Use the blank review template:
```sh
node reference.mjs review launch-reference --observations=/path/review.json
```
Record all report sections, visual rules (not just text), probable layers, hypotheses/confidence/alternatives,
viewed evidence, and motion/audio limitations. Add visualEvents to relate observed reveals/type/camera
moves to onsets/energy. Interpretation is attributed to the reviewer; it is not machine verification.
Native blueprint camera offsets/focal points are normalized, keys use reference seconds, focus uses
native depth planes, and transition/type names map to tested studio primitives. Unknown parameters are
explicit neutral defaults until reviewed. A prose review does not approve a blueprint: patch each shot
and explicitly set approvedForReconstruction=true, or use --study for a provisional experiment.
Structured transition reviews update transitions.json; evidence-pack and job review states advance together. The technique atlas always includes alternative renderers.

## Short reconstruction and comparison
```sh
node reference.mjs reconstruct launch-reference --range=3:8
node reference.mjs reconstruct launch-reference --study --duration=5
node reference.mjs compare launch-reference /path/our-render.mp4
node reference.mjs compare launch-reference film2 --ref-start=3 --our-start=0 --duration=5
```
Reconstruct only 3–8s. Current native study is a neutral procedural scene using reviewed camera/type/
transition timing, shared depth planes/contact shadows and a spring settle. Reference photos, logos,
copy/likeness/music are not automatically reused. It is silent; audio-visual timing remains measurable
in the relationship map. Additional subject-specific layers/object/light/audio cues in the blueprint are
explicit production instructions for the agent, not a claim that a generic study reproduces them all.
Compare at matched timestamps, inspect grids and normalized motion curves, then judge focal/type
hierarchy, depth, rhythm and purpose with eyes/playback. Do not optimize pixel-perfect copying.

## Learning without style repetition
```sh
node reference.mjs learn launch-reference --lesson=/path/lesson.json
```
A lesson requires inspected motion and principle, evidence, counterCase, application and confidence.
The command appends a new principle to `reference/lessons.json`; it rejects exact duplicate principles.
Commit reusable knowledge deliberately; raw private reference evidence stays excluded. A lesson is not
an automatically adopted style or a new requirement in every film.

## Artifacts
source.json, metadata.json, frames.json, frames/, contact-sheets/, detected-boundaries.json,
shots.json, transitions.json, motion.json, audio.json, audio-visual-map.json, technique-map.json,
analysis.md, recreation-plan.json, scientific-summary.json, evidence-pack.json, job.json, optional visual-review.json,
comparisons/ (neutral study + pair images + motion curves + comparison report).
`job.json` records blocked ingestion/analysis without marking the pack complete. Never restart an identical
blocked job or optional-polish loop; resolve a concrete cause within the bounded scope in STATUS.md.

## Official methods and limitations
- FFmpeg scene/black/metadata/select filters: https://ffmpeg.org/ffmpeg-filters.html
- PySceneDetect detector methods: https://www.scenedetect.com/docs/latest/api/detectors.html
- Browser callback mediaTime and best-effort presentation: https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback
- OpenCV optical flow and affine tracking: https://docs.opencv.org/4.x/dc/d6b/group__video__track.html

## Field test: whole-film recreation of a screen recording (2026-10-02)
The lab was used beyond 3–8 s studies: a 15 s screen recording → a 15 s original showreel (`showreel2/`). What worked:
- Machine pack first, then **visual inspection of every shot**, HUD crops at 1:1 and six dense segment grids for the fast part. Observations file attested as reviewer attestation; audio analysed numerically only (BPM ≈ 128), never listened to.
- **Exclude capture chrome** (player bar, speaker icon, rounded frame, counter). **Fix the clock offset** on one hard event before mapping times.
- Express the reference as a bar/beat table (what proves which skill in which bar), then build on the same grid.
- Match boards (reference above, ours below) + one independent critique found the real gaps (type scale, width motion, point-cloud look) that numbers did not.
- Fidelity statement used: structure, order, timing ±~0.1 s, palette, type roles. Not claimed: pixel equality, source code, audio.
Recipes: `TECHNIQUES.md`. Result and limits: `showreel2/LEDGER.md`. A recording uploaded into git is the owner's reference only; its artwork and audio are not reused.

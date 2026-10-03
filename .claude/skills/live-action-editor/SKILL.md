---
name: live-action-editor
description: Edit real footage of real people — analysis pack (VAD, words, mattes, face/pose anchors, free space, 9:16 reframe), jump cuts/punch-ins/J-L cuts, karaoke captions, animation behind/around/in front of people, ducked dialogue mix, OTIO hand-off. Use whenever a film contains live-action video.
---
# live-action-editor
Operating policy: `studio/WORKFLOW.md`; full guide, research and sources: `studio/LIVE_ACTION.md`; worked example: `studio/live1/`.

1. Setup once per machine: `pip install -r studio/tools/requirements-live.txt` (+ `apt-get install -y libegl1`), `python3 studio/tools/live.py models --asr=turbo --tts=1`.
2. Analyse: `python3 tools/live.py all <video> <film>/plates/pack --fps=30` → then `align --script=` (scripted) or `transcribe` (unscripted). Keep packs and source in git-ignored `source/` / `plates/`.
3. LOOK before building: `live.py preview <pack> qa.mp4` (matte tint, anchors, crop, free box). Fix the analysis, not the film.
4. Edit with `lib/edl.mjs`: `keepRanges(speech)` → `timeline()` → `sourceTime()`; `punchIns` to hide jump cuts; `pageCaptions(words)`; `cutSfx` sparse; `toOTIO()` when a human editor finishes in Premiere/Resolve.
5. Compose with `lib/footage.js`: plate → behind-graphics → cutout → front-graphics; `render()` returns `F.draw(...)` (frames are awaited). Anchors via `F.toStage(F.anchor(id, key, s))`; text in `space.json` rects; never over the mouth.
6. Sound with `lib/dialogue.mjs`: `polish()` the voice, `duck()` the music 8–12 dB under it, `stitch()` jump-cut audio with 10 ms fades; master to -14 LUFS via make.
7. Gates as usual; declare end holds; inspect transitions on 30 fps strips of the export.
Rules: outlines/strokes are drawn on canvas (`draw({ outline })`) — never chained CSS drop-shadows on full-frame layers (froze capture). A scratch TTS voice is never presented as a client's voice. Real people need their consent/rights recorded in ASSETS.md and production.json.

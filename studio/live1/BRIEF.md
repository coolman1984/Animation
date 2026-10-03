# BRIEF — Live 1 · real footage + motion study · 12 s · 9:16 (internal capability proof, not a client ad)

Owner request 2026-10-03: be ready for ads with real video of real people — cut it, animate before/after/around them and in empty
space, expressive SFX, every 2026 editing technique. This study proves the toolkit end to end (`LIVE_ACTION.md`).

## Truth and rights
- Footage: `source/face-demographics-walking-and-pause.mp4`, Intel IoT DevKit sample-videos, **CC BY 4.0**
  (github.com/intel-iot-devkit/sample-videos, LICENSE "Attribution 4.0 International"). Attribution: "Sample video © Intel Corporation, CC BY 4.0".
  Used 3–19 s of the source, conformed 12 → 30 fps with motion-compensated interpolation. Not in git.
- Voice: scratch Arabic TTS (Piper ar_JO-kareem via sherpa-onnx) from `script.txt` — a placeholder to time the edit, not a person's voice.
- The person is a sample-video participant; the tag «بطل الإعلان / REAL PERSON · REAL FOOTAGE» describes the technique, not an endorsement.

## Rebuild
`python3 tools/live.py ingest live1/source/face-demographics-walking-and-pause.mp4 live1/plates/pack --ss=3 --t=16 --fps=30 --width=1080 --interp=mci`,
`python3 tools/live.py tts live1/script.txt live1/plates/pack/voice.wav --gap=0.6 --lead=0.5`, `vad --wav=…/voice.wav`, `align --script=live1/script.txt`,
`scenes`, `matte --scale=1`, `track`, `space --box=0.8x0.16`, `reframe`; then `node make.mjs live1 --profile=final`.

| t (s) | technique |
|---|---|
| 0–3.2 | auto-reframe 16:9 → 9:16 following him; giant «حقيقي» behind him (text behind subject); karaoke captions |
| 3.2–5.0 | freeze-frame intro: grey world, colour cutout with sticker outline, blue burst behind, tag + leader line to the face |
| 5.0–8.6 | brand pixels orbit his head (behind/front split by depth), label rides the head; jump cut at 6.8 hidden by a 1.14 punch-in |
| 8.6–12 | footage shrinks into a card; plate clipped, cutout not → his head breaks out of the frame; title |

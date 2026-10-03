# LIVE ACTION — real footage of real people, edited and animated around (research + toolkit + playbook)

Owner request 2026-10-03: be ready for ads built from real video of real people who talk and move — cut it, put animation
before/after/around the people and in the empty space, add expressive sound effects, and use every 2026 editing capability.
This file is the research (with sources), what the studio can now do offline, the editing techniques with numbers, and the
roadmap of heavier tools to add when a project needs them. Proof: `live1/` (12 s study on CC BY 4.0 footage, final take03).

## 1. What the studio can do now (tested here)
| Need | Tool in this repo | How it works | Evidence |
|---|---|---|---|
| Bring footage in at the film's frame rate | `tools/live.py ingest` | ffmpeg conform: `dup` (repeat), `blend`, or `mci` motion interpolation (12 → 30 fps on the test clip) | 476 frames, 1080×608 |
| Find speech | `live.py vad` | Silero VAD v5 (ONNX, 32 ms windows + 64-sample context) → speech segments + 10 ms loudness | 3 sentences found exactly on the scratch VO |
| Words with times | `live.py align --script` (known script) / `live.py transcribe` (unknown) | script words spread over speech by spoken length, anchored on real micro-pauses; Whisper large-v3-turbo (sherpa-onnx, offline) gives segments | median word-edge error **0.03 s**, 14/16 word centres inside the true word (`test/live.test.mjs`, known-edge TTS) |
| Cut the person out | `live.py matte` | MediaPipe multiclass selfie segmenter (person = 1 − background), guided-filter edges on the frame, motion-aware temporal smoothing | 1080×608 mattes, every frame, deterministic IMAGE mode |
| Follow faces/bodies | `live.py track` | MediaPipe Face (478 pts) + Pose; pose face points fill frames the face mesh misses; identity association + fragment merge; 1€ filter smoothing; mouth-motion "speaking" score | one continuous identity from far walk to close-up |
| Where text can go | `live.py space` | per shot: person occupancy (matte) + edge busyness on a grid → best free rectangle | ceiling band found on the hallway clip |
| 16:9 → 9:16 that follows the subject | `live.py reframe` | subject = largest/speaking face; dead zone; **zero-lag forward-backward smoothing** (offline edits can look ahead); reset at cuts | crop path follows the walk |
| QA the analysis | `live.py preview` | burns matte tint, anchors, crop window, free box into a video | inspected before building |
| Scratch voiceover | `live.py tts` | Piper ar_JO (sherpa-onnx) to time an edit before the real voice is recorded — never shipped as a client voice | live1 voice |
| Edit decisions | `lib/edl.mjs` | jump cuts from speech (pad/bridge/minKeep), text-based cut (remove filler words), timeline ↔ source time, J/L audio offsets, alternating punch-ins, caption pages with per-word state, sparse cut SFX, **OpenTimelineIO export** for Premiere/Resolve | OTIO parsed by the reference library in the tests |
| Dialogue audio | `lib/dialogue.mjs` | voice chain (high-pass → afftdn/arnndn → de-ess → compressor), music **ducking** by sidechain compression, click-free stitches, mix graph | real ffmpeg test: music drops > 4 dB under the voice |
| Animation around people | `lib/footage.js` + composer | plate → behind-graphics → person cutout → front-graphics; tracked anchors mapped through crop/zoom; sticker outline drawn on canvas; frames fetched + decoded and awaited before capture | browser test: cutout over behind-graphics, exact frame in any order |

Setup on a new machine: `pip install -r tools/requirements-live.txt` (Linux also needs `apt-get install -y libegl1` for MediaPipe), then
`python3 tools/live.py models --asr=turbo --tts=1` (≈ 1.4 GB; MediaPipe models from storage.googleapis.com, Silero/sherpa-onnx from GitHub).
Hugging Face, Wikimedia and Pexels are blocked by this environment's network policy; everything above avoids them.

## 2. One footage project, end to end
```bash
python3 tools/live.py all source/shoot.mp4 <film>/plates/pack --fps=30 --width=1080 --interp=dup    # analysis pack (git-ignored)
python3 tools/live.py align <film>/plates/pack --script=<film>/script.txt                          # or transcribe for unscripted talk
python3 tools/live.py preview <film>/plates/pack /tmp/qa.mp4                                        # LOOK at mattes/anchors/crop first
node make.mjs <film> --profile=review && node make.mjs <film> --profile=final                       # film.js uses lib/footage.js
```
In `film.js`: `const F = await footage(new URL('./plates/pack/', import.meta.url), { plate, cutout })`, `render(t)` returns
`F.draw(sourceSeconds, { crop: F.follow(s), dest, zoom, focus, freeze, outline })`, anchors with `F.toStage(F.anchor(id, 'head', s))`.
Captions: `pageCaptions(F.transcript.words)`; edit: `keepRanges(F.speech.segments)` → `timeline()` → `sourceTime()`; hand-off: `toOTIO()`.

## 3. Editing techniques (what top short-form editors do, as recipes)
- **Hook in 1–2 s:** start on motion or a face mid-sentence; a word or object in the first frame. Text-behind-subject is a proven scroll-stopper: big word on the behind layer, the cutout over it (live1 0–3.2 s).
- **Jump cuts that read as style:** cut silences with ~0.12 s padding and bridge gaps < 0.35 s (auto-editor's margin idea); alternate 1.0 / 1.12–1.15 zoom per clip around the face so every cut looks like a punch-in (`punchIns`); a whoosh only on punch-ins, not on every cut.
- **J and L cuts:** let the next speaker's audio start 0.2–0.4 s before the picture (J) or the previous line run under the new shot (L) — dialogue flows instead of chopping (`timeline({ jl })`).
- **Freeze-frame character intro:** freeze 1.5–2 s, desaturate/darken the world, keep the person in colour with a white sticker outline, name tag with a leader line to the face, riser into the freeze and a pop on the tag (live1 3.2–5.0 s).
- **Graphics that live in the shot:** halos/orbits that pass behind and in front of the person (split by depth onto behind/front layers), labels that ride the head anchor, arrows to the hands, callouts in the free space (`space.json`), never over the mouth.
- **Frame breaks:** clip the plate to a card but not the cutout → the head breaks out of the frame (live1 8.6–12 s).
- **Captions:** 1–4 words per page, break at pauses/punctuation, current word highlighted, past words solid, next words dimmed; keep them inside the safe band (9:16: y 269–1248), off the face; Arabic by whole words.
- **Auto-reframe:** subject-centred crop with a dead zone (no micro pans) and look-ahead smoothing; reset at every cut; full-height crop for 16:9 → 9:16.
- **Speed and time:** speed ramps (100 % → 300 % → 100 % across a move), slow motion only with real high-fps footage or interpolation (`mci` here; RIFE in the roadmap), freeze + zoom for emphasis.
- **Sound design:** voice first (clean, compressed, -14 LUFS master), music ducked 8–12 dB under speech, whoosh on moves, riser into a reveal, pop/tick on graphic entrances, impact on the title; sparse — sound reinforces, it does not tick every edit.
- **B-roll and cutaways:** cover every jump you cannot hide with a cutaway (product, hands, screen) on the next beat; J-cut the voice over it.
- **Colour:** match shots before styling (exposure, white balance), then one look; skin tones protected.

## 4. Research: the open-source landscape (2025–2026) and how each fits
**Segmentation, matting, tracking**
- SAM 2 / SAM 2.1 (Meta) — click/box-prompted segmentation of any object in images and video with streaming memory; SAM2Long (ICCV 2025) for long videos; Grounded SAM 2 adds text prompts ("the cup"). Best path for non-person objects (products). Weights on Hugging Face/Meta CDN (blocked here) → roadmap.
- MatAnyone (CVPR 2025) and MatAnyone 2 (CVPR 2026) — stable human video matting with consistent memory: hair-level alphas for premium cutouts. RobustVideoMatting — real-time recurrent matting, ONNX export. → roadmap for hair-detail shots; MediaPipe is the offline default now.
- MediaPipe Tasks (Google) — selfie/multiclass segmenter (hair/body/face/clothes), face/pose/hand landmarkers, Interactive Segmenter ("magic touch": click → object mask). Downloadable here; **face landmarker is non-deterministic in VIDEO mode** (issue #5253) → we run IMAGE mode and cache JSON.
- CoTracker3 (Meta) — track any pixel/point through a video: pin stickers to a shirt or a product surface. → roadmap.
- ProPainter (ICCV 2023) — video inpainting: remove objects/people, clean plates for "person disappears" effects. → roadmap.
- Practical-RIFE / rife-ncnn-vulkan — frame interpolation for slow motion and frame-rate conforms (portable binaries, no CUDA). → roadmap; ffmpeg `minterpolate` is the built-in fallback.
**Speech and words**
- Whisper (OpenAI) via sherpa-onnx (offline ONNX; Arabic in the multilingual models; segment timestamps; token timestamps need an attention-exported model). WhisperX adds wav2vec2 forced alignment for word timestamps, but has no default Arabic aligner → our script-alignment fills the gap for scripted ads.
- Silero VAD v5 — speech/silence at 32 ms, 6000+ languages, ONNX.
- sherpa-onnx also runs a 14-language model with Arabic (cohere-transcribe int8, 2026) and Piper TTS voices.
**Cutting and reframing**
- auto-editor — silence/motion-based cuts with margin; exports to editors. Our `keepRanges` reproduces the core idea in the studio timeline.
- ClipsAI (Python) — long video → clips + speaker-following 16:9 → 9:16 resize (Pyannote diarization + PySceneDetect + face detection); open-source OpusClip-style clippers do the same with Whisper + LLM moment finding.
- PySceneDetect — shot boundaries (installed; `live.py scenes` uses the same content-delta idea).
**Audio**
- ffmpeg: `sidechaincompress` (ducking), `afftdn` (spectral denoise), `arnndn` (RNNoise model), `deesser`, `acompressor`, `loudnorm` (two-pass for social).
- DeepFilterNet 2/3 — neural speech enhancement, up to ~24 dB noise reduction with natural voice; Demucs — separate vocals from music (rescue a voice recorded over music). → roadmap.
**Programmatic editors and interchange**
- Remotion (React, frame-as-function, @remotion/captions), Revideo / Motion Canvas (generator timelines): same "video as code" idea as this studio; our composer stays dependency-free and deterministic.
- OpenTimelineIO (Academy Software Foundation) — the interchange format Premiere Pro (File → Export → OpenTimelineIO), DaVinci Resolve and others read; `toOTIO()` lets a human editor open our cut.
**Trends that matter for 2026 short-form** (OpusClip/industry write-ups): retention-first editing, sound-off design (animated captions are expected), punch-ins and fast cuts in the first seconds, authentic voices outperform polished narration, text and graphics kept off the mouth and inside mobile-safe areas.

Sources: [SAM 2 (ICLR 2025)](https://proceedings.iclr.cc/paper_files/paper/2025/file/45c1f6a8cbf2da59ebf2c802b4f742cd-Paper-Conference.pdf) ·
[SAM2Long](https://github.com/Mark12Ding/SAM2Long) · [Grounded SAM 2 (PyImageSearch)](https://pyimagesearch.com/2026/01/19/grounded-sam-2-from-open-set-detection-to-segmentation-and-tracking/) ·
[MatAnyone](https://github.com/pq-yang/MatAnyone) · [MatAnyone 2](https://studio.aifilms.ai/blog/matanyone-2-video-matting) · [RobustVideoMatting](https://github.com/PeterL1n/RobustVideoMatting) ·
[Awesome Video Object Segmentation](https://github.com/gaomingqi/Awesome-Video-Object-Segmentation) · [Sammie-Roto 2](https://github.com/Zarxrax/Sammie-Roto-2) ·
[MediaPipe image segmenter](https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter) · [Multiclass model card](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Multiclass%20Segmentation.pdf) ·
[MediaPipe face landmarker (Python)](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/python) · [MediaPipe issue #5253](https://github.com/google-ai-edge/mediapipe/issues/5253) ·
[CoTracker](https://github.com/facebookresearch/co-tracker) · [ProPainter](https://github.com/sczhou/ProPainter) · [Practical-RIFE](https://github.com/hzwer/Practical-RIFE) · [rife-ncnn-vulkan](https://github.com/nihui/rife-ncnn-vulkan) ·
[WhisperX](https://github.com/m-bain/whisperX) · [sherpa-onnx ASR models](https://github.com/k2-fsa/sherpa-onnx/releases/tag/asr-models) · [sherpa-onnx](https://pypi.org/project/sherpa-onnx/) · [Silero VAD](https://github.com/snakers4/silero-vad) ·
[auto-editor](https://github.com/wyattblue/auto-editor) · [ClipsAI resize](https://www.clipsai.com/references/resize) · [clippy (open-source clipper)](https://github.com/iamyeizi/clippy) ·
[ffmpeg ducking (ffmpeg-user)](https://ffmpeg.org/pipermail/ffmpeg-user/2018-August/040933.html) · [ffmpeg amix/ducking guide](https://www.ffmpeglab.com/articles/ffmpeg-audio-mixing-amix-guide.html) · [ffmpeg denoisers](https://www.ffmpeg-micro.com/blog/ffmpeg-can-remove-background-noise-arnndn-breaks-in-docker) ·
[DeepFilterNet topic](https://github.com/topics/deepfilternet) · [Remotion vs Revideo](https://rendercomp.com/blog/remotion-vs-revideo-comparison/) · [Remotion → OTIO](https://www.remotion.dev/docs/export-opentimeline) ·
[OpenTimelineIO architecture](https://opentimelineio.readthedocs.io/en/latest/tutorials/architecture.html) · [Premiere OTIO](https://community.adobe.com/t5/premiere-pro-beta-discussions/now-in-beta-otio-import-and-export/td-p/14937493) ·
[OpusClip 2026 trends](https://www.opus.pro/blog/short-form-video-trends-reshaping-creator-marketing-2026) · [Veed 2026 trends](https://www.veedyou.com/video-editing-trends/) · 1€ filter: Casiez, Roussel & Vogel, CHI 2012 · guided filter: He, Sun & Tang, ECCV 2010.

## 5. Roadmap: add when a project needs it (not active work)
1. **Hair-detail mattes** — MatAnyone/RVM ONNX through `live.py matte --model=rvm` (needs a reachable weights host).
2. **Any-object masks** — SAM 2.1 with a click from `magic_touch.tflite` (already downloaded) as the first-frame prompt; products, phones, cups.
3. **Point tracking for stickers on surfaces** — CoTracker3; today's fallback is anchoring to face/pose points.
4. **Clean plates / object removal** — ProPainter for "the person vanishes" or removing a logo/boom mic.
5. **RIFE slow motion** — rife-ncnn-vulkan binary for 2×/4× interpolation; better than `mci` on limbs.
6. **Speech enhancement** — DeepFilterNet for noisy phone recordings; Demucs to pull a voice off music.
7. **Speaker diarization** — who speaks when (two-person interviews) to drive reframing and caption colours.
8. **Arabic word alignment from ASR** — export Whisper with cross-attention for token timestamps, or a CTC Arabic aligner, so unscripted speech gets word-exact captions.
9. **LUT/colour match** — `lut3d` per clip + a shot-matching pass (mean/std transfer in Lab).
10. **Beat-synced cuts** — snap `keepRanges` boundaries to the music grid from `reference.mjs audio` when the edit is music-led.

## 6. Limits and honesty
- The test footage is 768×432 @ 12 fps; a 9:16 crop of it is ~3× upscaled and soft. Real projects need 1080p+ (ideally vertical or 4K) at 25–60 fps.
- Word timing on unscripted Arabic speech is segment-level from Whisper, then proportional + pause-anchored; scripted ads use `align` (measured above).
- The scratch voice is synthetic and Jordanian-accented; it times the edit only.
- Mattes from the 256-px multiclass model are soft at hair; fine for stickers/outlines, not for close-up hair compositing.
- Audio was measured (tempo, sections, loudness, ducking depth), not listened to.

# TECH RADAR — dated technology notes (refresh with the `technology-scout` skill)

This file is **dated market/technology knowledge**, kept apart from timeless craft (`CRAFT.md`) on purpose.
An entry is not an instruction to install anything. Decisions: **ADOPTED** (in `capabilities.json` with a study),
**PILOT** (next candidate when a film needs it), **LEARN** (take ideas only), **WATCH** (re-check later), **DEFER** (blocked by licence/hardware).
Sources: the engineering audit `../STUDIO_AUDIT_AND_TECHNOLOGY_REPORT_2026-10-03.md` (verified links inside) and the owner's research notes
(2026-10-03, marked *owner*). Re-verify versions at the official site before relying on them.

## Snapshot 2026-10-03
| Technology | What changed / why it matters | Decision | Source |
|---|---|---|---|
| FFmpeg 9.0.x | Universal media engine; 9.0.1 runs here, 9.0.2 reported 2026-09-18 | ADOPTED (core) | owner; local `ffmpeg -version` |
| Three.js 0.186.1 | Browser 3D, WebGL + WebGPU renderers | ADOPTED as EXPERIMENTAL (`examples/three-study`) | npm registry 2026-10-03 |
| PixiJS 8.22.0 | GPU 2D: tens of thousands of sprites | ADOPTED as EXPERIMENTAL (`examples/pixi-study`) | npm registry 2026-10-03 |
| WebGPU | Faster parallel work (particles, image FX). Headless capture here uses software WebGL (SwiftShader); hardware GPU is not benchmarked | WATCH: benchmark before promising speed | owner; audit §2.2 |
| WebCodecs + Mediabunny | Frame-level decode/encode in the browser; VideoEncoder support still uneven; Mediabunny is MPL-2.0 | PILOT only as a measured speed experiment; FFmpeg stays the backbone | owner; audit §8 |
| OpenColorIO 2.6.0 / OpenImageIO / OpenEXR | Managed color, EXR passes | Installed (`setup color`), PLANNED adapter for a Blender/3D route; browser films stay SDR Rec.709 | owner; audit §9.1 |
| Blender 5.2 LTS (5.2.2, 2026-09-15) | Photoreal 3D, simulation, Geometry Nodes | PILOT when a film needs true 3D/simulation; render as footage layer | audit §8 |
| DaVinci Resolve 21.1 | Finishing, color, human review | PILOT bridge after OTIO is exact (audit B05) | audit §8 |
| HyperFrames (Apache-2.0) | Agent-native HTML → video, seekable adapters for GSAP/Lottie/Three | LEARN: adapter ideas; `lib/engines.mjs` can run it as an external renderer | owner; audit §9.1 |
| Remotion | React video for data-driven batches; custom licence (company licence above 3 employees) | LEARN; only for batch templates | owner; audit §9.1 |
| Motion Canvas (MIT) | Explainer/diagram timelines | LEARN | audit §9.1 |
| Lottie / Rive runtimes (MIT) | Designer-made vector loops / state machines | LEARN; pilot an import when an owner asset exists | audit §9.1 |
| GSAP | Motion vocabulary; standard licence, not MIT | LEARN (ours: `lib/kinetics.js`) | audit §9.1 |
| OpenTimelineIO | Edit handoff to NLEs | ADOPTED as EXPERIMENTAL; semantics incomplete (B05) | audit B05 |
| whisper.cpp / faster-whisper | Local Arabic transcription alternatives | PILOT with an Arabic test pack | audit §9.2 |
| RIFE ncnn Vulkan | Frame interpolation without CUDA | PILOT for slow motion | audit §9.3 |
| depth-anything.cpp | CPU depth maps | PILOT for parallax from footage | audit §9.3 |
| SAM 3.1, MatAnyone 2, CoTracker, ProPainter | Segmentation/matting/tracking/cleanup | DEFER: CUDA and/or non-commercial licences | audit §9.3 |
| LTX-2, Wan2.2, HunyuanVideo, Veo 3.1, Runway | Generative video | DEFER: optional service adapter; never as product evidence | audit §9.4 |
| Industry trend | Hybrid production: AI directs, procedural systems build, GPU renders, specialist models isolate, automated QA checks. Generated flat clips are not editable films | Principle applied in PLATFORM.md | owner; audit §8 |

## Voice and speech (researched 2026-10-03)
| Technology | What it offers | Decision | Source |
|---|---|---|---|
| OpenAI gpt-4o-mini-tts | Current OpenAI TTS model; 11 built-in voices; `instructions` control accent, emotion, intonation, speed, whispering | Adapter written, unverified (needs key) | [OpenAI TTS guide](https://developers.openai.com/api/docs/guides/text-to-speech) |
| ElevenLabs (multilingual v2 / Flash v2.5) | MSA + several Arabic regional variants incl. Egyptian; fast | Adapter written, unverified | [SILMA benchmark Aug 2026](https://silma.ai/blog/best-arabic-tts-models---aug-2026), [Munsit overview](https://munsit.com/blog/best-arabic-tts) |
| Azure AI Speech ar-EG neural (Salma, Shakir) | Native Egyptian neural voices with SSML prosody | Adapter written, unverified; first choice for Egyptian narration | Azure voice list (verify in the portal) |
| SILMA TTS v2, Munsit Faseeh, Lahajati | Arabic-specialist TTS with dialect depth (Egyptian among many) | PILOT: compare by listening against Azure/ElevenLabs before writing an adapter | [SILMA latency benchmark](https://silma.ai/blog/best-low-latency-arabic-text-to-speech-apis-for-developers-2026-benchmark), [Lahajati alternatives](https://munsit.com/blog/lahajati-alternatives-2026-arabic-tts-platforms) |
| Google Cloud TTS, Amazon Polly | Arabic = MSA only (no Egyptian per these reviews) | LEARN | [Munsit overview](https://munsit.com/blog/best-arabic-tts) |
| sherpa-onnx speaker diarization (pyannote seg 3.0 + 3D-Speaker/WeSpeaker embeddings) | Torch-free, CPU, Apache-2 runtime | ADOPTED (EXPERIMENTAL): `tools/live.py diarize` | [diarization research note](https://raw.githubusercontent.com/haberwooki/dia_live_captions/main/docs/diarization-research.md) |
| Whisper turbo via sherpa-onnx | Offline multilingual ASR | ADOPTED; mixed language handled per VAD phrase | existing studio tool |
| Windows OneCore voices (Microsoft Hoda ar-EG) | Free offline Egyptian Arabic draft voice | ADOPTED for drafts (needs PowerShell 7) | local machine |
| Demucs-class source separation | Speech/music/effects stems | PLANNED: needs PyTorch | audit §9.2 |
| Network note | This office network blocks raw.githubusercontent.com (HTTP 403 "URLBlocked"); GitHub releases, PyPI, Google storage work | `live.py models` falls back to the PyPI wheel for Silero VAD | observed 2026-10-03 |

## Next refresh
Check the official sites for the rows marked PILOT/WATCH. Add only what changed, with its date and source.
Promote to `capabilities.json` only after a passing study.

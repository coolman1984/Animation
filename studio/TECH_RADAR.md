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

## ManimGX 0.1.1 — tested 2026-10-11
| Technology | What was measured | Decision | Source |
|---|---|---|---|
| ManimGX (`pip install manimgx`, Python ≥ 3.13; repo `academa-labs/manimgx`, docs manimgx.academa.ai): Rust + wgpu core with Manim CE's Python API, for agents | Installed in an isolated venv; a 5 s, 1080×1920, 30 fps scene (Axes + sine plot + moving dot) rendered in 13.6 s (≈ 11 fps) on CPU only (no GPU here, so wgpu ran in software); output 5.033 s / 151 frames (one frame over), 46 KB; clean anti-aliasing; `inspect` reports layout problems itself; default text font is a serif maths face. The claim «90× faster than ManimCE» (author's own post) was **not** checked: no ManimCE run, no GPU, no like-for-like scene in our pipeline. Sound and 3D not tried. | LEARN: a separate route for maths/chart/equation explainers only; adds nothing to the ad-film pipeline (HTML + Chromium + ffmpeg). Pilot only when a film needs it, with a GPU benchmark first. | tweet by @sinaatalay (owner screenshot); PyPI metadata; local test (scratch scene, not committed) |

## Openverse audio API — adopted 2026-10-16
| Technology | What was measured | Decision | Source |
|---|---|---|---|
| Openverse `api.openverse.org/v1/audio/` (WordPress/Openverse; Freesound, Jamendo, Wikimedia… indexed; anonymous, no key, rate-limited) | Live query 'whoosh' with `license_type=commercial`: 240 results, each with licence, licence URL, creator, attribution text, duration, mp3 URL; one CC0 file (69 KB) downloaded fine | ADOPTED: `studio.mjs sfx` (`lib/openverse.mjs`), mandatory first source for sound (CLAUDE.md). Licence filter is the API's own metadata: still check the source page for paid ads | [API docs](https://api.openverse.org/v1/); post by @ElliotPadfield (2026-10-15) |

## Any-model agent standards and LLM animation research — 2026-10-16
| Technology | What was learned | Decision | Source |
|---|---|---|---|
| AGENTS.md (Linux Foundation / Agentic AI Foundation) | Read natively by Codex, Copilot, Cursor, Gemini CLI/Jules, Windsurf, Aider, Zed, Warp, goose, OpenCode, Junie, Devin…; Claude Code reads it only when no CLAUDE.md exists (fallback, Sept 2026) | INTEGRATED: `AGENTS.md` holds the shared rules; CLAUDE.md imports it | codex.danielvaughan.com 2026-04-07; infoworld / simonwillison 2026-09-18 (secondary sources) |
| Agent Skills (`SKILL.md`, name + description, progressive disclosure) | Open standard (Dec 2025), adopted by ~30 tools; Codex reads repo skills from `.agents/skills/` | INTEGRATED: `.agents/skills/` mirror of `.claude/skills/` (`studio.mjs agents --sync`) | agentskills.io (via secondary sources), developers.openai.com/codex/skills |
| Model Context Protocol (stdio, newline-delimited JSON-RPC; image content in tool results) | One tool surface for every MCP client | INTEGRATED: `mcp/server.mjs` (12 tools, zero dependencies) + client configs | modelcontextprotocol.io spec 2025-06-18 / 2025-11-25 (secondary summaries; the site was not reachable here) |
| HeyGen HyperFrames (Apache-2.0, HTML → MP4 for agents) | Agent-friendly traits: declarative timing, seekable deterministic renderer, lint/snapshot/keyframes commands, block catalogue, a router skill | LEARN: we had determinism and timing; added the catalogue, fix hints and stills-as-image | github.com/heygen-com/hyperframes |
| Remotion agent skills | Rule files teach agents frame-driven React video | LEARN only (React stack; our route is the composer) | remotion-dev/skills (secondary sources) |
| OmniManim (arXiv 2605.15585), PhysicsSolutionAgent (2601.13453), SGA (2607.18116), TheoremExplainAgent | LLM-made animation fails mostly on layout, visible only after rendering; structured render diagnostics, a symbolic scene graph and local repair fix it; VLM frame review helps | ADAPTED: `lib/scenegraph.mjs` (scene graph + character map), named-scene fixes, critic | arXiv abstracts (papers.cool, alphaxiv) |

## Owner-shared agent film skills — 2026-10-16
| Technology | What was learned | Decision | Source |
|---|---|---|---|
| huashu-art-motion (MIT, alchaincyf; 36 art styles, 9 explainer grammars) | `film_gate.py` judges the export itself and calibrates thresholds on its author's verdicts (13 films): fast-motion frame ratio inside shots (red < 0.035), mid-film empty frames by edge density (fact, red), blue-purple share (that author's taste); `storyboard_lint.py` checks the shot table before code (a thing, an action, ≤ 8 characters of copy, 2–6 s shots, no text-card first/last shot, no three pushes in a row) | ADAPTED: `lib/tastegate.mjs` (ffmpeg only, calibrated on OUR owner via `taste/verdicts.json`; the blue-purple rule is not ours) and `lib/storyboard.mjs` | github.com/alchaincyf/huashu-art-motion (cloned and read locally) |
| Lemo-Opuscar (MIT, LemoLab; 51 film styles, narration + sample-library music) | `DIRECTOR.md`: three candidate structures, a benchmark (learn / don't learn), cue map and sound-design table before animating, two real silences, ≥ 4 camera moves, "not the demo again" (4 of 6 differ), readcheck (letters ÷ 15 + 1.5 s), ASR check of every voiced line; `STYLE.md` cards (essence/not, materials, colour logic, type, motion, camera grammar table, native moves, pitfalls); author says styles are tuned for one model | ADAPTED (2026-10-16): `styles/` cards in the same format, from our own films; DIRECTOR rules in the critic (three structures, benchmark, camera variety, breath before the peak, read hold, not the demo) | github.com/lemomo-ai/lemo-opuscar (cloned and read locally) |
| HyperFrames Studio: "Reference Any Video", brand kits from a site URL | Brand tokens (colours, fonts, logo) scanned from the client's live site once | LEARN: our reference lab covers reference films; site-to-brand needs network access to client sites | @HyperFrames_ post (owner screenshot); hyperframes.heygen.com (not reachable here) |

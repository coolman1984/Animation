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

## Web building for agents — 2026-10-16
| Technology | What was learned | Decision | Source |
|---|---|---|---|
| CSS scroll-driven animations (`animation-timeline: view()`/`scroll()`) | Chrome/Edge since 115, Safari 26; Firefox support is reported inconsistently | INTEGRATED with `@supports` + IntersectionObserver fallback (`web/motion`) | buildmvpfast.com, blog.codercops.com (2026, secondary) |
| Scroll/3D site prompt libraries (scrolltide.co, owner post) | Value = not starting from a blank page: a catalogue of animated sections | ADAPTED as our own section vocabulary + styles (site not reachable here) | owner screenshot |
| "Be ambitious" agent prompt (Felix Rieseberg, via Dan McAteer) | Ask what a top professional would do, from which raw material, with which methods, before acting | INTEGRATED as the `ambition` block of every site plan | owner screenshot (original not found online) |

## Named-move libraries from owner posts — 2026-10-18
| Technology | What was learned | Decision | Source |
|---|---|---|---|
| Motion Prompt (MIT, showheyohtaki/motion-prompt @ 770eefb) | 120 numbered moves (motion graphics, camera & cuts, UI parts, web effects, photo looks), each a pure Canvas function of time with a measured spec and a prompt; same render-at-t contract as our films | INTEGRATED: vendored `library/motion-prompt/` + Arabic names, `studio.mjs moves`, MCP `moves_*`, `lib/mpcard.js`; all 120 cells drawn in Chromium | owner X post; repo README/FORMAT.md |
| Cinetic v1.1 (MIT, Leonxlnx/cinetic @ ecfa660) | Agent skill for launch films: 273 techniques with 60 fps timing, weighted random draw (`pick.py`), craft/timing/sound chapters; engines Remotion/HyperFrames; sound rendered in code with earshot | ADAPTED: techniques + draw ported to `lib/movelib.mjs` (Node, no Python), 7 chapters vendored as reading; its Remotion/HyperFrames starters and earshot NOT installed (our engine and `lib/sfx.mjs` cover them); its taste bans stay its own (house method wins) | owner X post; repo SKILL.md, scripts/pick.py |

## Owner-recommended web design skills — 2026-10-19
Read as web pages only (README + skill text); nothing was cloned, installed or run (the session blocks third-party code, and the house rule is learn → adapt → integrate).
| Technology | What was learned | Decision | Source |
|---|---|---|---|
| taste-skill v2 (Leonxlnx, MIT, ~99k★) | Rules from 247 award sites: a subject-derived "idea" sentence with a competitor test; banned patterns (eyebrows/pill badges, mono outside code, gradients, resting shadows/glows, glass, icon-topped card rows, tiny tracked caps, >2 typefaces, headlines > 2 lines); widths 1440/768/390; ≥ 8 moving elements; hero media ≥ 40 % of the first screen; blank stretch ≤ ½ screen; look-and-fix the top three problems | ADAPTED: measured taste lights in `web/lib/check.mjs` (yellow only) + the idea/competitor test in skill `web-director` | github.com/Leonxlnx/taste-skill (README, skills/taste-skill/SKILL.md) |
| Impeccable (Paul Bakaus, Apache-2.0, ~83k★) | 24 design commands (audit, polish, typeset, colorize…) and 61 detector rules for AI-looking UI: overused fonts, grey text on colour, pure black/grey (always tint), cards in cards, bounce/elastic easing, purple gradients, glows, line length, cramped padding | ADAPTED: tinted neutrals, grey-on-colour, bounce easing and line length are measured in the web check; the polish pass is a step in `web-director`. Not installed: its engine is a downloaded binary and new designs call a roll API at impeccable.style (telemetry) | github.com/pbakaus/impeccable (README) |
| UI UX Pro Max (nextlevelbuilder, MIT, ~137k★) | Searchable data: 79 styles, 192 palettes by product type, 74 font pairings, 119 UX rules, 192 industry rules with anti-patterns; Python standard library, no network | LEARN: use as a reference when choosing a direction for an unfamiliar industry; our styles stay vendored and Arabic-ready. Not vendored (large dataset, Latin-font catalogue, a premium tier upstream) | github.com/nextlevelbuilder/ui-ux-pro-max-skill (README) |
**Owner orders, same day:** every site or web animation runs one workflow (`web/WEB.md` "One workflow"): taste-skill owns stage A (direction), UI UX Pro Max stage B (design system), Impeccable stage D (critique/polish); run directly when installed in the host (`/plugin marketplace add <owner>/<repo>`), otherwise through the studio adaptation; the report says which.

| Animation tech (owner brief 2026-10-19) | What it is for | Decision | Source |
|---|---|---|---|
| Motion (motion.dev) | React/Vue component motion, gestures, layout transitions | LEARN: use only inside an existing component app | owner brief 2026-10-19 |
| GSAP + ScrollTrigger | Cinematic timelines, pinned scroll scenes; free under GSAP's standard licence | PILOT: add per site when the storyboard needs pinned/synchronised scroll scenes; our CSS scroll timelines cover simple reveals | owner brief 2026-10-19 |

## Ten repos from the owner's post — 2026-10-24
Owner order: "add these repos with everything we can learn and every tool we can take". All ten were cloned read-only at the commits below
and read before anything was copied; what fits is vendored whole with its licence (`toolkit/README.md`, `toolkit/toolkit.json`).
| Technology | What was learned | Decision | Source |
|---|---|---|---|
| Impeccable 4.7.1 (Apache-2.0, ~85k★) @ 9368675 | Mode-first design (persuade / operate / read / experience), 24 command playbooks, a craft floor (contrast, depth, spacing, type measure, one authored motion moment, themed browser surfaces) and refusals (eyebrows are a ban; card grids, hero-metric template, gradient text, glass, coloured side borders, emoji icons); engine is a Rust binary that downloads itself | INTEGRATED: skill `impeccable` over `toolkit/impeccable/` (launcher removed; no-launcher path); web stage D | github.com/pbakaus/impeccable |
| UI UX Pro Max 2.15 (MIT, ~139k★) @ d14efff | Offline design-system generator (Python stdlib): pattern, style, 16 colour roles with checked on-colours, type pair, effects, anti-patterns, checklist; domain search over 79 styles / 192 palettes / 74 pairings / 119 UX rules / GSAP presets | INTEGRATED: skill `ui-ux-pro-max`, `studio.mjs web system`; web stage B (was LEARN 2026-10-19) | github.com/nextlevelbuilder/ui-ux-pro-max-skill |
| MCP for Blender (MIT, ~32k★) @ febcd90; server mcp-for-blender 2.2.4 | Blender add-on as a socket server + MCP tools (scene, objects, materials, Python, viewport shots, Poly Haven/Sketchfab); anonymous telemetry unless `DISABLE_TELEMETRY=true` | PILOT on the owner's PC: add-on vendored, pinned server, skill `blender-mcp`; not in `.mcp.json` | github.com/ahujasid/blender-mcp |
| img2threejs 2.0 (Apache-2.0, ~19k★) @ 954cd58 | Photo → procedural Three.js by a staged sculpt contract (validate, quality contract, spec, 7 build passes, review, rig) with resumable state and a vision correction loop; Python stdlib | INTEGRATED: skill `img2threejs` over `toolkit/img2threejs/`; entry points answer here; no model built yet | github.com/img2threejs/img2threejs |
| video-shotcraft (Apache-2.0, ~13k★) @ 43bd349 | 124 shot cards (150 shots) with tuned parameters and pitfalls; aesthetic rules as rejection case law (slower first cuts, acceleration not speed, ≤ 3 whole-frame beat hits, ≤ 2 light sweeps, fly-ins land in slots, readable text ≥ 5 % frame height, 3D text via CSS zoom) | INTEGRATED: cards in `moves search --library=shotcraft` with our English one-liners; skill `video-shotcraft`; rules in CRAFT/TECHNIQUES. Remotion template and demos not copied | github.com/Vincentwei1021/video-shotcraft |
| HyperFrames (Apache-2.0, ~70k★) @ 8a84bed; CLI 0.8.191 | Render contract (seek a paused timeline), `check`/`snapshot`/`timeline` loop, ~450 registry blocks, Figma → video, Remotion porting; telemetry off with `DO_NOT_TRACK` | ADAPTED: five skills vendored, skill `hyperframes`; external-engine route already in `lib/engines.mjs`. CLI install was refused in this cloud session — first run on the owner's PC | github.com/heygen-com/hyperframes |
| Penpot (MPL-2.0, ~62k★) @ 74add05 | Official MCP server talks to a Penpot plugin over WebSocket; the model runs Plugin-API code in the open file; remote server for hosted designs | PILOT: skill `penpot-mcp` + setup (needs the owner's account); nothing copied | github.com/penpot/penpot (mcp/README.md) |
| Remotion agent skills @ 6c67adc | Rule files per job; the Arabic text rule (bidi base direction, joinable per-letter units with ZWJ) | LEARN only: no licence file, so no copy; Arabic rule rewritten in TECHNIQUES.md. Remotion stays LEARN (company licence) | github.com/remotion-dev/skills |
| Lemo-Opuscar (MIT) @ 3961ddb | Now 59 style cards (was 51 on 2026-10-16) | INTEGRATED: cards vendored to `library/lemo-styles/`, `styles --library=lemo`, MCP `style_list {library:"lemo"}` | github.com/lemomo-ai/lemo-opuscar |
| diagram-design 2.6 (MIT, ~60k★) @ 0b9b10c | 45 diagram types as one HTML+SVG file, editorial tokens, light/dark/full/animated, import from Mermaid/draw.io/Excalidraw, `self_check.py` | INTEGRATED: skill `diagram-design` over `toolkit/diagram-design/`; self-check passes on its examples here | github.com/cathrynlavery/diagram-design |

## Open-source motion, physics, covers, captions — 2026-10-24
| Technology | What was learned | Decision | Source |
|---|---|---|---|
| greensock/gsap-skills @ aed9cfd | Eight official GSAP skills (core, timeline, ScrollTrigger, plugins, utils, React, frameworks, performance) | INTEGRATE: `toolkit/gsap-skills/`, skill `gsap-skills`, web stage C. The GSAP library is not copied. | github.com/greensock/gsap-skills; LICENSE in the clone |
| GSAP library | Standard no-charge licence, not MIT. Commercial sites are included; a visual builder that competes with Webflow is not. | LEARN: add per site, pin the version, credit GreenSock, check gsap.com/standard-license for that client | gsap.com/standard-license |
| dylantarre/animation-principles @ 8359713 | Disney's 12 principles, one skill each | INTEGRATE: `toolkit/animation-principles/`. Six become critic rules with evidence and a fix; six stay a checklist. | github.com/dylantarre/animation-principles |
| pmndrs/react-three-rapier @ ae5c3fe | Fixed timestep, previous-state interpolation, auto colliders, sleeping | ADAPT: those patterns in `lib/physics.mjs`. The React wrapper is not copied. | github.com/pmndrs/react-three-rapier |
| @dimforge/rapier3d-compat 0.21.0 | WASM rigid-body engine; the compat build inlines the WASM | INTEGRATE: `setup physics` into git-ignored `vendor/`. Films bake once and sample any frame time. | npm package.json, licence Apache-2.0 |
| three.js 0.186.1 | Already the gpu pin. A tree-shaken file (renderer, standard material, two lights, three geometries) is small enough for a static explainer. | INTEGRATE: `web/explainers/anatomy` (original coffee grinder; Three.js is the only runtime dependency) | npm `three@0.186.1`, MIT; `engine/three/LICENSE` |
| vercel/satori @ 074f0b3, npm satori 0.63.2, and @resvg/resvg-js 2.6.2 | SVG from an element tree, then PNG. Arabic shaping held on the looked-at card. | INTEGRATE: `setup covers`, unmodified. MPL-2.0 file-level copyleft is not triggered. | npm package.json (both MPL-2.0); clone read only |
| motion-canvas/motion-canvas @ 7b91435; npm packages 3.17.2 | Editor renderer. No package has a `bin`. Plugins are CommonJS. | INTEGRATE as an isolated optional engine (`engines/motion-canvas`). Keep the npm pin. Upstream `packages/ffmpeg` at that commit is GPLv3 (version string still 3.17.2); the installed npm LICENSE files are MIT. GPLv3 would make the encoder unusable for client work without review. | installed package.json and LICENSE; clone `packages/ffmpeg/package.json` |
| whisper.cpp, faster-whisper, sherpa-onnx | Local speech. Music-only audio with VAD off was transcribed as "Thanks for watching!". | ADAPT: `lib/whisper.mjs` calls them in that order and does not download models. faster-whisper decodes the WAV itself and leaves Silero VAD on. whisper.cpp and sherpa-onnx were not run in this pass. Licences: whisper.cpp MIT, faster-whisper MIT, sherpa-onnx Apache-2.0, OpenAI Whisper weights MIT. | ggml-org/whisper.cpp; SYSTRAN/faster-whisper 1.2.1 in a local venv; existing `tools/live.py` |
| Motion lab | A curve, a frame ruler, and the export commands this repo actually runs | original work, no third-party code (`web/lab`) | this studio |

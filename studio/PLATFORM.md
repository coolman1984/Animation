# PLATFORM — how the studio is organised (read this once, then use `node studio.mjs`)

North star: **any pixel, still or moving, on any screen — designed, animated, composited, analysed and delivered at top quality.**
A video is images in sequence + sound + time; an image is layers + color + light + shape + text.

## Four levels
| Level | Question | Where it lives |
|---|---|---|
| Brain | What should the viewer feel and see? | the agent + skills (`film-director` first), `BRIEF.md` |
| Scene | Which layers, camera, light, copy? | `production.json` (shots, `craft.layers`, copy, cues) |
| Time | When does each thing appear, move, settle, cut? | `film.js render(t)`, cue sheet, `lib/rhythm.mjs` |
| Engine | How do layers become pixels and a file? | composer page + engines below, `make.mjs`, FFmpeg |

The agent is director, designer, editor and engineer. Renderers are tools under it.

## The front door
```bash
node studio.mjs caps                          # what we have: maturity + installed? + best use
node studio.mjs new <film> --placement=reels --duration=30   # starter film (config, plan, film.js, score, brief, ledger)
node studio.mjs route <film>                  # engine per layer of every shot (or: route text particles:4000 3d)
node studio.mjs setup <profile>               # install a tool pack only when a film needs it
node make.mjs <film> [--profile=review|final] # build (WORKFLOW.md)
```

## One scene language, many engines (the "universal scene")
Each shot lists what it contains: `"craft": { "layers": ["text", "particles:20000", "3d"] }`.
Layer types are listed in `capabilities.json` (`layerTypes`). The router picks the most mature installed engine
that serves each layer type within its limits, and names a better engine that is missing instead of hiding it.

The compositor is the composer page itself: DOM, SVG, Canvas 2D, WebGL shaders, Three.js and PixiJS canvases stack
in one stage (z-index, CSS blend/filter, masks), so every layer shares one clock `render(t)`.
Work from outside the browser (Blender, footage, any external render) enters as a video/image-sequence layer
(`lib/footage.js`) or as a whole silent picture (`lib/engines.mjs`). This keeps the system simple: there is
no second timeline and no second compositor to keep in sync.

## Capability registry and maturity
`capabilities.json` is the single list. Every entry has a check (how to detect it), a profile (how to install it),
what it serves, best/avoid use, licence and maturity:

`CORE` stable default → `PRODUCTION` tests + several films → `PROVEN` one film or study → `EXPERIMENTAL` a passing
study only → `PLANNED` decided, not built → `LEARN` ideas only, no dependency.

**Graduation rule:** a new engine starts as PLANNED. It becomes EXPERIMENTAL only when a 3–8 s study in `examples/`
renders identically in separate runs and looks right (three-study and pixi-study did this on 2026-10-03).
PROVEN needs one real film; PRODUCTION needs several films plus tests. `loadRegistry()` refuses EXPERIMENTAL and above
without a study folder.

## New technology: learn → adapt → integrate
Before adding anything, answer these questions:
- What problem does it solve for a film we make?
- Can our native engine do it in ~200 lines?
- What is its licence (GSAP and Remotion are not MIT)?
- What does it cost (size, GPU, model weights)?

Then pick ONE outcome:
- **LEARN:** take the idea, add no dependency.
- **ADAPT:** write our own small primitive.
- **INTEGRATE:** pin a version, install it through a setup profile and make it pass a study.

Never clone or install blindly. The research department is the `technology-scout` skill. Its dated log is `TECH_RADAR.md`.

## Knowledge layers (keep them apart)
| Layer | File | Changes |
|---|---|---|
| Craft (timeless) | `CRAFT.md`, `QUALITY_PLAYBOOK.md`, `CRAFT_GUIDE.md` | rarely; lessons with numbers |
| Technique (stable recipes) | `TECHNIQUES.md` | when a recipe is proven |
| Technology and trends (dated) | `TECH_RADAR.md` | refreshed by the scout. Never copied into craft as "the style of the year" |
| Reference analysis (per project) | private reference packs, `reference/lessons.json` (transferable principles only) | per job |

Artistic study of a supplied film (style language, emotion, attention, pacing, cinematic intent, the 20-section
Artistic DNA) is already built: `ARTISTIC_FORENSICS.md` + `reference.mjs`. Learn the grammar, write a new sentence.

## Departments → skills (load only what the shot needs)
| Department | Skill(s) | Engines / tools |
|---|---|---|
| Direction | film-director, creative-director, idea-lab | `studio.mjs`, BRIEF, production.json |
| Design and type | motion-composer, storyboard-writer, subtitles-rtl, brand-kit | dom-svg, typography/layout libs |
| 2D / particles / VFX | motion-composer | canvas2d, pixi, webgl-shader |
| 3D | camera-director (+ motion-composer) | three (EXPERIMENTAL), blender (PLANNED) |
| Camera and depth | camera-director | cinema, depth |
| Editing and rhythm | edit-rhythm | rhythm, cues, edl/otio |
| Sound | sound-designer | score, music-analysis, sound-library, mixcheck |
| Voice, transcript, dubbing | voice-director | transcript, speech-recognition, voice-windows/local/cloud (VOICE_STUDIO.md) |
| Colour | qa-judge (+ ffmpeg-master) | color-management: ΔE check, scopes, legal range, OCIO-baked LUTs |
| Live action | live-action-editor | footage, live-analysis |
| Product UI | screen-actor, cdp-capture, studio-clock | app-capture, ui-motion |
| Reference study | reference-reverse-engineer (+ ingest, motion/audio forensics, recreation-director) | reference-lab |
| QA and delivery | qa-judge, platform-delivery, ffmpeg-master, thumbnail-poster | make.mjs gates, review evidence, review player (`studio.mjs review`) |
| Research | technology-scout | TECH_RADAR.md, capabilities.json |
| Machine | studio-doctor | `studio.mjs doctor` |

## Browser session modes
- **private** (default): each render worker starts its own headless Chrome with a throwaway profile and closes it.
- **attach**: set `STUDIO_CDP_URL=http://127.0.0.1:<port>` when Chrome must be started by an approved launcher with `--remote-debugging-port`.
  - The studio opens an isolated browser context per worker and disposes only that context. It never starts, kills or reconfigures that browser, and the owner's tabs stay open (verified).
  - Launch flags (e.g. SwiftShader for `config.gpu`) cannot be applied to an existing browser.
  - Pixels differ slightly between modes (42 dB PSNR measured). The picture cache keys on the mode, so one film never mixes modes.

## Colour contract
The browser renders sRGB. Exports are BT.709, limited range, tagged.
- `node studio.mjs color check` proves it end to end: ΔE mean 0.70 / max 1.22, and 0.54 / 1.07 with `config.dither`.
- Review galleries carry waveform/vectorscope/histogram scopes. make prints a legal-range note.
- `config.lut` applies a .cube grade before encoding. `tools/ocio_bake.py` bakes LUTs with OpenColorIO's built-in studio config (e.g. ACEScg renders → sRGB).

## Not built yet (honest list; open only on an owner request)
- Blender bridge.
- EXR multi-pass compositing (OCIO LUT baking exists).
- Exact OTIO handoff (audit B05: gaps, speed and audio offsets are not exported).
- A shared job runner with deadlines.
- Concurrent-build safety.
- Source separation (needs PyTorch).
- Verified cloud voice adapters (need keys).

The full audit with sources: `../STUDIO_AUDIT_AND_TECHNOLOGY_REPORT_2026-10-03.md`.

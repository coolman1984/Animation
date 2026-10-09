# CHANGELOG — how the studio evolved

Newest first. One entry per closed scope: what changed, what it proved, what stayed unverified.
Operating rule: **a scope is not closed until this file, `../STATUS.md` and every doc/skill the scope touched are updated**
(`test/docs.test.mjs` enforces the checkable part). Evidence lives in each film's `LEDGER.md`; techniques in `TECHNIQUES.md`;
lessons in `CRAFT.md`. Renders (`out/`, `takes/`) are never in git.

## 2026-10-08 — Film 15 v3: picture follows the untouched reference music (scope DONE)
Owner: keep the music exact, sync the picture to it. Removed the 2 % tempo fit; `film15/timing.js` maps real time to authored time (×1.0206) for picture, spectrum and effects. take09: all gates PASS, every cut within 24 ms of a drum hit. Licence not verified; not listened to.

## 2026-10-08 — Film 15 v2: the reference reel's music (scope DONE)
Owner: use the reference music exactly, change nothing else. `score.mjs` loads `source/reference-reel.mp4`, fits 117.57 → 115.2 BPM with rubberband (2 % slower, pitch kept) so every cut stays within 15 ms of a drum hit, plays source beats 0–23 twice (repeat on the 12.5 s flash cut, 30 ms crossfade), matches the old bed's RMS; effects and picture unchanged except the music-reactive equalizer/relief. take08: all gates PASS. Licence of the track not verified; not listened to.

## 2026-10-08 — Film 15: «إتكلم كورة» 25 s voxel motion-graphics showreel ad, 16:9 (scope DONE)
Owner sent a reference reel (cube/voxel subjects, flat colour worlds, equalizer, manga lines), a football channel's assets and its intro video. New reusable pieces inside `film15/`: `voxel.js` (images / rasterised Arabic text / procedural shapes → shaded cubes that assemble, pulse with the music and burst), `pitch3d.js` (cube pitch with an orbit camera, live Voronoi pitch-control, pass trails, offside wall), an equalizer driven by a spectrum measured from the real mix (`score.mjs` → `data/spectrum.js`), comic-ink version of a photo (halftone threshold), five transition families (iris, blinds, whip, cube-wipe, flash). Original 115.2 BPM score with a lookahead limiter and a lock hit 3.9 dB above the cut hits. Film folder named film15 because main already had a `film5`. One independent review: 4 majors fixed (host matte, trophy matte, equalizer bug — fractional band index gave NaN so only 2 bars drew —, manga text contrast) plus empty post-cut frames, clearances, bar-race layout. Not verified: listening, real-speed viewing. Standings in the bar race are the owner's 2026-10-08 screenshot (perishable).

## 2026-10-07 — Film 14 v5: half-time groove, slower feel on the same picture (DONE)
Owner: v4 still too fast. Kept the picture on its 150-BPM grid and changed the drum and chord pattern to half-time (78 kicks/min, 8th-note hats). take07: every export gate PASS. Not verified: listening. A true 120 BPM would need about 5 s of scenes cut.

## 2026-10-07 — Film 14 v4: the score becomes film12's sound at 150 BPM (DONE)
Owner: still bad; make it like the «مخطط المساحات» project's music, fast and distinctive. The score is now built from film12's own voices, mix, progression and hook, re-timed to 150 BPM and mapped onto film14's chapters, with film14's event sounds. take06: every export gate PASS. Not verified: listening.

## 2026-10-07 — Film 14 v3: balanced phone-ready score, title in front of the host (DONE)
Owner: music still very bad; the show title must appear whole in front of him at the bottom. Measured the real fault (70–85 % of the energy below 150 Hz) and rebalanced the buses, rebuilt the kick/bass for small speakers and added a bright synth hook. Title: one extruded line in front of the host, light sweep inside the letters. take05: every export gate PASS. Not verified: listening; offered to re-time the film to any track the owner sends.

## 2026-10-07 — Film 14 v2: official logos, recorded-orchestra anthem, new host ending (DONE)
Owner: put the official logos, the music is very bad, the ending is very bad, find energetic / World Cup music. Crests from his screenshots on shirts, result cards, a new two-league standings scene and an end parade; his Premier League photos as cards. Web music sites are blocked in this environment, so the score now uses recorded CC0 orchestra samples (VSCO 2 CE via GitHub) in the style of the 2026 World Cup anthem (orchestral + EDM), melody original. Ending rebuilt: 2× smooth slow motion, the host cut out per frame, «اتكلم كورة» flies onto the screen behind him. take04: every export gate PASS. Not verified: listening.

## 2026-10-07 — Film 14: «اتكلم كورة» 2D football motion showreel, 20 s Facebook Reels (DONE)
Owner rejected film13's 3D: new 2D-only film at 150 BPM. The ball as hero through kick-off, a chalk tactics board (4-4-2 → 4-3-3, passes), one shirt flipping through الأهلي / الزمالك / منتخب مصر, colour roundels for the Egyptian league and the Premier League, three real sourced results as slot-machine scores, unlabeled analysis graphics with a match clock, a one-word-per-beat blast, and the host's own footage until the show title has flown in behind him, frozen in a gold frame. Original crowd-chant score. take02: every export gate PASS. Not verified: listening, real-time phone viewing; official crests not supplied.

## 2026-10-07 — Film 13: «اتكلم كورة» 3D/2D football-show showreel, 20 s Reels (DONE)
Owner request: a 20 s showreel on the topic of his football-show intro, "3D and 2D, go all out"; mid-production: only «اتكلم كورة», no other words. One hero (the chalk line) from an SVG scribble to a 2D tactics board, lifted 3D pass arcs, the ball's flight and the replay trajectory, to the title underline. Real Three.js stadium (six floodlight banks, stands, crowd lights, pitch, goal, holographic players, ball, net bulge, sparks), bullet-time replay with projected SVG HUD, the owner's host footage on the big screen (text-free span), extruded gold title. Original 120 BPM E-minor score. take01: every export gate PASS. Not verified: listening, real-time phone viewing.

## 2026-10-07 — Film 12: «مخطط المساحات» 3D motion showreel, 20 s Reels (DONE)
Owner request: a 20 s motion-graphics showreel about the space-planning app from his two posters, five app screenshots and the Pixel Plus logo, "go all out". First film in real Three.js 3D end to end: a plan measured from the owner's screenshot is drawn by a pen, lifted into walls by one hero (the app's cut plane), sliced to 1.10 m, furnished room by room (25 procedural pieces with drop + squash), re-finished by clipped sweeps (three options), flattened into a flipping work floor with four zones, then the real app window and a light end card with the logo whole and the poster's CTA. Original 120 BPM D-minor score with one returning hook and a sound per event. take04: every export gate PASS (text 0 issues after take01's 87 and take03's 1). Not verified: listening, real-time phone viewing.

## 2026-10-04 — Production-path bug review and fixes (DONE)
Fixed delivery/gate propagation, missing video errors and stale/nonnumeric take selection; malformed spec/CLI validation; silent audio division; asset path confinement/fresh-library copies/content refresh; narration content cache/PYTHON/absolute tool path; scene-boundary coverage and inherited/retargeted shape colors; deep format overrides; supplied-media dependencies/rights/phase alignment; bounded workers and CDP startup deadlines/cleanup. Focused tests 37 pass/2 optional skips, docs 5 pass; check-only showreel passes. Existing video exports unchanged. Full evidence and limits: CODE_REVIEW_2026-10-04.md.
## 2026-10-04 — FORM / FUNCTION resume showreel and latest-branch integration (DONE)
Integrated fixed main/latest snapshots on `codex/innovation-showreel`, preserving unfinished original work. New 32-second landscape spec: one analytic ribbon across kinetic type, sculpture, generative systems, pointer-driven UI and creative-engineering identity. Reusable CPU ribbon and cursor modules, wipe transition and optional vignette, Windows path/listing fixes, correct literal-background contrast, creative/craft forwarding, and no stale delivery report after a failed build. Final take02: 32.000 s, 1920x1080, 30 fps; -14 LUFS, TP -7.4 dBTP, LRA 2.1 LU; 11 export gates PASS; dense text zero issues. Targeted tests 8 pass/1 optional skipped; full-size style frames, dense text and 8-second proof pass; exported-frame judging complete. Listening/real-time human viewing unverified. No external media or affiliations. No public push.

## 2026-10-04 — Film 11 v2: 44 s, readable (scope DONE)
Owner: client couldn't read; cards blank mid-turn; hosts too short; music catchier. 120 BPM clock (all ~20% slower), six areas 2.5 s each with text always on the turning card, hosts chapter 12–16 + names under the CTA, score rebuilt as western dance-pop (house bounce, 3-3-2 hook, 4/8/16/32 snare build). take07: −14.1 LUFS, TP −3, LRA 3.1, share 28.4 MB; text gate FAIL (kinetic overshoot boxes). Not verified: listening.

## 2026-10-04 — Film 11: AI × HR workshop showreel, 25 s 16:9 (scope DONE, delivered on demand)
Real CSS 3D (extruded type, flip cards, cylinder ring, floor grid), one `timing.js` clock for picture and 144 BPM score. 60 fps renders stalled three times in the 3D title: layers cut (≈200 → ≈70), glow moved off `filter`, render tool reopens a stalled page. Owner asked for it immediately → 30 fps take06. Text gate failed (kinetic overshoot boxes), all others PASS. Not verified: listening, 60 fps export.

## 2026-10-03 — Film 9 v3: the chair scene becomes a low wavering warning bell (scope DONE)
Owner: no patient sounds at all; a low, wavering alarm-like bell that says "I have a problem and I'm worried". Bell tolled on the start and each failure, lower each time, over a beating hum. take07 all gates PASS. Owner taste recorded in QUALITY_PLAYBOOK §0.

## 2026-10-03 — Film 9 v2: expressive chair-scene sound (superseded by v3)
Owner: the chair-scene sounds were bad and not expressive. Rebuilt 0–3.9 s only: heartbeat, breath in/out, stick-slip wooden creak, seat thump, leg knocks. take06 all gates PASS. Not verified: listening.

## 2026-10-03 — House method: films 6–9 branch merged into main as the authority (scope DONE)
Owner: this branch's experience, techniques and ideas must dominate the project so he can use it from main.
- New `QUALITY_PLAYBOOK.md` §0 "Owner taste" (music, logos, honesty, language, film shape, placement, references), referenced first from `CLAUDE.md`, `film-director`, `sound-designer`.
- Merged origin/main (platform v1, Windows port, render stability, voice department kept). Number clash: main's WIP `film7` (3-min Pixel Plus presentation) → `film10`; SANAD stays `film7`.
- Known: `platform.test.mjs` worker-planning test fails on this container on main too (machine-dependent).

## 2026-10-03 — Film 9: NeuroAnara «Decode the Case», 20 s Reels, no music (scope DONE)
Owner: a 20 s ad for an educational neuro-physiotherapy page, sound effects only, true to its posts, colours and calm scientific spirit.
- `film9/`: a seated patient fails to stand → dendrites to the eight causes → a pulse along an axon lights Finding / Meaning / Treatment Direction → فكّر. اربط. قرّر. →
  "Neuro is decoded." with literally decoding letters → lock-up. Cream/navy/teal/gold with the page's corner waves.
- New font: **Lora** (OFL) vendored for serif wordmarks; composer `@font-face`, ASSETS row.
- Sound without music: room tone + event effects; tanh soft limiting before normalisation fixed a true-peak overshoot that sparse effects caused at −16 LUFS.
- take04: all gates PASS. Not verified: listening.

## 2026-10-03 — Film 8: Pixel Plus formal factory pitch, 25 s 16:9 (scope DONE)
Owner: same content and order as a supplied promo, formal, for a factory's top management; Pixel Plus's only clients are Samsung Electronics Egypt's TV and mobile plants.
- Reference transcribed with `tools/live.py` (VAD + Whisper turbo) to get the exact order; mapped statement by statement, "and many more" replaced by «ومصنعكم.. المحطة القادمة».
- `film8/`: production-line rail with seven stations, the brand pixel as the work-piece, blueprint factory, template-scan → pixel-built screen, braided strands, client cards (name as text only), reticle on the floor, logo lock-up (white letters, blue dot/plus).
- take04: all gates PASS (−16 LUFS for room playback). Not verified: listening, viewing on the real screen.

## 2026-10-03 — Film 7 revision: logo build cut, 15 s (scope DONE)
Owner: the logo-building part was "very ugly"; keep the logo entering ready with the text under it, shorten. The 10 s build was removed; the finished logo pops in at 7.5;
the score is composed on the long timeline and spliced on the bar line. Delivery `reels15`; take09 all gates PASS. Not verified: listening.

## 2026-10-03 — Film 7: SANAD «معاك سند», 25 s Reels ad (scope DONE)
Owner request: a premium, calm, motivating 25 s ad for SANAD Business Advisory that plays on the client's emotional and psychological needs, shown as a motion-designer showreel ("go all out").
No placement named → studio default for social video: 1080×1920 @ 30 fps, one delivery.
- **Idea:** the name means *support*. A founder's growth line is dragged down by four weights (accounts · team · sales · decisions); the ground rises under the line like a dawn; the brand's
  icon is built from its three meanings (shield = trust, infinity ribbon = partnership, arrow = growth); the four weights return as four calm service rows; the lock-up lands with the brand's own tagline.
- **New:** `film7/` (BRIEF, production.json, config, film.js, score.mjs, `icon_trace.py`, LEDGER). `icon_trace.py` splits a raster logo into colour pieces (navy/gold/green components, potrace, the owner's pixels as colour plate).
  Original 96 BPM score (heartbeat + four thuds → breath → E7→C deceptive resolution → groove with a returning hook → lift on the arrow → arrival on the logo).
- **Techniques:** ground-rises-along-the-line wipe (clip polygon from the line), outline-to-fill with a blueprint underlay, stroked bridges where a logo's halo cuts a shape, path draw by clip polygon with a pen of light, white sticker halos under overlapping logo parts.
- take08: all gates PASS after 2 of 2 correction rounds. Not verified: listening, real-speed human viewing, a fresh reviewer, live Meta overlays.
- Brand conflicts reported to the owner: three different icons and two descriptors across the boards (see BRIEF).

## 2026-10-03 — Render stability: memory-sized workers, orphan reaping, CDP deadlines, resume, safe build command (scope DONE)
Owner: "fix the problem that keeps hanging and closing this session all the time". Two film10 (then film7) renders had crashed the host application.
- Cause found by measurement: Windows commit limit (15.7 GB RAM + a fixed 2 GB page file) with ~1.7–3 GB free; six 1080p SwiftShader Chrome workers exhausted it → native OOM in node, host app killed; each crash left 32 orphan Chrome processes (1.9 GB) and one hung node (no CDP deadline).
- `lib/platform.mjs`: `memoryBudget()` (free RAM + Windows commit free via one CIM call, page-file facts), `plannedWorkers()` (3 GB reserve, per-worker model, `STUDIO_WORKERS`).
- `lib/procs.mjs` (new): browser registry, `reap()`, `orphans()`, `killTree()`. `lib/cdp.mjs`: registers every launch, reaps at first launch, kills on process exit, per-request deadline (90 s, `STUDIO_CDP_TIMEOUT`), 45 s page load, abort on socket close/browser exit, safe abandoned-screenshot retries.
- `lib/render.mjs` `video()`: workers capped by the planner (logged), resume from complete slices of a crashed run with the same key, slices kept on failure, `workers/reusedFrames/headroomGB` in the stats.
- `make.mjs`: `takes/<film>/build.log` (all lines, crash-safe), memory line + page-file note at start, `resumeKey`. `studio.mjs build <film>` (reap → headroom → child make → `build-full.log` → exit code) and `studio.mjs cleanup`. Doctor rows: memory headroom with page-file advice, orphan browsers, workers for a 1080p 3D film now.
- film10 (then film7): the 3D chapter is `lazy: true` (built on first use). Proven byte-identical when rendered alone; 1 px × 1 level after another frame (known raster history).
- Verified: syntax of all modules; fast tests 11/12 (the 12th was the docs gate for the new module, fixed by this entry); `cleanup` ran; planner on this machine → 1 worker (headroom 2.96 GB); lazy-vs-eager pixel comparison. Not verified yet: a complete film10 (then film7) render through the new path (running next).

## 2026-10-03 — Browser attach mode, colour management, playback review, voice & sound department (scope DONE)
Owner request: decide the Chrome-launcher question without breaking anything; add colour management and a playback review screen; build
a first-class Arabic/English voice, transcript and sound studio.
- **Browser:** private headless Chrome stays the default.
  - New attach mode (`STUDIO_CDP_URL`) uses an isolated context in a launcher-started Chrome and never starts or kills it. Verified: renders work, owner tabs survive, the context is disposed.
  - Pixels differ between modes by 42 dB, so the picture cache keys on the mode. The doctor supports both modes.
- **Colour:** `lib/color.mjs`:
  - ΔE chart round-trip through the real encoder: mean 0.70, or 0.54 with dither.
  - Scopes for several moments in one launch.
  - Legal range, also folded into `measureAll`.
  - `config.lut` grade via `lut3d`.
  - `tools/ocio_bake.py` (OCIO 2.6 built-in config).
  - Every review gallery shows scopes; make prints a legal-range note.
- **Review:**
  - `lib/review-player.html` is written next to every review gallery. It offers frame stepping, a shot/copy/cue timeline, a waveform, A/B takes, timed notes and keyboard control.
  - `lib/review-server.mjs` + `node studio.mjs review <film>` add HTTP Range, notes storage and approval bound to the export's SHA-256 (voided on change).
- **Voice & sound** (`VOICE_STUDIO.md`, skill `voice-director`):
  - `tools/live.py`: `diarize` (sherpa-onnx pyannote + ERes2Net), `transcribe --lang=auto` decoding per VAD phrase (mixed Arabic/English), speaker labels per word, `tts --each`, safe model download with a PyPI fallback for the blocked Silero host.
  - `lib/transcript.mjs`: canonical transcript, translation/adaptation layers + coverage, logged corrections, fillers, repeats, cut points, search, keep-ranges, SRT/VTT/ASS/TXT/JSON/bilingual.
  - `lib/voice.mjs`:
    - provider-neutral `generate()` with windows/local/openai/elevenlabs/azure
    - performance map, pronunciation lexicon (`voice/lexicon.json`) and voice registry with rights and a consent gate (`voice/voices.json`)
    - film `voice.json` → stems + manifest, `fitToSlot` (±8 % or rewrite), `mixScript` (adelay + ducking)
  - `lib/mixcheck.mjs`: clipping, mono, phone speaker and phase in one pass. `sounds/library.json` + `lib/sounds.mjs`.
- **Verified here:**
  - Windows Hoda ar-EG, David en-US and Piper lines generated (real audio, measured).
  - The mixed AR/EN test clip transcribed with both languages; diarization separated 2 of 3 voices (two similar synthetic male voices merged).
  - Bilingual SRT written; voice script placed, mixed and checked; LUT path applied.
  - Fast tests 30/30 (+2 render-gated skips) in 6 s.
- **Not verified:** the cloud voice adapters (no keys), a listening judgement of naturalness, attach mode with the owner's real launcher, the player in the owner's own browser session.

## 2026-10-03 — Studio platform v1 + audit fixes (scope DONE)
Owner request: apply the "visual production operating system" vision (capability registry, router, universal scene, setup profiles,
maturity, visual lab, technology scout, knowledge layers), the deep artistic forensics brief and the audit report — simple for the agent.
- `studio.mjs` front door: `caps`, `new` (starter film per placement), `route` (engine per `craft.layers`), `setup <profile>`, `doctor`.
- `capabilities.json` + `lib/capabilities.mjs`:
  - 25 capabilities with checks, profiles, serves/limits, licences and maturity.
  - `loadRegistry` refuses EXPERIMENTAL and above without a study.
  - `detect` uses at most one python launch.
  - `route` picks the most mature ready engine within its limits and names the missing better one or the planned one.
- Universal scene kept simple: shots declare `craft.layers` (validated against `layerTypes`). The composer page is the single compositor; outside renders enter as footage or external-engine picture (PLATFORM.md).
- Three.js 0.186.1 + PixiJS 8.22.0 vendored (`setup gpu`, git-ignored) with a composer import map. Studies `examples/three-study` (metallic bottle, PMREM light, orbit) and `examples/pixi-study` (20,000 particles) are deterministic across runs and visually checked → EXPERIMENTAL.
- `setup color` installed OpenColorIO 2.6.0, OpenImageIO, OpenEXR (PLANNED; no adapter).
- `technology-scout` skill and `TECH_RADAR.md` (dated). PLATFORM.md defines departments → skills, the graduation rule, learn/adapt/integrate and the knowledge layers. CRAFT.md is now marked timeless.
- Audit fixes:
  - B01/B02: serve containment by path components and 400 on malformed escapes.
  - B03/B04: total validators.
  - B10: `unchecked` gates (UNCHK, listed in `measure.json` and the verdict).
  - B11: `poster: 0`.
  - B12: share budget validation, MiB documented.
  - R08: tar `filter='data'`.
  - app-capture version via CDP.
- Tests: new `test/audit-fixes.test.mjs`, `test/capabilities.test.mjs`; the targeted run passed 25/25 in 6 s. Not run: slow suites (policy). Pending owner decision: the audit's B09 browser-launcher policy.

## 2026-10-03 — Engineering audit and technology report (scope DONE)
Owner request: find bugs, problems, missing capabilities, useful GitHub projects, and current studio technologies; write a full root Markdown report.
- Added `../STUDIO_AUDIT_AND_TECHNOLOGY_REPORT_2026-10-03.md`: prioritized findings, reproduced evidence, missing tools, project/license/hardware comparisons, verified releases through October 3, and an ordered implementation roadmap.
- Reviewed a hashed 225-file snapshot and preserved concurrent changes. The report distinguishes snapshot defects from later fixes and records test failures/skips without claiming full certification.
- Verification: report links/formatting valid; corrected snapshot docs 5/5, current platform/docs 7/7, current audio analyzer 1/1. Isolated snapshot reference integration still cancelled at its 120-second timeout. Browser rendering and advanced model workflows unverified.
- No production implementation, film, creative recipe, asset or skill advice changed by the report scope. Local evidence remains ignored under `takes/`.

## 2026-10-03 — Windows port, speed-ups and testing policy (scope DONE)
Owner request: "fix and improve, search for needed tools", then "make tests shorter", then "never run slow tests unless producing a real video".
- New `lib/platform.mjs` (`isMain`, `PYTHON`, `devNull`, `slash`, `onPath`, `browserCandidates`) + `test/platform.test.mjs`, which also fails on POSIX-only idioms. The doctor finds Windows Chrome/Edge, reads the version from DevTools and measures disk with `statfsSync`.
- Bugs found by real Windows runs, fixed:
  - Slice edit lists in a 1000 timescale shifted frames at worker joins (`render.mjs` now uses exact timescales).
  - A last-frame seek returned no frame (`ss()` 1 ms early in `review.mjs`/`finish.mjs`).
  - Chromium kill left profiles and a stalled pipe (`shutdown()` in `cdp.mjs`).
  - Python cp1252 crashes (UTF-8 stdio and files).
  - `rm`/`mv` shells, `/dev/null`, FFmpeg glob and Fontconfig `drawtext` failures (fixes the 3 reference test failures).
- Duration gate is frame-accurate (1/fps + 30 ms) instead of ±10 % (+ test). FFmpeg errors now include the command.
- Speed (each process launch ~1 s here):
  - `grab()`: one decode for every review image.
  - `measureAll()`: loudness/freeze/black in one pass, identical numbers.
  - `buildCheck()`: reused required doctor.
  - One-process cached syntax check.
  - Result for a fresh 4 s review build: 61 launches / 78 s → 24 / 46 s.
- Tools: Python forensics + live-action packages installed locally (one OpenCV: `opencv-contrib-python`), logo tracer (`potracer`, `pillow`); requirements files note the single-OpenCV rule. ML models not downloaded.
- Testing policy in `../CLAUDE.md`, `WORKFLOW.md`, `README.md`: `npm test` = quick suite, `test:all` (CI) and `test:render` only during real video production. CI unit step now runs `test:all`.
- Verification: last full render run before the speed-ups 108/112 passed, 0 failed, 2 time-out cancellations; post-change checks targeted (see STATUS). Not verified: a full slow run after the speed-ups, listening, CI.

## 2026-10-03 — Deep app study on Windows (scope DONE)
Owner request: learn the app deeply after cloning the repository.
- Added `APP_MAP.md`: current architecture, film contracts, build profiles, source/delivery time, cache ownership, native/external rendering, technical/artistic checks, reference analysis, live-action packs and worked-project map.
- Verified local plans/delivery selection and ran the existing tests: 109 tests, 87 passed, 3 failed, 19 skipped. All three failures report FFmpeg Fontconfig configuration errors in reference analysis. Local transcript: `takes/app-study-tests.txt`.
- Recorded Windows browser discovery, CLI URL guards, POSIX commands, missing optional Python tools and intentionally excluded assets. Historical Linux results are distinct from local verification.
- Updated STATUS and linked the map from README. No application behavior, creative recipe, asset, film ledger or project skill advice changed; no new media/model downloads.
- Not verified: browser renders, playback/listening, model-backed analysis, complete Windows production or current remote CI. Learning is complete; portability repair was not requested.
## 2026-10-03 — film6 (Pixel Plus) music v2: energetic catchy dance-pop (scope DONE)
The owner's "music very bad and ugly" note was about the Pixel Plus ad. `film6/score.mjs` rewritten on the same 120 BPM grid: 909 kick, off-beat sub,
pumping supersaw Am–F | C–G, one hook returning in every chapter, builds into each drop, final chorus on the logo; every UI foley event kept.
take09 final: all gates PASS; measured 120.0 BPM, logo chorus the loudest section. Not verified: listening.

## 2026-10-03 — live1 music v2: energetic Western tech-pop bed locked to the cuts (scope DONE)
Owner: the soft bed was "very bad and ugly"; wanted Western music with energy, beats and a catchy rhythm that fits the video.
- `live1/score.mjs` rewritten: 133⅓ BPM (bar = 1.8 s, so every cut lands on a downbeat), 909 kick/clap/hats, supersaw Em–C–G–D with sidechain pump,
  sub, two-phrase hook; freeze-frame = musical stop (tape-stop + riser + snare roll), drop on unfreeze, stab on the title. Voice still ducked over it.
- take04 final: all gates PASS; measured tempo 132.86 BPM. Not verified: listening.

## 2026-10-03 — Live-action toolkit: real footage of real people, cut, captioned and animated around (scope DONE)
Owner request: comprehensive research (GitHub + trusted sources) and professional tools for ads with real people who talk and move:
cutting, animation before/after/around them and in empty space, expressive SFX, every 2026 editing capability.
- **Research:** `LIVE_ACTION.md` — landscape with sources (SAM 2/2.1, SAM2Long, Grounded SAM 2, MatAnyone 1/2, RVM, MediaPipe, CoTracker3,
  ProPainter, RIFE, Whisper/WhisperX, sherpa-onnx, Silero VAD, auto-editor, ClipsAI, DeepFilterNet, Demucs, Remotion/Revideo, OpenTimelineIO,
  2026 short-form trends), the editing techniques as recipes, a 10-item roadmap and the limits.
- **`tools/live.py`** (offline after `models`): ingest/conform (dup/blend/mci), Silero VAD, Whisper large-v3-turbo transcription (sherpa-onnx),
  script alignment anchored on micro-pauses (median word-edge error 0.03 s on known-edge speech), scenes, MediaPipe mattes with guided-filter
  edges, face+pose anchors with identity merge and 1€ smoothing, free-space finder, zero-lag subject-following 9:16 reframe, QA preview, scratch TTS.
- **`lib/edl.mjs`** (jump cuts, text-based cuts, timeline ↔ source, J/L cuts, punch-ins, caption pages, cut SFX, OTIO export),
  **`lib/dialogue.mjs`** (voice polish, sidechain ducking, click-free stitches), **`lib/footage.js`** (deterministic footage frames, matte sandwich,
  anchors, canvas sticker outline). Composer awaits a film's async `render()`.
- **Capture robustness:** `screenshot()` retry in `lib/cdp.mjs`; root cause of a > 90 s capture freeze found by bisection (12 chained CSS drop-shadows on a full-frame layer).
- **Study `live1/`** (12 s 9:16 on CC BY 4.0 Intel sample footage): text behind subject, freeze-frame intro, orbit through the matte, punch-in jump cut,
  head breaking out of a card, karaoke captions, ducked mix. All gates PASS on take03.
- **New skill** `live-action-editor`; skills updated: film-director, cdp-capture, sound-designer, subtitles-rtl, edit-rhythm. Doctor lists the live modules.
- Tests: `test/live.test.mjs` (7 unit incl. a real ffmpeg ducking measurement; browser footage-sandwich test; optional Python word-timing test).
- Not verified: listening; real-speed human viewing; heavy models (SAM 2, MatAnyone, CoTracker, ProPainter, RIFE, DeepFilterNet) — hosts blocked here, roadmap only.

 as reusable tools and a quality playbook (scope DONE)
Owner request: record all experience, ideas, techniques and methods so the project can reuse them and raise quality; then PR and merge.
- **`QUALITY_PLAYBOOK.md`** (new): the method that reached premium — hero object from the brand, measured reference grammar, brand truth,
  build order (stills → draft → review → transition strips → critique), motion craft, Arabic type sizes on 9:16, sound without ears, finish checks, ideas bank.
  Linked from WORKFLOW.md, SKILLS.md, CLAUDE.md and the film-director skill.
- **`lib/uimorph.js`** (new, pure in t, 6 tests in `test/uimorph.test.mjs`): `morphBox`, `morphBlur`, `swap`, `cursorAt`, `cursorClick`, `gridDots`,
  `ripple`, `twinkle`, `portal`, `circleWipe`, `coverRadius`, `assembly`, `flight`, `mixHex` — extracted from film 6. Film 6 keeps its own copy (unchanged, already delivered).
- **`tools/logo_trace.py`** (new): general raster-logo tracer (auto or explicit crop, vector parts with colours, colour plate, particle grid,
  `logo-check.png`). Validated on the Pixel Plus logo: same 1,699 particles with film 6's crop; auto-crop showed a stray sheet number in the check image.
- Skills updated: film-director, motion-composer, brand-kit.

 Pixel Plus «بكسل واحد», 30 s Facebook Reels showreel-ad (scope DONE)
Owner request: a 30 s Reels ad like two supplied UI-morph screen recordings, about Pixel Plus (ads, animation, software), refined Arabic,
ending "Made by: Mohamed Fawzy Labib", "go all out". One delivery 1080×1920, 30 fps, 30.00 s.
- **Reference study (measured):** both references have no hard cuts — one container springs between shapes in 0.2–0.27 s with motion blur and
  blur cross-faded content, a cursor drives each change; both at 120 BPM. Recorded in `TECHNIQUES.md` → "UI-morph showreel grammar".
- **Film:** `film6/` (BRIEF, LEDGER, production.json, film.js, score.mjs). The logo's blue i-dot is the only hero: portal dive, ad frame morphs,
  hearts stream, bouncing ball with onion skin and spacing dots, graph-editor curve, dark-mode toggle wipe, code → app, tri-band montage,
  1,699-pixel logo assembly. Original 120 BPM score with UI foley.
- **Logo pipeline:** `film6/logo_trace.py` traces the owner's raster logo into per-letter vector outlines (potrace on a 4× upsample, checked by
  difference overlay), keeps the owner's colours in a fringe-inpainted plate, and samples particle targets; letters render as `<img>` + `clip-path: path()`.
- **New font:** Alexandria (OFL, Arabic + Latin, variable 100–900) vendored as two woff2 subsets and registered in `lib/composer.html`.
- **Studio bug fixed:** review evidence crashed with `ENOBUFS` on large text crops of a 1080×1920 frame (`lib/review.mjs` `rawCrop` maxBuffer);
  regression test fails on the old code. The docs gate now also requires ASSETS rows for woff2 fonts.
- **New opt-in encode:** `config.dither: true` → `encodeFilter()` in `lib/render.mjs` converts RGB→YUV through rgb48/yuv420p10 with error
  diffusion. Proven: chroma rings in dark/blue radial glows appear even after a plain RGB→yuv420p conversion (no x264), and vanish with the
  dithered path in both the CRF 14 master and the 2-pass share copy. Default conversion unchanged (test guards the string), so other films keep their bytes.
- Correction rounds: 2 of 2 (transitions/sound; banding/legibility). `npm test`: see STATUS.md.
- Not verified: listening, real-speed human viewing, fresh-reviewer critique, live Facebook overlays and re-encode.

## 2026-10-02 — Precise forensics tools: exact motion timing, easing curves and measured music (scope DONE)
Owner request: tools to see motion timing and easing precisely and to understand audio; overcome capability gaps.
- **Installed** (optional, per `reference/requirements-optional.txt`): OpenCV 4.10 headless, PySceneDetect 0.7 (numpy/scipy/librosa already present). The doctor now lists the importable forensics modules.
- **`tools/motion_curves.py`** + `node reference.mjs track|timeline|strip`: every decoded frame with its real timestamp; drift-free multi-scale template tracking forwards and backwards from a reference time; moves segmented to one frame; easing fitted together with keyframe start/duration (linear, power, expo, sine, back-out, spring, free cubic-bezier); charts drawn with OpenCV for visual inspection.
- **`tools/audio_deep.py`** + `node reference.mjs audio`: tempo by line fit through the beats + grid phase locked to percussive transients, downbeats, 16-step kick/snare/hat patterns, key with a mode hint (Hijaz/Kurd/major/minor), chord per beat, melody (pYIN, only when a lead exists), sections/builds/drops, silences, SFX candidates, voice likelihood; one-axis spectrogram/chroma/drums/loudness chart.
- **Validated on known answers** (`test/forensics-tools.test.mjs`, 2 tests; CI's Python job installs the same modules): keyframes within one frame, ease-out quint and spring 0.6/0.3 recovered; tempo, key, chord order, kick pattern and drop recovered. Three tool bugs found during validation and fixed before shipping (move target = resting position, not the first zero-velocity point; centred step bins; tempo from a line fit instead of a quantised estimate).
- **Applied to the SaaS UI promo:** measured music/edit/easing facts replace the estimates (`TECHNIQUES.md`).
- **Still not possible here:** speech transcription (speech-model hosts blocked by the network policy); listening for taste.
- `npm test`: 92 tests, 78 passed, 14 skipped, 0 failed.

## 2026-10-02 — Reverse-engineered a SaaS UI promo and added the product-UI motion kit (scope DONE)
Owner request: reverse engineer the new screen recording, learn all its moves, add them to the studio.
- **Analysis:** `reference.mjs analyze` (machine pack, private, git-ignored) + dense 0.25 s grids of the content area; stills inspected (no playback/listening). Result written as the move table in `TECHNIQUES.md` → "Product-UI promo grammar".
- **Studio bug found and fixed:** recordings whose audio runs longer than the picture made the probe use the container duration, the sampler asked for a frame past the last video frame and the whole `analyze` crashed ("Error opening input … f007.png"). `mediaProbe` now uses the video-stream duration and `frame()` steps back 0.2 s once. Regression test `test/reference-media.test.mjs` fails on the old code.
- `npm test`: 90 tests, 76 passed, 14 skipped, 0 failed; `STUDIO_RENDER_TEST=1 examples.test.mjs` 4/4 (includes the new study).
- **New module `lib/uimotion.js`** (pure in t, seeded): `planeTransform`, `tiltSettle`, `planeDrift`, `typeOn`, `caretVisible`, `typeEnd`, `stackLines`, `orbitPoint`, `scatterOut`, `litCells`, `wallCells`, `pulseRing`. 8 unit tests (`test/uimotion.test.mjs`).
- **New study `examples/ui-motion-study`** (7 s, any aspect): exercises every primitive plus `zoomContinuation`; covered automatically by the real-browser determinism test (forward/reverse seek identical).
- Already in the studio and reused, not duplicated: `zoomContinuation`, `cameraPass`, springs, `stagger`, `clipInset`.
- Not claimed: no film was made; motion and audio of the reference were not played; `reference/lessons.json` stays empty (its `learn` command needs inspected playback).

## 2026-10-02 — Project optimisation and taste guard (scope DONE)
Owner request: review the whole project to optimise without lowering quality, and add the two taste rules.
- **Faster review evidence:** `lib/review.mjs` runs its independent ffmpeg extractions through a bounded pool (4): 103.6 s → 71.1 s on film 5's 141 MB master; all 96 evidence files and review.json byte-identical to the sequential version. Runs after every review and final export.
- **Fewer tokens every session:** STATUS.md (read first by every session) 12.6 KB → 3.5 KB; full evidence moved verbatim to `STATUS_HISTORY.md`.
- **One false alarm removed:** onsets are measured from analysis frame 0 (`lib/musicmap.mjs`); a cue at t = 0 no longer reports "1033 ms off". New test fails on the old code.
- **Taste guard** in `WORKFLOW.md`: two type families; no default decorations without a reason. Guidance only (no new step, check or loop).
- Considered and rejected (cost > benefit): a 1–10 scoring loop until 8+ (unbounded rebuilds), Playwright/Remotion installs (own CDP renderer already covers them), JPEG capture for finals (would lower quality), shorter keyframe interval for faster seeking (bigger masters).
- `npm test`: 81 tests, 67 passed, 14 skipped, 0 failed.

## 2026-10-02 — Film 5: BALACONBAR Beni Suef, 25 s Reels ad (one 9:16 delivery)
Owner request: a dynamic 25 s ad for the café in Beni Suef using the owner's four images (real photo, swing poster, AI storyboard, vintage board), everything the studio learned,
retro/80s nostalgia mixed with 2026 motion, exciting original music, ONE video in Reels shape. Source: `film5/` (BRIEF, production.json, film.js, score.mjs, plates.mjs, crops.sh, LEDGER).
- **Film:** 12 scenes on a 120 BPM grid (bars of 2 s): hook, zaman (old), naharda (new, swing), ingredients, menu (dotted-eighth cards), place, sensory, montage (1/8 cuts), arch portal, collide (old vs new split), brand, hold.
- **Score:** original jeel-synth in D hijaz with darbuka maqsum; radio low-pass for the old world; drop at 4.0; hits on the menu, montage and logo.
- **New recipes** (see `TECHNIQUES.md` → Film 5): tape-rewind exit, FLIP card fly, marquee bands, arch portal clip-path, diagonal split swap, blurred-cover portrait macros, `lpSweep` in the score.
- **Process:** builder stills loop (3 layout rounds before any render), draft 16 s, review build (1 gate fail: arch title 4 px outside the safe area; fixed), final build take03, one separate critique pass of the exported frames, one correction round → take04 (all gates PASS, −14 LUFS, share copy 11.45 MB).
- **Main merged in (PR #12: artistic forensics, autonomous delivery, Chromium startup retry):** film 5's render path is untouched — 12 stills rendered before and after the merge are byte-identical; `npm test` 80 tests, 66 passed, 14 skipped, 0 failed; `film5/config.mjs` now declares `ownerRequest` (one delivery, exact size/duration/fps) and `buildOptions` accepts it and refuses a mismatch. The shared-lib change invalidates the cache, so the next film 5 build re-renders (take04 stays valid).
- **Honesty:** the critique pass was done by the builder in a separate pass (no fresh reviewer was spawned); audio never listened to; the vintage-board menu items need the owner's confirmation; address/phone/hours are missing.

## 2026-10-02 — Deep artistic reference forensics
- Adds `reference/artistic.mjs`, 20-section ARTISTIC DNA in every report, contextual evidence-linked observations, full-duration attention/pacing maps with explicit unknowns and playback/listening gates.
- Owner goal enforced: AUTONOMOUS_FILM.md makes all production/inspection/paperwork agent-owned; ownerRequest selects and validates one exact delivery. Owner receives one finished video, no internal approval flow.
- Owner-requested simplification: analyze automatically prepares real timing/evidence drafts; prepare supports older packs, and autoSections reuses each decision across relevant headings without duplicate writing. No inspection attestation is prefilled.
- Reviewed artistic intent enters the recreation blueprint; old technical reviews remain compatible but artistically pending.
- New `reference.mjs direct --brief=file` and original-direction template map reviewed principles to original subject-specific execution, fit, differences and counter-cases.
- Guidance: ARTISTIC_FORENSICS.md, REFERENCE_LAB, workflow/index/cookbook/asset policy; skills updated: reference-reverse-engineer, recreation-director, motion-forensics, creative-director and film-director.
- Validation: schema/provenance/coverage/unknown/audio/playback/original-transfer tests plus existing unit/integration suite. Final CI is the publication acceptance record.
- Not claimed: automatic artistic understanding, psychological universality, measured audience retention, originality certification or a newly produced reference film. No film ledger changed because no film was rendered.

## 2026-10-02 — Showreel 2: reference recreation (scope DONE, 1 of 2 correction rounds)
Owner uploaded a screen recording and asked for a 15 s showreel "like this exactly".
- **Process proven:** `reference.mjs analyze` → visual review of frames, HUD crops and dense segment grids →
  `observations.json` (attested review) → timing map → native film → matched comparison boards → one independent critique → one fix round.
- **Film:** `showreel2/` — 1920×1080, 60 fps, 15 s, 128 BPM, 8 bars, HUD overlay, original score. See its `BRIEF.md` / `LEDGER.md`.
- **Studio improvements made on the way:**
  - gate option `darkSpans` (declared intentional dark passages; shifted per range; unit-tested) in `lib/measure.mjs`, `make.mjs`;
  - `lib/motion.js` `el()` now knows `text`, `textPath`, `polyline`, `polygon` (SVG text ring was silently not drawn);
  - fonts: Archivo (variable width + weight axes), Instrument Serif Italic, Space Mono (all OFL, `ASSETS.md`);
  - techniques catalogued in `TECHNIQUES.md` (directional blur filter, width-axis kinetics, burst glyph, Truchet waves, vertex mesh morph, card-per-beat type).
- **Measured:** gates PASS (15.00 s, 60 fps, −14.1 LUFS, TP −3.2 dBTP, LRA 3.5); critic fidelity ≈ 85 % structure/timing, ≈ 65 % type scale and point-cloud look → round 1 fixed both.
- **Not verified:** audio never listened to (reference or ours), no human real-speed viewing, loop seam, share copy by the critic.
- **Open owner decisions:** wordmark/burst look vs a real brand; the "AVAILABLE FOR NEW PROJECTS" claim; the uploaded recording is tracked at the repo root (owner's call to keep, move or remove).

## 2026-10-02 — Showreel 1 (16:9 + 9:16), merged via PR #10
Own-brand 15 s motion-design reel; one critique (5 majors, 0 blockers) → one round → DONE. Details: `showreel/LEDGER.md`.
Studio fixes: read-back ignores hidden and mask-clipped words; counters caption their final value; calibrated contrast estimate;
`cameraPass` blur profile (whip ends soft, never on a sharp sliver).

## 2026-10-02 — Reference Reverse Engineering Lab (PR #9)
`reference.mjs` ingest / analyze / review / reconstruct / compare / learn, five conditional skills, `REFERENCE_LAB.md`.
Two correction rounds: HTTP byte-range support in the test media server, bounded seek waits, deterministic transition visibility, exact hard-cut timing.
Rule kept: machine pack ≠ visual review; hypotheses carry confidence + alternatives; never claim the source code or software.

## 2026-10-02 — Generation 2 (PR #7)
Springs/inertia/noise/path/morph (`kinetics.js`), cinema splines with velocity-continuous hand-off and diagnostics, depth planes and haze,
transition vocabulary, Arabic-safe typography, aspect layout, analytic particles, optional WebGL (SwiftShader), music map
(librosa → Node → manual BPM), SFX + shared cue sheet, review evidence, real-app capture with verified read-back, layer plates,
external engine adapter. Inventory: `GEN2.md`.
Fixes with lasting value: `settleCapture` (first screenshot after load can be torn); no `will-change`/rest transform (raster history differs by seek order);
fractional viewport rounding; spring settle-time maths; PCHIP tangents for no-dead-stop camera paths.
Tests: 66 total (51 pass, 15 optional skipped, 0 fail) at the time of the last full unit run.

## 2026-10-01 — Fast production pipeline (`WORKFLOW.md`)
Draft / review / final profiles, content-hash caches, `--range`, `--shot`, production.json + preflight, two-correction-round budget,
one independent final critique, artistic acceptance table. Supersedes the original blanket full-build prompt (`PROMPT_STUDIO.md`).

## 2026-10-01 — Films 2–4 (BALACONBAR ads, 4:5 + 9:16)
Own `CRAFT.md` lessons 1–21: logo by frame 1, pixel-matched dissolves, safe bands, grain cost, audio without ears, variant leakage checks (PSNR ≥ 35 dB).

## Earlier
Studio foundation: own CDP renderer (`renderAt(t)` pure in t), zero npm packages, x264 + loudness mastering, gates. `../PLAN.md` is the superseded research.

## Skill map changes (what each skill learned)
| Skill | Change |
|---|---|
| film-director | documentation duty at scope close; showreel route |
| motion-composer | SVG tag list, directional blur, width-axis type, measure-while-visible rule |
| qa-judge | matched reference/ours boards, acceptance criteria checked on the exported mp4, "deliberate non-defects" list |
| sound-designer | score from the same beat grid as picture; linear-frequency sweep; headroom for mastering |
| recreation-director | full-film structural recreation of a screen recording, not only 3–8 s studies |
| reference-reverse-engineer | recording chrome exclusion, clock offset, HUD crops, density grids |
| platform-delivery | share-copy size targets and checks for 60 fps |
| cdp-capture | `settleCapture` |
| ffmpeg-master | verification frame/crop recipes used in showreels |
| post-mortem | append to CHANGELOG/TECHNIQUES, not only CRAFT |
| motion-composer / sound-designer / platform-delivery | Film 5 recipes: marquee, FLIP, arch portal, split swap, maqsum + lpSweep, Reels safe zones and file sizes |

## Note on `reference/lessons.json`
Still empty on purpose: `reference.mjs learn` requires an inspected-motion review, and no motion playback was available in the
showreel sessions (stills and numeric analysis only). Lessons were recorded in `CRAFT.md` (22–28) instead of faking that attestation.

## Test status at this entry
`npm test`: 72 tests, 58 passed, 14 optional/browser skipped, 0 failed (includes the new docs gate). Browser tests were not re-run in this scope.

### Integration correction (one round)
Final-head CI exposed a transient Chromium startup failure and a pre-existing capture server leak that held the render suite open until timeout. app-capture.mjs now closes its server on startup failure and even when client.close rejects; a focused failure test covers no completed-capture claim. cdp.mjs retries startup once only; navigation/render/verification failures are not retried. Publication still requires real browser/encoder success.

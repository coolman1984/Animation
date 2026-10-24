# Load the department you need

Current operating policy: WORKFLOW.md. Do not load every skill or the historical master prompt.
Start a film with film-director + its brief/production.json. Read CRAFT_GUIDE.md only for the current craft decision.

Architecture and engine choice: PLATFORM.md. Before choosing an engine run `node studio.mjs route <film>` (capability registry: capabilities.json).

| Stage / problem | Skill | Reusable tool / evidence |
|---|---|---|
| Which engine for a layer? What is installed? | — | `node studio.mjs caps` / `route`; capabilities.json; PLATFORM.md |
| Browser 3D (Three.js) / 20k+ particles (PixiJS) | motion-composer, camera-director | examples/three-study, examples/pixi-study (EXPERIMENTAL; config.gpu: true) |
| Rigid-body motion that must stay correct when frames render out of order | motion-composer | lib/physics.mjs (Rapier bake at 1/120 or 1/240, then sample(t); `node studio.mjs setup physics`), examples/physics-study. A live sim inside render(t) is forbidden |
| A non-Claude model makes or judges a film; plan / critic / eyes; model bench | any-model-director | ANY_MODEL.md, `studio.mjs director plan\|review\|inspect`, `styles`, `storyboard`, `taste`, styles/, mcp/server.mjs, bench/ |
| A website: landing, company, café, product or portfolio site — new or an existing one to improve | web-director | web/WEB.md ("One workflow": taste-skill → UI UX Pro Max → build + motion storyboard → Impeccable; DESIGN.md per site), `studio.mjs web plan\|build\|check\|serve\|audit`, web/styles, web/motion |
| Motion lab: easing curve, frame ruler, export commands | web-director | web/lab/README.md, `node studio.mjs lab` |
| Web stage B: design system (palette, type pair, pattern, UX rules) from a brief | ui-ux-pro-max | `studio.mjs web system "<brief>" --site=<site>`, toolkit/ui-ux-pro-max (vendored, offline) |
| Web stage D: independent critique and polish; a page that looks generic or AI-made | impeccable | toolkit/impeccable (vendored, launcher removed), `web check` / `web audit` taste lights |
| GSAP on a site: tweens, timelines, ScrollTrigger, plugins, React/Vue, performance (web stage C, only when CSS is not enough) | gsap-skills | toolkit/gsap-skills (official skills, MIT). The GSAP library is GreenSock's standard no-charge licence, not MIT — pin the version, credit it, check the licence per client |
| Disney's 12 principles while judging one of our films | animation-principles | toolkit/animation-principles (12 skills). Critic rules `principle-*` for what a spec can show; the rest is a manual checklist on `film_review` / `principle_read` |
| A diagram (architecture, flow, journey, Sankey, Wardley, axonometric…) for a site, explainer film or report | diagram-design | toolkit/diagram-design (45 types, HTML+SVG, self_check.py). A flat diagram stays here; an exploded 3D object is web/explainers/anatomy |
| A real product/prop/character as live 3D built in code from a photo | img2threejs | toolkit/img2threejs (Python stdlib pipeline), `setup gpu` Three.js route. The interactive exploded view of a mesh already in code is web/explainers/anatomy |
| Interactive 3D explainer: explode, hotspots, tour, Arabic labels, filmable with render(t) | diagram-design, img2threejs | web/explainers/anatomy (parts.json). diagram-design when it should stay a 2D SVG; img2threejs when the mesh must be rebuilt from a photo |
| HyperFrames as an external engine, a registry block, Figma → video | hyperframes | toolkit/hyperframes, lib/engines.mjs (`config.engine`) |
| Product/app/site promo shots with proven numbers (124 recipe cards) | video-shotcraft | `studio.mjs moves search <words> --library=shotcraft`, `moves show <card>`, toolkit/video-shotcraft |
| True 3D / simulation in Blender on the owner's PC | blender-mcp | toolkit/blender-mcp/addon.py, mcp-for-blender 2.2.4 (telemetry off), capabilities `blender` |
| Client design files in Penpot (tokens, components, screens) | penpot-mcp | Penpot's official MCP server (owner's account), toolkit/README.md |
| Any third-party tool we vendored: list, check, update | — | `studio.mjs toolkit [check\|update]`, toolkit/README.md, toolkit/toolkit.json, lib/toolkit.mjs |
| New tool or trend: worth adding? | technology-scout | TECH_RADAR.md (dated), LEARN / ADAPT / INTEGRATE |
| Speech, transcripts, narration, dubbing, sound mix | voice-director | VOICE_STUDIO.md, lib/transcript.mjs, lib/whisper.mjs, lib/voice.mjs, voice/voices.json, voice/lexicon.json, lib/mixcheck.mjs, sounds/library.json |
| Watch and approve an export | qa-judge | `node studio.mjs review <film>` (lib/review-player.html, lib/review-server.mjs) |
| Colour accuracy, scopes, LUT grade | qa-judge, ffmpeg-master | lib/color.mjs, tools/ocio_bake.py, config.lut |
| Chrome must be started by an approved launcher | cdp-capture | STUDIO_CDP_URL attach mode (lib/cdp.mjs) |
| Route a film | film-director | make.mjs, production.json, QUALITY_PLAYBOOK.md (method that reached premium) |
| Named moves: what a move is called, its exact timings, a plan draw (Motion Prompt #001–#120, Cinetic techniques, video-shotcraft cards) | motion-composer, camera-director, web-director, film-director | `studio.mjs moves`, library/README.md, lib/movelib.mjs, lib/mpcard.js |
| UI-morph / showreel motion, logo assembly | motion-composer | lib/uimorph.js, tools/logo_trace.py |
| No concept / direction yet | creative-director, idea-lab | style frames + craft metadata + creative preflight; 59 film styles: `studio.mjs styles --library=lemo` |
| Brand / source truth | brand-kit, data-honesty | asset roles, source/rights records |
| Message, script, dialect | storyboard-writer, subtitles-rtl | copyIssues, textTimeline |
| Cut-outs / clean plates | animation-lab | imagelab, matteSheet |
| Layered scene / focus | motion-composer, camera-director | depthScene + cinema.js cameraPath/rackFocus/microDrift |
| Cuts / pacing | edit-rhythm | rhythm.mjs beat/phrase evidence + shot times + reviewTimes |
| Music / accents | sound-designer | prepareMusic, assembleAudio, masterAudio |
| Runtime trouble | studio-doctor, cdp-capture | doctor, CDP diagnostics |
| Real footage of real people (cuts, captions, animation around people, dialogue mix) | live-action-editor | tools/live.py, lib/edl.mjs, lib/footage.js, lib/dialogue.mjs, LIVE_ACTION.md |
| Real app capture only | screen-actor, studio-clock | recorded actions + verified read-back |
| Delivery / encoding | platform-delivery, ffmpeg-master | make --profile=final |
| Final visual critique | qa-judge | exported frames AND motion/audio playback |
| Cover art | thumbnail-poster | selected hero frame (`stillAt` in lib/finish.mjs) or a generated card (`node studio.mjs cover`, lib/covers.mjs, examples/cover-study) |
| Motion Canvas as an optional isolated engine (editor render; no headless CLI) | — | studio/engines/motion-canvas, lib/engines.mjs (`config.engine` name motion-canvas prints the editor steps and exits 2) |
| A new reusable lesson | post-mortem | append only a useful discovery |
| Gen-2 toolkit map | — | GEN2.md + examples/* studies |
| Recipes with numbers (blur, width-axis type, sync grid, gates) | — | TECHNIQUES.md |
| What changed and when | — | CHANGELOG.md (update at every scope close) |
| Recreate a supplied film as a full short reel | reference-reverse-engineer → recreation-director | showreel2 as the worked example |

One builder by default. A separate final judging pass is required; use a fresh reviewer when available.
Do not spawn a specialist for each department. Never claim a review happened if it did not.

## Reference film supplied (conditional only)
If a film brief supplies a reference video, film-director invokes **reference-reverse-engineer** before
choosing reconstruction techniques. Ordinary films without a reference do not load these departments.

| Specific reference task | Skill | Evidence/tool |
|---|---|---|
| Orchestrate the study and visual grammar | reference-reverse-engineer | reference.mjs analyze/review, REFERENCE_LAB.md |
| Local/URL/page ingest and bounded sampling | reference-ingest | FFmpeg/CDP, evidence-pack.json, transition strips |
| Camera/object/layers/type/easing inference | motion-forensics | motion.json, optical flow, native primitive blueprint |
| Music/edit correspondence | audio-forensics | audio.json, audio-visual-map.json |
| Short original reconstruction and comparison | recreation-director | reconstruct/compare/learn, reference/lessons.json |

Artistic reference study: reference-reverse-engineer → ARTISTIC_FORENSICS.md / artistic-dna.json → creative-director + recreation-director → reference.mjs direct / original-direction.md. Five artistic layers and whole-film curves are evidence-linked reviewer work, never automatic psychological facts.

Owner-facing workflow: AUTONOMOUS_FILM.md — one natural-language request, agent completes every internal step, one finished video. lib/build-options.mjs ownerRequest enforces exact single-delivery width/height/duration/fps.

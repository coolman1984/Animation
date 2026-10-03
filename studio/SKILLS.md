# Load the department you need

Current operating policy: WORKFLOW.md. Do not load every skill or the historical master prompt.
Start a film with film-director + its brief/production.json. Read CRAFT_GUIDE.md only for the current craft decision.

| Stage / problem | Skill | Reusable tool / evidence |
|---|---|---|
| Route a film | film-director | make.mjs, production.json, QUALITY_PLAYBOOK.md (method that reached premium) |
| UI-morph / showreel motion, logo assembly | motion-composer | lib/uimorph.js, tools/logo_trace.py |
| No concept / direction yet | creative-director, idea-lab | style frames + craft metadata + creative preflight |
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
| Cover art | thumbnail-poster | selected hero frame |
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

# Load the department you need

Current operating policy: WORKFLOW.md. Do not load every skill or the historical master prompt.
Start a film with film-director + its brief/production.json. Read CRAFT_GUIDE.md only for the current craft decision.

| Stage / problem | Skill | Reusable tool / evidence |
|---|---|---|
| Route a film | film-director | make.mjs, production.json |
| No concept yet | idea-lab | up to 3 concepts, choose 1 |
| Brand / source truth | brand-kit, data-honesty | asset roles, source/rights records |
| Message, script, dialect | storyboard-writer, subtitles-rtl | copyIssues, textTimeline |
| Cut-outs / clean plates | animation-lab | imagelab, matteSheet |
| Layered scene / focus | motion-composer, camera-director | depthScene, projectLayer, coverCamera |
| Cuts / pacing | edit-rhythm | shot times, reviewTimes |
| Music / accents | sound-designer | prepareMusic, assembleAudio, masterAudio |
| Runtime trouble | studio-doctor, cdp-capture | doctor, CDP diagnostics |
| Real app capture only | screen-actor, studio-clock | recorded actions + verified read-back |
| Delivery / encoding | platform-delivery, ffmpeg-master | make --profile=final |
| Final visual critique | qa-judge | exported frames AND motion/audio playback |
| Cover art | thumbnail-poster | selected hero frame |
| A new reusable lesson | post-mortem | append only a useful discovery |

One builder by default. A separate final judging pass is required; use a fresh reviewer when available.
Do not spawn a specialist for each department. Never claim a review happened if it did not.

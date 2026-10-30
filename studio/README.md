# Studio — code-driven video, animation & editing

Start with the [current status](../STATUS.md), [WORKFLOW.md](WORKFLOW.md) and the [department index](SKILLS.md).
For the architecture, code contracts and findings from the Windows checkout, read [APP_MAP.md](APP_MAP.md).
[CRAFT_GUIDE.md](CRAFT_GUIDE.md) covers directing, natural Egyptian copy, source truth, layered staging and music audition.

```bash
cd studio
node studio.mjs                             # front door: caps | new | route | setup | doctor | review | voice | transcript | mixcheck | color | sounds (PLATFORM.md, VOICE_STUDIO.md)
node lib/doctor.mjs                         # check Chromium, ffmpeg, fonts (Linux, Windows, macOS — see TECHNIQUES.md "Cross-platform")
node film2/plates.mjs                       # prepare owner-supplied photos once
node make.mjs film2                         # quick 12-second silent draft, one version
node make.mjs film2 --range=24:36            # export a changed interval
node make.mjs film2 --profile=review         # one full version with sound + technical checks
node make.mjs film2 --profile=final          # all final versions, extras + full technical QA
npm test                                   # quick suite (skips slow ffmpeg/Python tests) — the routine check
npm run test:all                            # every unit test incl. slow ffmpeg/Python ones (CI)
npm run test:render                         # real Chromium/ffmpeg integration (~20 min on Windows) — only when producing a real video
```
Testing policy (owner order): verify a change with its one test file (`node --test test/<file>.test.mjs`); never run the slow
suites just to confirm a code change. See `../CLAUDE.md`.

Every run writes a new `out/<film>/takeNN/` with `measure.json`. Inspect the actual film before calling it ready.
Final success means technical gates passed; artistic acceptance is a separate pass in `<film>/LEDGER.md`.
A film is `<film>/film.js` (pure time-based render), `score.mjs` and `config.mjs`.
Inputs/results are cached independently by content; declare additional dependencies in config.cacheInputs.
Client source photos/derived plates are intentionally excluded from git: restore them locally before rendering film2.
Instructions: `../.claude/skills/*/SKILL.md`; original prompt: `PROMPT_STUDIO.md`; lessons: `CRAFT.md`; rights: `ASSETS.md`.
Evolution log: `CHANGELOG.md`; reusable recipes with numbers: `TECHNIQUES.md`; toolkit inventory: `GEN2.md`.
Never commit `takes/` or `out/`.

## New-film contract
1. Create `<film>/film.js`, `score.mjs`, `config.mjs`; use the existing film2 as an API reference, not a compulsory aesthetic.
2. Copy `templates/production.json` into the film folder. Replace ALL placeholders, timings and sample copy;
   source paths are relative to `studio/`. This template is a planning scaffold, not a ready-made ad.
3. Add `production: '<film>/production.json'` to config. New films must do this. Import this same JSON in film/score
   if useful (Node/browser JSON imports use `with { type: 'json' }`), or maintain one shared timing module in cacheInputs.
4. Mark real hero sources `product`, mood-only sources `reference`, and recordings `music`/`sfx`. List rights evidence.
   References cannot substitute for the product in a shot. Claims need an evidence note. Copy intervals mean fully readable time.
5. `make` preflights before launching Chromium: missing inputs, invalid timeline/evidence fail; copy findings are advisory.
   Missing rights records/paid-social scope fail for declared final plans. This checks records, not legal entitlement.
6. Legacy films still build with a warning; they have NOT acquired artistic/content certification automatically.

`review-plan.json` lists source-time boundaries, adjacent frames and copy holds. Cut-down joins need their own review.
`measure.json` now records total/per-delivery seconds and picture/text/audio/score cache reuse. No token meter is implied.
New output names receive normal video/gates; automatic music-only/captions/thumb extras are still tied to legacy `hero60`
and WebP to `bumper6`. Use `finish.mjs` helpers for additional requested outputs until those branches are generalized.

## Creative + cinematic toolkit
`lib/creative.mjs` checks production plans for accidental repetition, missing shot craft and overloaded primary motion without pretending to score taste. New `production.json` plans describe shot scale, camera, focal point, transition, depth and audio cue.

`lib/cinema.js` provides deterministic `cameraPath`, `rackFocus`, `microDrift`, `composeCamera`, subtle `lensBreathing` and `cameraKinematics`. `lib/rhythm.mjs` exposes beat/bar/phrase timing and cut offsets; it never forces an edit onto the grid.

## Layer toolkit
`lib/depth.js` exports `depthScene`, `projectLayer`, `coverCamera`, `contactShadow`.
See `examples/depth-study/film.js`: a four-second unbranded geometric study, with no customer photos.
```bash
node lib/render.mjs stills examples/depth-study/film.js --times=0,0.75,1.5,3.7 --w=400 --h=450 --out=takes/depth-study
```
Layer spec: `{width,height,x,y,depth,scale,rotation,anchor:[0.5,0.5],src?,mask?,z?}`.
Camera: `{x,y,zoom,focus,aperture,maxBlur}`; x/y are pan offsets in authored pixels. Depth 1 is the hero plane;
nearer layers have larger depth and more parallax. `scene.render(camera, overridesById)` resets every frame.
Keep layer order (`z`) and source/mask fixed after add; override geometry/opacity per frame. Text stays outside the focused scene.
`contactShadow` takes a projected ground point; it belongs between background and subject in the same stacking context.
These are 2.5D helpers for prepared layers, not automatic extraction or real 3D reconstruction.

## Recorded music
```bash
node lib/music.mjs source.wav takes/music-audition.wav 25 12
```
This selects 25 seconds starting at 12 seconds, applies brief fades and measured loudness mastering. Existing output
is replaced; keep sources separate. The source must contain the requested duration. It does not find/buy/license music.
In score.mjs, call `prepareMusic`, combine with chosen SFX, and write all three stems required by make. The helper's
output is an audition/mastered track; master the final mix again through the normal pipeline. Add recordings to
production.assets or config.cacheInputs so changing the audio invalidates its cache.
`assembleAudio` has duration-preserving click-suppression edge fades, not true overlap crossfades. It now also honors
fadeOut without segments. Silent/unmeasurable masters and audio too short for picture fail with explicit errors.

## Reference Reverse Engineering Lab

Analyze authorized local video, direct media or browser players with `node reference.mjs analyze <source>`.
Compact evidence, optional motion/audio forensics, visually reviewed grammar, native 3–8 second neutral
studies and matched comparisons are described in [REFERENCE_LAB.md](REFERENCE_LAB.md).

## Showreels (reference implementations)
```bash
node make.mjs showreel --profile=final      # 15 s own-brand reel, 16:9 + 9:16, 30 fps
node make.mjs showreel2 --profile=final     # 15 s reference recreation, 16:9, 60 fps, 128 BPM
node make.mjs showreel2 --range=7.5:11.25 --profile=review   # re-export one interval
```
Each has `BRIEF.md`, `production.json`, `score.mjs` and a `LEDGER.md` (critique → fix → result on the exported file).
Showreel 2 declares `darkSpans` for its deliberate dark opening; see `TECHNIQUES.md` before copying it.

## Film 5 — BALACONBAR Beni Suef (25 s, 9:16 Reels only)
```bash
node film5/plates.mjs && sh film5/crops.sh      # needs the four owner images in film5/source (git-ignored)
node make.mjs film5 --range=0:25                 # silent draft, ~16 s
node make.mjs film5 --profile=final              # 1080×1920 @ 30 fps master + share copy + gates
```
Old/new worlds, 120 BPM grid, original maqsum score. Recipes: `TECHNIQUES.md`; decisions and open owner items: `film5/BRIEF.md`; evidence: `film5/LEDGER.md`.

## Precise forensics (optional Python modules)
`node reference.mjs timeline|strip|track|audio <pack|video>`: motion timing per frame, easing curves with keyframes, tempo/key/chords/drums. Details: `TECHNIQUES.md`.

## Product-UI motion kit
`lib/uimotion.js` + `examples/ui-motion-study` (7 s, any aspect): tilted 3-D UI cards, typewriter, headline stack, orbiting icons, UI wall, pulse ring. Recipes and the observed move table: `TECHNIQUES.md` → Product-UI promo grammar.

## Integrated open-source repos (2026-10-24)

Pins below were read from the vendored manifest, the installed `package.json` files, or the read-only clones. A short hash is the pin recorded in `toolkit/toolkit.json`; the full hash is that commit.

| Repo | Pin | Licence | Where | How it is used | Caveats |
|---|---|---|---|---|---|
| [greensock/gsap-skills](https://github.com/greensock/gsap-skills) | `aed9cfd` (`aed9cfd3277740755f6bfc1155c7aa645403b760`) | MIT (the skill files) | `toolkit/gsap-skills/`, wrapper skill `gsap-skills` | Vendored unchanged (`toolkit update`). Web stage C reads the skills. The GSAP library is not in the repo. | The GSAP library itself is the GreenSock standard no-charge licence, not MIT. Check [gsap.com/standard-license](https://gsap.com/standard-license/) per client, pin it, and credit GreenSock. |
| [dylantarre/animation-principles](https://github.com/dylantarre/animation-principles) | `8359713` (`83597134ba8ff59838270f94d7ac7282ffa3b54d`) | MIT | `toolkit/animation-principles/`, wrapper skill `animation-principles` | Vendored unchanged. The house critic scores six principles a spec can show; MCP `principle_read` reads one skill. | Text only. The engine has no arc, via, or bend field: a bend is two morph keys. |
| [pmndrs/react-three-rapier](https://github.com/pmndrs/react-three-rapier) + [@dimforge/rapier3d-compat](https://www.npmjs.com/package/@dimforge/rapier3d-compat) | rapier clone `ae5c3fe` (`ae5c3fede5ca489fd7eaa8271e9d9c5eabc88e98`), read only; npm `@dimforge/rapier3d-compat@0.21.0` | MIT for the React repo (patterns only); Apache-2.0 for the npm package | Engine in `vendor/node_modules/@dimforge/rapier3d-compat` (git-ignored). React repo not copied. | `node studio.mjs setup physics`. `lib/physics.mjs` bakes at 1/120 or 1/240 and `sample(t)` answers any frame. Fixed step, interpolation, auto colliders and sleeping follow the React repo. | The compat build inlines WASM. Missing package: labelled Euler preview only, not a delivery. |
| [three.js](https://github.com/mrdoob/three.js) | npm `three@0.186.1` | MIT | `vendor/` via `setup gpu`; anatomy page uses `web/explainers/anatomy/engine/three/` | Tree-shaken subset (renderer, standard material, two lights, box, cylinder, sphere) plus `LICENSE`, so the explainer stays under the weight gate. | Same pin as the gpu profile. No downloaded model. |
| [vercel/satori](https://github.com/vercel/satori) + [@resvg/resvg-js](https://www.npmjs.com/package/@resvg/resvg-js) | satori clone `074f0b3` (`074f0b38ed0f5d8fa768f709c0bb072b2d6c99e1`), read only; npm `satori@0.63.2` and `@resvg/resvg-js@2.6.2` | MPL-2.0, both, unmodified | `vendor/node_modules/satori` and `vendor/node_modules/@resvg/resvg-js` (git-ignored) | `node studio.mjs setup covers`. `node studio.mjs cover <spec.json>` and MCP `cover_make`. resvg writes the PNG. | MPL file-level copyleft is not triggered: their source is not modified or copied into the studio. |
| [motion-canvas/motion-canvas](https://github.com/motion-canvas/motion-canvas) | clone `7b91435` (`7b91435c301d530351dcf5ebb91dd139c002e405`), read only; npm `@motion-canvas/core`, `2d`, `vite-plugin`, `ffmpeg`, `ui` **3.17.2** | MIT on each installed npm `package.json` and `LICENSE` | `engines/motion-canvas/` (own `package.json` and `node_modules`, git-ignored, not imported by the studio) | Editor render only. `config.engine` prints the steps and exits 2. | Keep this exact pin. Before any upgrade, read each package's licence. Upstream `packages/ffmpeg/package.json` at 7b91435 says GPLv3 (its version string is also 3.17.2). GPLv3 would make the encoder unusable for client work without review. No `bin`, so no headless CLI. Plugins are CommonJS: unwrap `.default` or Vite says `motionCanvas is not a function`. |
| Local Whisper backends | not vendored | whisper.cpp MIT; faster-whisper MIT; sherpa-onnx Apache-2.0; OpenAI Whisper weights MIT | `lib/whisper.mjs`. `setup whisper` prints commands and does not download. | `node studio.mjs captions <file>` tries whisper.cpp, then faster-whisper, then `tools/live.py` (sherpa-onnx). | whisper.cpp and sherpa-onnx were not run here. faster-whisper 1.2.1 (a local venv, not a studio pin) was. sherpa-onnx is unpinned in `tools/requirements-live.txt`. |
| Motion lab | no third-party repo | original work | `web/lab/` | `node studio.mjs lab` | No third-party code, font, or asset. |

## Documentation duty
Closing a scope means updating, in the same commit: `../STATUS.md` (scope, evidence, unverified), `CHANGELOG.md` (entry + skill changes),
`CRAFT.md` (0–3 new lessons), `TECHNIQUES.md` (new recipes), `GEN2.md`/`README.md` (new modules/commands), `ASSETS.md` (every new outside file),
the film's `LEDGER.md`, and any skill whose advice changed. `npm test` runs `test/docs.test.mjs`, which fails when a skill, a lib module
or a film ledger is undocumented or when STATUS.md is older than the newest changelog entry.

Artistic reference analysis: `ARTISTIC_FORENSICS.md` documents the five-layer review, 20-part ARTISTIC DNA, attention/pacing curves and `reference.mjs direct` for an original new-subject direction. Technical machine evidence and artistic reviewer judgment remain separate.

Owner-facing workflow: AUTONOMOUS_FILM.md — one natural-language request, agent completes every internal step, one finished video. lib/build-options.mjs ownerRequest enforces exact single-delivery width/height/duration/fps.

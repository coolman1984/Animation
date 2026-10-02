# Studio — code-driven video, animation & editing

Start with the [current status](../STATUS.md), [WORKFLOW.md](WORKFLOW.md) and the [department index](SKILLS.md).
[CRAFT_GUIDE.md](CRAFT_GUIDE.md) covers directing, natural Egyptian copy, source truth, layered staging and music audition.

```bash
cd studio
node lib/doctor.mjs                         # check Chromium, ffmpeg, fonts
node film2/plates.mjs                       # prepare owner-supplied photos once
node make.mjs film2                         # quick 12-second silent draft, one version
node make.mjs film2 --range=24:36            # export a changed interval
node make.mjs film2 --profile=review         # one full version with sound + technical checks
node make.mjs film2 --profile=final          # all final versions, extras + full technical QA
npm test                                   # cache/options/gate regression tests
npm run test:render                         # real Chromium/ffmpeg integration tests
```

Every run writes a new `out/<film>/takeNN/` with `measure.json`. Inspect the actual film before calling it ready.
Final success means technical gates passed; artistic acceptance is a separate pass in `<film>/LEDGER.md`.
A film is `<film>/film.js` (pure time-based render), `score.mjs` and `config.mjs`.
Inputs/results are cached independently by content; declare additional dependencies in config.cacheInputs.
Client source photos/derived plates are intentionally excluded from git: restore them locally before rendering film2.
Instructions: `../.claude/skills/*/SKILL.md`; original prompt: `PROMPT_STUDIO.md`; lessons: `CRAFT.md`; rights: `ASSETS.md`.
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

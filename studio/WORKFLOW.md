# Fast production, deliberate art direction

Owner-authorized pipeline update (2026-10-01). This supplements the saved original prompt and
supersedes its blanket full-build/repeated-preview instructions during iteration. Final gates stay mandatory.
Read this file plus the current film brief first; load only the skills needed for the current stage.
Read `../STATUS.md` for the current handoff and finite completion contract. Historical prompts/plans
do not reopen completed work. The two-correction-round budget is a total per requested scope,
not a fresh allowance for every defect. If a blocker remains after that budget, record BLOCKED
with evidence and a concrete next action; stop without delivering an unverified final.

## Autonomous delivery (owner instruction, takes precedence)
Read AUTONOMOUS_FILM.md. The owner asks for a video and placement; the agent chooses, analyses, authors all internal files, reviews and renders autonomously. Any “approved direction” below means agent acceptance, not a pause for the owner. New configs declare ownerRequest; final exports only that delivery. Return one finished video link.

## Engines and tools
Start films with `node studio.mjs new`; choose engines per layer with `node studio.mjs route <film>`. Install tool packs only when a film needs them
(`node studio.mjs setup <profile>`). Architecture and maturity rules: PLATFORM.md.

## Testing policy (owner order, 2026-10-03)
Never run the slow suites (`npm run test:render`, `npm run test:all`) or extra builds to confirm a code change. Verify it with
the one relevant test file or one direct command; `npm test` is the quick suite. Slow checks belong only to producing a real
video the owner asked for, once, before delivery. The film's own draft/review/final builds below are production, not testing.

## Model effort and context budget
- Start routine implementation, variations and local fixes at **medium** effort.
- Use **high** for the initial art direction, difficult composition decisions and the final visual critique.
- Escalate a specific unresolved problem to **xhigh**; use **max** only when justified by that problem.
- These are operator settings in the host application. Repo code cannot set Claude's effort or guarantee token savings.
- Keep one concise brief and a decision ledger. Don't repeatedly reread the full repo/research or regenerate an approved concept.
- Use one builder by default. One separate final judging pass; specialist delegation only for a concrete unresolved task.
- After at most two correction rounds, close as DONE if accepted or BLOCKED with the cause and next action.
  Further work requires a new owner-authorized scope. Blocking defects still prevent delivery.

## Design before expensive motion
1. Define the audience, message, real product evidence and one CTA. Use up to three relevant references;
   extract specific lessons about composition, light, type and rhythm. Record sources/rights in the brief/assets list.
2. Choose ONE visual direction: palette, two font roles, light, framing, transition language and sound character.
3. Compose three hero frames: hook, proof/product and payoff. Check phone-size readability and full-resolution crops.
   Reject a generic sequence of centred headlines, the same photo crop in every shot, covered logos and decorative effects without purpose.
4. Build a **8–12 s proof segment** with a real transition and sound before expanding the film.
   Establish visual hierarchy and coherent camera movement here. Intentional quiet holds are allowed when logged.
5. Expand the approved direction; every shot must add information or emotion. Alternate wide/close/detail shots when the assets support them.
   Flat input photos limit lighting/camera realism: choose a suitable truthful graphic treatment with available assets; never invent product evidence.
6. Before full expansion, fill each shot's `craft` block in production.json (scale, camera, focal, transition, depth layers, primary motions, audio cue). Preflight now warns on accidental repetition, low craft coverage and >2 competing primary motions. These warnings trigger inspection, not an automatic aesthetic verdict.
7. For cinematic motion, prefer `lib/cinema.js` + `lib/depth.js`: one shared camera, motivated rack focus, bounded micro-drift only when appropriate, and a settled hold for product/copy. Use `lib/rhythm.mjs` to see beat/phrase timing without forcing edits onto every beat.

Taste guard (owner-approved, 2026-10-02): at most two type families per film (one display, one text/UI; an Arabic + Latin pair of the same role counts as one) unless the brief names more.
No default decorations: frame borders, corner labels, generic confetti/particle bursts, glow on chrome or a fade-in for everything need a stated reason in the shot's craft block.

## Commands (from studio/)
```bash
node make.mjs film2                               # draft: first 12 s, one delivery, silent
node make.mjs film2 --range=24:36                  # changed portion, delivery seconds
node make.mjs film2 --profile=review --range=0:12   # authored resolution/fps + mastered sound + layout checks
node make.mjs film2 --profile=review --only=reels15 # full selected delivery, no share copies/extras
node make.mjs film2 --profile=final                # all deliveries + full technical gates + extras
node make.mjs film2 --profile=final --only=hero60   # final quality for one delivery
node make.mjs film2 --range=0:3 --workers=2         # compare 1/2/4 workers on the same short range
```

| Profile | Capture | Output fps | Encoder | Work performed |
|---|---|---|---|---|
| draft | half scale, JPEG 85 | 15 | CRF 26 ultrafast | one short silent preview, size/fps/duration check |
| review | authored size, JPEG 95 | config fps | CRF 20 veryfast | one delivery/range, sound, text, technical checks |
| final | authored size, PNG | config fps | CRF 14 slow | selected/all deliveries, share copies and delivery assets |

Half-scale capture retains the original authored coordinate system and aspect-ratio layout.
Odd capture dimensions receive at most one edge pixel of padding for H.264. Review/final do not reduce design resolution.
Preview clips use **delivery time**, after cut-down segments; frame-dependent motion uses the authored fps.
A preview's passing checks do not certify a finished film. Every build creates a new numbered take and records the profile in measure.json.
Draft is silent by design; use review to judge music/edit synchronization.

## Reuse and verification
Cache manifests hash content, render settings, Chromium version and artifact outputs. Picture dependencies include the film folder,
shared lib and assets; score changes alone don't invalidate silent video. Declare external imports/assets in config.cacheInputs.
Score, silent video, text timelines and audio masters are cached separately. Missing/changed/corrupt outputs rebuild.
Changing a shared film module conservatively invalidates the whole selected video: **there is no automatic per-scene reuse**.
Use --range to export only the portion you changed. All final deliveries still get measured and gated.

For a local fix: inspect the changed interval plus its entry/exit transition; don't rebuild every format.
After shared layout/asset changes: check affected aspect ratios. Before final delivery: inspect at least 20 timestamps across the entire film,
including shot boundaries; these are samples, not 20 revision rounds. Review the actual exported film and share copy.
Run one independent final critique on extracted frames and motion playback. Record only actionable defects with timecodes, severity and acceptance criteria.

## Artistic acceptance (manual; technical gates cannot judge taste)
| Dimension | Acceptance evidence |
|---|---|
| Hook/message | first 2–3 s creates interest; sound-off viewing communicates the main promise |
| Composition | clear focal point, product/brand unobstructed, controlled spacing and negative space |
| Light/material | believable image treatment; no muddy edges, fake reflections or inconsistent cut-outs |
| Typography | readable on phone; Arabic shaping correct; hierarchy consistent; time to read |
| Motion/edit | motivated transitions, no doubled products, intentional pace, camera settles for reading |
| Creative variety | shot scale/camera/transition changes are motivated; no accidental template repetition or effect monoculture |
| Cinematic depth | layers share believable parallax/focus/shadow; movement never exposes seams or invents a new viewpoint |
| Sound | useful accents, balanced mix, cuts/music in sync; listen to the exported file |
| Finish | inspect at 100% and in the share copy for blur, banding, halos and cropping |

Use LEDGER.md: time → issue → severity → fix → result. No unresolved blocker or major defect at delivery.
If assets or actual playback are unavailable, explicitly say what remains unverified; never call it premium based only on passing metrics.

## Reusable craft system
QUALITY_PLAYBOOK.md is the distilled method (hero object, measured references, stills → strips → critique, finish checks). Use SKILLS.md to load one department; CRAFT_GUIDE.md explains source truth, Egyptian copy, layered staging and music audition.
New films add config.production and production.json using templates/production.json. make validates it BEFORE doctor/render,
checks local assets/timeline/evidence, reports copy warnings and saves review-plan.json in source-film seconds. Legacy films
remain compatible but show “content preflight unavailable”; migrate when revising them, never silently certify them.
Production assets automatically enter the relevant audio/picture dependency hashes. Add other external imports to cacheInputs.
lib/depth.js supplies deterministic shared cameras, parallax, per-layer focus, cover clamping and contact shadows.
lib/music.mjs prepares recordings at exact length; score.mjs still owns music/SFX mixing. Missing rights records block final plans.
make records total/delivery seconds and score/text/audio/picture reuse. These measure runtime, not model-token savings.
At most two music candidates, one creative direction and one independent final critique; stop optional polish after acceptance.

## Reference-matched reel (added 2026-10-02)
When the owner supplies a video to match: analyse → visual review → bar/beat table → one grid for picture and sound → short draft →
review build → matched boards → one independent critique → at most one more correction round → DONE/BLOCKED. Gates stay mandatory;
intentional dark openings are declared with `darkSpans`, intentional stillness with `holds`. See `TECHNIQUES.md`, `REFERENCE_LAB.md`.

## Documentation is part of done (mandatory)
A scope closes only after `../STATUS.md`, `CHANGELOG.md`, `CRAFT.md`, `TECHNIQUES.md`, `ASSETS.md`, the film's `LEDGER.md` and any changed skill are updated.
`npm test` includes `test/docs.test.mjs` for the checkable parts. Record unverified items honestly (audio not heard, no real-speed viewing, etc.).

For supplied references, ARTISTIC_FORENSICS.md adds contextual artistic DNA and whole-film attention/pacing interpretation before original subject direction. reference.mjs direct converts director-authored principle transformations into a reviewable brief; temporal/audio judgments require inspected playback/listening. Ordinary no-reference films do not load this workflow.

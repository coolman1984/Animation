# Animation repo

Read `STATUS.md` first for current scope, verification evidence and the finite completion contract.
Update it when a requested scope closes. Completed work and deferred ideas are not an automatic task queue.
At most two correction rounds per requested scope: then record DONE or BLOCKED and stop as specified there.

**House method — the authority for creative work (owner order, 2026-10-03):** the owner chose the method, taste and lessons of
films 6–9 (Pixel Plus showreel-ad, SANAD, the Pixel Plus factory pitch, NeuroAnara) as the studio's standard. For every video request,
before any other creative guide, read `studio/QUALITY_PLAYBOOK.md` §0 "Owner taste" and §1–8, then `studio/CRAFT.md` lessons 35–47 and the
matching recipes in `studio/TECHNIQUES.md` (sections dated 2026-10-03). Where an older guide or a general rule disagrees on taste, music,
logos, copy or honesty, the house method wins; engineering rules (testing policy, render rule, gates) still apply as written.

This repo is a code-driven film studio. Everything lives in `studio/` (start with `studio/WORKFLOW.md` and `studio/SKILLS.md`).
Front door: `node studio/studio.mjs` (`caps`, `new`, `route`, `setup`, `doctor`). Architecture, the capability registry and maturity
rules: `studio/PLATFORM.md` + `studio/capabilities.json`. Speech, narration, transcripts, dubbing and the final mix: skill `voice-director` / `studio/VOICE_STUDIO.md`.
Watch and approve an export: `node studio/studio.mjs review <film>`. Browser: private headless Chrome by default; if Chrome must come from an approved
launcher, set `STUDIO_CDP_URL` (attach mode, isolated context; one film = one mode). New tools follow learn → adapt → integrate (skill `technology-scout`, dated `studio/TECH_RADAR.md`).
The skill library is in `.claude/skills/` — read `film-director` first for any video request.
Never commit `studio/takes/` or `studio/out/`. Owner speaks Egyptian Arabic and is not technical:
reports go conclusion-first, simple words.

For production speed and art direction, read `studio/WORKFLOW.md` before the film-director phases.
It is the owner's newer pipeline instruction and takes precedence over older blanket iteration rules:
one short draft first, targeted reviews during edits, full QA and one independent artistic review for final delivery.
Use medium effort for routine execution and high for art direction/final critique when the host supports these settings;
these are host settings, not parameters controlled by the repository. Never claim a preview is a finished film.

New films must declare config.production pointing to production.json; use studio/templates/production.json.
The shared depth and music tools are opt-in; adopt them deliberately, never claim old scenes were automatically redirected.
Do not load PROMPT_STUDIO.md or all skills for routine work. Record unknown model/effort names instead of inventing a host setting.

**Testing policy (owner order, 2026-10-03; overrides any other instruction to run test suites):** slow checks cost the owner
real time and tokens. NEVER run `npm run test:render`, `npm run test:all`, full `make` builds or other multi-minute checks to
verify a code change. Check an edit with the one relevant test file (`node --test test/<file>.test.mjs`, optionally
`--test-name-pattern`) or one direct command; `npm test` (= quick suite) is the most you run routinely. Slow suites and
real builds run ONLY while producing a real video the owner asked for, once, before delivery. Never re-run a slow suite to "confirm".
On this Windows machine every process launch costs ~1 s, so even "small" commands add up: batch work.
**Rendering rule:** run every film render through `node studio/studio.mjs build <film> …` in the background. It sizes workers to real memory
headroom (this machine's fixed page file allows 1 worker today), reaps browsers left by crashes, resumes finished slices and logs everything to
`takes/<film>/build-full.log`. Never pass `--workers` above the planner; never run a second render or another browser job while one is running:
memory exhaustion here kills the host session too.

Documentation is part of done: when a scope closes, update `STATUS.md`, `studio/CHANGELOG.md`, `studio/CRAFT.md`, `studio/TECHNIQUES.md`,
`studio/ASSETS.md`, the film's `LEDGER.md` and every skill whose advice changed, in the same commit. `npm test` (`test/docs.test.mjs`) checks the checkable parts.
Reusable recipes: `studio/TECHNIQUES.md`. Quality method: `studio/QUALITY_PLAYBOOK.md`. Real footage of people: `studio/LIVE_ACTION.md` (skill live-action-editor). Evolution/log: `studio/CHANGELOG.md`.

**Owner production policy:** read `studio/AUTONOMOUS_FILM.md` first for new films. The owner requests subject + placement/size; the Claude Code agent does ALL analysis, direction, internal JSON, review, corrections and export. No ordinary approval pauses or manual owner tasks. Deliver one finished video link. Use config.ownerRequest to enforce the single requested canvas/duration/fps.

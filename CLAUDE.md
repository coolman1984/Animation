# Animation repo

Read `STATUS.md` first for current scope, verification evidence and the finite completion contract.
Update it when a requested scope closes. Completed work and deferred ideas are not an automatic task queue.
At most two correction rounds per requested scope: then record DONE or BLOCKED and stop as specified there.

This repo is a code-driven film studio. Everything lives in `studio/` (start with `studio/WORKFLOW.md` and `studio/SKILLS.md`).
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

Documentation is part of done: when a scope closes, update `STATUS.md`, `studio/CHANGELOG.md`, `studio/CRAFT.md`, `studio/TECHNIQUES.md`,
`studio/ASSETS.md`, the film's `LEDGER.md` and every skill whose advice changed, in the same commit. `npm test` (`test/docs.test.mjs`) checks the checkable parts.
Reusable recipes: `studio/TECHNIQUES.md`. Evolution/log: `studio/CHANGELOG.md`.

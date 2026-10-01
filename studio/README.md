# Studio — code-driven video, animation & editing

Start with [WORKFLOW.md](WORKFLOW.md): art direction, effort settings, short previews and final review.

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

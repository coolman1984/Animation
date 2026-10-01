# Studio — code-driven video, animation & editing

```bash
cd studio
node lib/doctor.mjs                     # 1. check the machine (Chromium, ffmpeg, fonts)
node film2/plates.mjs                   # 2. cut-outs / clean plates from the owner's photos (once)
node lib/render.mjs stills film2/film.js --times=0,5,10 --out=takes/film2/p   # 3. preview frames + sheet.png
node make.mjs film2                     # 4. ONE command: score → render all versions → master → measure → gates
open out/film2/takeNN/                  # 5. master, share copy, cut-downs, captions, thumbs, measure.json
```

- A film = `<film>/film.js` (pure `render(t)` on `lib/composer.html`) + `<film>/score.mjs` + `<film>/config.mjs`.
- How to drive each part professionally: `../.claude/skills/*/SKILL.md` (start with `film-director`).
- Standing order: `PROMPT_STUDIO.md` · lessons: `CRAFT.md` · licences: `ASSETS.md`.
- `takes/` and `out/` are not in git (big). Everything else is.

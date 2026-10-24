---
name: any-model-director
description: Make a house-standard film with ANY model through the Studio Engine — director's plan, house critic and text "eyes" (scene graph + character map) — and compare models on the fixed bench. Use when a non-Claude model makes a film, when a film must be made from one spec, or when judging another model's film.
---
# any-model-director
Read `studio/ANY_MODEL.md` (the ladder and the loop). Owner taste: `studio/QUALITY_PLAYBOOK.md` §0.

0. **Pick a house style:** `node studio/studio.mjs styles` → read one card (`styles <slug>`, MCP `style_list`/`style_read`); pass `--style=<slug>` to the plan. The card's source film is a benchmark, never a template. For a look the house cards lack, 59 film-style cards from Lemo-Opuscar: `styles --library=lemo`, `styles lemo/<slug>` (MCP `style_list {library:"lemo"}`) — adapt their grammar with our palette, fonts and Arabic.
1. **Plan, don't invent structure:** `node studio/studio.mjs director plan <film> --placement=reels|youtube --duration=N --brand=… --cta=… --problem=…`
   (MCP `film_plan`). The skeleton already has the hook in 2 s, one hero carried by `morphTo`, proof chapters on whole bars, the payoff with
   the brand whole and one action, a music hook and drops. Write every ‹…› line in natural Egyptian Arabic (Arabic and Latin never in one line), including the treatment: three structures + the choice, and a benchmark (learn / avoid).
1b. **Storyboard before code:** `node studio/studio.mjs storyboard <film>` (MCP `film_storyboard`): every scene names a concrete thing and what it does (scene `purpose`), ≤ 8 words, no text-card opening or ending. Red blocks.
2. **Critic before pixels:** `node studio/studio.mjs director review <film>` (MCP `film_review`). Fix every FAIL; read every WARN. Each rule names
   its source in the playbook and the next edit. Six Disney principles are scored (`principle-*`); the review also prints a manual checklist for the six a spec cannot show (skill `animation-principles`, MCP `principle_read`) — those are not in the score.
3. **Eyes:** `node studio/studio-engine/run.mjs <film> --stage=stills` (contact sheet + text gates), then
   `node studio/studio.mjs director review <film> --frames` or `director inspect <film> --times=…` (MCP `film_inspect`): every box with colour,
   size and contrast, the focal point, and a character map — usable without vision. Vision models also look at the sheet.
4. **Render once, then the taste gate:** the engine runs `lib/tastegate.mjs` on the delivery (empty mid-film frames reject it; motion thresholds come from the owner's verdicts once `node studio/studio.mjs taste calibrate` has fitted them). Any MP4: `node studio/studio.mjs taste <file>` (MCP `film_taste`).
   Render: `node studio/studio-engine/run.mjs <film>` (MCP `film_render` stage final, then `film_job`). Delivery is refused unless gates pass.
5. **Compare models:** `studio/bench/README.md` — same briefs, same scores, plus watching. Record unverified items honestly.

Scores measure structure and finish, not taste. Never call a film "as good as" another model's without watching both.

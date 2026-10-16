---
name: any-model-director
description: Make a house-standard film with ANY model through the Studio Engine — director's plan, house critic and text "eyes" (scene graph + character map) — and compare models on the fixed bench. Use when a non-Claude model makes a film, when a film must be made from one spec, or when judging another model's film.
---
# any-model-director
Read `studio/ANY_MODEL.md` (the ladder and the loop). Owner taste: `studio/QUALITY_PLAYBOOK.md` §0.

1. **Plan, don't invent structure:** `node studio/studio.mjs director plan <film> --placement=reels|youtube --duration=N --brand=… --cta=… --problem=…`
   (MCP `film_plan`). The skeleton already has the hook in 2 s, one hero carried by `morphTo`, proof chapters on whole bars, the payoff with
   the brand whole and one action, a music hook and drops. Write every ‹…› line in natural Egyptian Arabic (Arabic and Latin never in one line).
2. **Critic before pixels:** `node studio/studio.mjs director review <film>` (MCP `film_review`). Fix every FAIL; read every WARN. Each rule names
   its source in the playbook and the next edit.
3. **Eyes:** `node studio/studio-engine/run.mjs <film> --stage=stills` (contact sheet + text gates), then
   `node studio/studio.mjs director review <film> --frames` or `director inspect <film> --times=…` (MCP `film_inspect`): every box with colour,
   size and contrast, the focal point, and a character map — usable without vision. Vision models also look at the sheet.
4. **Render once:** `node studio/studio-engine/run.mjs <film>` (MCP `film_render` stage final, then `film_job`). Delivery is refused unless gates pass.
5. **Compare models:** `studio/bench/README.md` — same briefs, same scores, plus watching. Record unverified items honestly.

Scores measure structure and finish, not taste. Never call a film "as good as" another model's without watching both.

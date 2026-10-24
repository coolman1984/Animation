---
name: video-shotcraft
description: Product-promo shot craft (video-shotcraft by Vincentwei1021, Apache-2.0, vendored text) — 124 tuned shot recipe cards (camera, data, effects, interaction, opening, outro, rhythm, transition, typography, UI entrance) with parameter tables and known pitfalls, plus its six-stage pipeline from real page captures, aesthetic rules, beat sync, sound design and final review. Use when turning a product, app or website into a promo film, or when a shot needs a proven recipe with exact numbers.
---
# video-shotcraft (vendored)
Upstream text lives in `studio/toolkit/video-shotcraft/` (licence and pinned commit: `studio/toolkit/toolkit.json`): `SKILL.md`, `references/pipeline.md`,
`aesthetic-rules.md`, `music-beat-sync.md`, `sound-design.md`, `final-review.md`, `sequences/promo-energy-arc.md`, and the cards in
`references/shots/<category>/<name>.md` (Chinese; our English one-liners: `studio/library/shotcraft-en.json`).

**Find a shot:** `node studio/studio.mjs moves search <words> --library=shotcraft` · `moves list --library=shotcraft [--category=outro]` ·
`moves show <card-name>` (MCP `moves_search` / `moves_show`). Each card: intent, variants, parameter table (frames at 30 fps), pitfalls, and the
upstream demo source (Remotion TSX, linked, not vendored).

Studio adaptations:
- **Our engine, their numbers:** build the shot in the studio engine / composer (`studio/studio-engine/STUDIO.md`), keeping the card's timings,
  easing and limits; Remotion is not our route (company licence above 3 people). Their template ("Ink Press") is a reference, never our film.
- **Their pipeline maps to ours:** product check → `director plan`; real page capture → skill `screen-actor` / `cdp-capture` (Playwright, DPR 2);
  storyboard → `storyboard`; beat sync → skill `edit-rhythm`; sound → Openverse first (AGENTS.md); final review → skill `qa-judge`.
- **Honesty:** only the client's real screens and words; fictional data labelled (skill `data-honesty`). House method wins on taste.
- Write the cards you used in the film's LEDGER (with the card name), as with `moves draw`.

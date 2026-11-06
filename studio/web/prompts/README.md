# Prompt library — one brief per business type (2026-11-06)

Added after studying the Skill Leap AI video "You won't believe the websites Claude can build now" (YouTube 6m9Wihe9sJ8, ≈ 14:30;
transcript and description only). Its method: a library of ready, detailed prompts grouped by business type, each tied to a live
example you can scroll on desktop, tablet and phone; a form fills the business details; follow-up prompts fix what the first build missed.
We did **not** open or test that library's prompts (they sit behind a sponsor form), and the video never explains its "six steps", so none
of its wording or steps are copied here. What we took is the method, rebuilt on this studio's own stages A–D (`../WEB.md`).

## What is here
- `index.json` — 7 groups (local services, restaurants/cafés, SaaS, courses, video production, seasonal offers and shops, factories) and
  12 prompts; each names its example in `../gallery/specimens/`, its hero motion and, where the site engine can build it, its `storyShape`.
- `PROMPT_TEMPLATE.md` — Arabic and English: business → design → photo conditions → steps → check on three sizes. The business slots
  are `site.json` paths (`{{hero.title}}`), so any model can fill it, by hand or with `web prompt <id> --site=<site>`.
- `<group>/<id>.md` — the design brief for that example: layout, type, colours, the hero motion and its still state, the one interaction,
  what changes on a phone, the honesty rules for that business.
- `FOLLOW_UPS.md` — twelve ready follow-ups (brand colours, font, fix the phone, calm the motion, swap photos, real contacts, one section…).

## Use
```
node studio/studio.mjs web prompts                  # groups and prompts
node studio/studio.mjs web prompt plumbing          # the brief with ‹slots› to fill
node studio/studio.mjs web prompt plumbing --site=<site> --lang=en   # filled from web/sites/<site>/site.json
node studio/studio.mjs gallery                      # the examples; gallery/devices.html shows one at phone, tablet and desktop side by side
```
Then the normal loop: `web plan` → write → `web build` → `web check` → owner review from the phone (`takes/web/<site>/REVIEW.md`) → follow-ups.

## Rules
- A prompt is a starting brief, not a licence to invent: only the client's words, numbers, photos and contacts (skill `data-honesty`).
- One hero motion per site, with its reason (WEB.md "Hero motion"). Quiet prompts (clinic, SaaS dashboard, shop) are quiet on purpose.
- Thinking effort: a whole site at the host's highest setting; a follow-up or one-section edit at medium (`../../ANY_MODEL.md`).
- Nothing is published from a prompt; publishing waits for the owner's «انشر» (`../PUBLISH.md`).
- Adding a prompt: add the example first (gallery README), then the brief and one `index.json` row; `test/web-prompts.test.mjs` checks the links.

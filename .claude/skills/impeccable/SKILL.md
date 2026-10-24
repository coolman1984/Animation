---
name: impeccable
description: Design director for any interface (Impeccable 4.7.1 by Paul Bakaus, Apache-2.0, vendored) — shape, critique, audit, polish, typeset, colorize, layout, animate, bolder, quieter, distill, harden, adapt, onboard, document. Use for web stage D (independent critique and polish of a site or web animation), when a page looks generic or AI-made, or to write a site's DESIGN.md from existing code.
---
# impeccable (vendored)
The full upstream skill lives in `studio/toolkit/impeccable/` (pinned commit and licence: `studio/toolkit/toolkit.json`, `LICENSE`, `NOTICE.md`).
Read `studio/toolkit/impeccable/SKILL.md` and follow it, with these studio adaptations:

1. **Skill directory** = `studio/toolkit/impeccable`: every `reference/…`, `agents/…`, `scripts/…` path in it is relative to that folder.
2. **No launcher here.** The engine binary launcher was removed (it downloads a binary). Take the skill's own "Launcher unavailable"
   path every time: say "Context loading did not run; I'll read the existing project context directly", then read the site's
   `DESIGN.md` (and PRODUCT.md if it exists), the command's `reference/<command>.md`, and `reference/craft-floor.md` before any edit.
   If the owner installed the plugin on his own PC (`/plugin marketplace add pbakaus/impeccable`, with `DO_NOT_TRACK=1`), that copy may run the engine.
3. **Where it sits:** web workflow stage D (`studio/web/WEB.md` "One workflow"): critique during and after the build, then polish and
   remove what is unnecessary; log the findings in `web/sites/<site>/DESIGN.md` §D. Measurable rules are also in
   `node studio/studio.mjs web check <site>` / `web audit` (taste lights): run them, LOOK at the strips, then critique.
4. **Authority:** the client's brief and brand → DESIGN.md → the owner's taste (`studio/QUALITY_PLAYBOOK.md` §0) → Impeccable's suggestions.
   Arabic sites keep `dir="rtl"`, Arabic-capable fonts and joined letters (never split Arabic per letter). Honesty: skill `data-honesty`.
5. Never send private client content to an online service; no paid API without the owner's approval. Two correction rounds per scope (AGENTS.md).

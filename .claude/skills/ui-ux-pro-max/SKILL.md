---
name: ui-ux-pro-max
description: UI/UX design intelligence (UI UX Pro Max 2.15 by NextLevelBuilder, MIT, vendored, offline Python) — generates a full design system (pattern, style, colour tokens, type pair, effects, anti-patterns, checklist) from a product brief and searches 79 styles, 192 product palettes, 74 font pairings, 119 UX rules, GSAP presets, charts and 22 stacks. Use for web stage B (design architecture) of any site or app, or to check UX rules for an interface.
---
# ui-ux-pro-max (vendored)
The full upstream skill lives in `studio/toolkit/ui-ux-pro-max/` (licence and pinned commit: `studio/toolkit/toolkit.json`). Read
`studio/toolkit/ui-ux-pro-max/SKILL.md`; its scripts are at `studio/toolkit/ui-ux-pro-max/scripts/` (Python 3 standard library, no network).

**Fast path (web stage B, `studio/web/WEB.md`):**
`node studio/studio.mjs web system "<product, industry, audience, mood>" --site=<site> [--stack=html-tailwind]` → saves
`web/sites/<site>/design-system.md`. Then write DESIGN.md §B yourself from it: name the industry rule followed, ≤ 6 colour tokens
(tinted neutrals, text ≥ 4.5:1), dark mode only if it fits, 2 Arabic-capable families (its font pairings are Latin: swap for the studio's
vendored Arabic faces — Readex Pro, Alexandria, IBM Plex Sans Arabic — or another OFL Arabic family; `studio/ASSETS.md`), ≤ 5 sizes, spacing,
components and states, phone/tablet/desktop rules. Domain searches: `python studio/toolkit/ui-ux-pro-max/scripts/search.py "<words>" --domain ux|color|typography|landing|product|gsap|chart`.

**Authority:** the brief and brand → DESIGN.md → the owner's taste (`studio/QUALITY_PLAYBOOK.md` §0) → this tool's suggestion. Ignore its
Google-Fonts CDN imports for delivery (fonts are vendored in the site); never use its emoji-as-icon or purple-gradient defaults the
house bans. Never send client content online (the tool is offline anyway).

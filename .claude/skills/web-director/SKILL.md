---
name: web-director
description: Build a complete, beautiful, animated static website (landing pages, company, café, product, portfolio sites) from one site.json with any model — ambition questions, house structure, motion library (scroll reveals, sticky steps, 3D card ring), and a real-browser quality check at phone, tablet and desktop. Use for any website request.
---
# web-director
Read `studio/web/WEB.md`. **Owner orders (2026-10-19): every site or web animation runs WEB.md "One workflow" — A creative direction (taste-skill: three real directions, pick one) → B design system (UI UX Pro Max) → C build + animate from the motion storyboard with the minimum tech → D critique and polish (Impeccable) — recorded in `web/sites/<site>/DESIGN.md`; WEB.md says how each runs, installed or not. Done = the visual quality loop passed, never "it compiled".** Honesty rules: skill `data-honesty` (client's words and real numbers only; sources for stats and quotes).

1. Answer the ambition questions first (best studio in the field · rawest real material · methods and tools), then pick a style: `node studio/studio.mjs web styles`.
2. Stage B with the real tool (vendored): `node studio/studio.mjs web system "<product, industry, audience, mood>" --site=<site>` (skill `ui-ux-pro-max`), then write DESIGN.md §B with Arabic-capable fonts.
   `node studio/studio.mjs web plan <site> --brand=… --style=… --lang=ar|en --cta=… --problem=… --promise=…` (MCP `web_plan`); shape the sections to the client.
3. Write every ‹…›; `web build <site>` refuses placeholders, unsourced numbers/quotes and missing alt text (MCP `web_save` validates first).
   Taste pass (WEB.md): write the idea sentence and pass the competitor test; one claim per section; no eyebrows, pill badges, icon-card rows, gradients, glows or glass by default.
   Named web effects and UI parts (Motion Prompt #049–#096) with exact timings: `node studio/studio.mjs moves search <words> --library=motion-prompt`; many already exist as data attributes (studio/library/README.md).
4. `node studio/studio.mjs web check <site>` (MCP `web_check`): fix every red light, read the yellow ones, LOOK at the phone/tablet/desktop strips. Taste lights are yellow: fix each or defend it in one sentence; then run stage D with skill `impeccable` (critique → polish, its craft floor) and fix the top three problems you see on the strips (two rounds at most).
   Diagrams: skill `diagram-design`; a real product in live 3D: skill `img2threejs`; the client's Penpot file: skill `penpot-mcp`.
5. Preview `web serve <site>`; publishing needs the owner's hosting account — never claim a site is live without its URL.
**Improving an existing site:** `web audit <site>-before --dir=<folder>` first (keep the original, list what must survive) → stages A → B → C (keep content and function) → D → `web audit <site>-after --dir=<new> --before=<site>-before` (nothing may get worse).
Deliver: working site, tested animations, DESIGN.md, before/after strips for a redesign. Report in Egyptian Arabic, say which way each stage ran, conclusion first; say what was not checked (real devices, real content, live hosting).

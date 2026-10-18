---
name: web-director
description: Build a complete, beautiful, animated static website (landing pages, company, café, product, portfolio sites) from one site.json with any model — ambition questions, house structure, motion library (scroll reveals, sticky steps, 3D card ring), and a real-browser quality check at phone, tablet and desktop. Use for any website request.
---
# web-director
Read `studio/web/WEB.md`. Honesty rules: skill `data-honesty` (client's words and real numbers only; sources for stats and quotes).

1. Answer the ambition questions first (best studio in the field · rawest real material · methods and tools), then pick a style: `node studio/studio.mjs web styles`.
2. `node studio/studio.mjs web plan <site> --brand=… --style=… --lang=ar|en --cta=… --problem=… --promise=…` (MCP `web_plan`); shape the sections to the client.
3. Write every ‹…›; `web build <site>` refuses placeholders, unsourced numbers/quotes and missing alt text (MCP `web_save` validates first).
   Named web effects and UI parts (Motion Prompt #049–#096) with exact timings: `node studio/studio.mjs moves search <words> --library=motion-prompt`; many already exist as data attributes (studio/library/README.md).
4. `node studio/studio.mjs web check <site>` (MCP `web_check`): fix every red light, read the yellow ones, LOOK at the phone/tablet/desktop strips.
5. Preview `web serve <site>`; publishing needs the owner's hosting account — never claim a site is live without its URL.
Report in Egyptian Arabic, conclusion first; say what was not checked (real devices, real content, live hosting).
